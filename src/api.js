const BASE = ((typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) || 'http://localhost:8080/api').replace(/\/$/, '')

// In-memory cache for GET requests, strictly partitioned by authenticated user identity
const cache = new Map()

// Session epoch & AbortController to cancel and discard in-flight requests on logout/login
let currentSessionEpoch = 0
let activeAbortController = new AbortController()

export function resetApiSession() {
    currentSessionEpoch++
    try {
        activeAbortController.abort()
    } catch {}
    activeAbortController = new AbortController()
    cache.clear()
}

export function clearApiCache(prefix = '') {
    if (!prefix) {
        cache.clear()
        return
    }
    for (const key of cache.keys()) {
        if (key.includes(prefix)) {
            cache.delete(key)
        }
    }
}

function getCacheKey(path, token) {
    if (!token) return `anon:${path}`
    const payload = parseJwt(token)
    const userScope = payload?.sub || payload?.email || payload?.userId || 'auth'
    return `${userScope}:${path}`
}

function invalidateForMutation(path) {
    if (path.includes('/student/profile')) {
        clearApiCache('/student/profile')
    } else if (path.includes('/teacher')) {
        clearApiCache('/teacher')
    } else if (path.includes('/classes')) {
        clearApiCache('/classes')
        clearApiCache('/payments')
    } else if (path.includes('/payments')) {
        clearApiCache('/payments')
        clearApiCache('/classes')
    } else if (path.includes('/help')) {
        clearApiCache('/help')
    } else if (path.includes('/reviews')) {
        clearApiCache('/reviews')
        clearApiCache('/teacher')
    } else if (path.includes('/notifications')) {
        clearApiCache('/notifications')
    } else if (path.includes('/admin')) {
        clearApiCache('/admin')
        clearApiCache('/teacher')
    }
}

export function parseJwt(token) {
    try {
        if (!token) return null
        const parts = token.split('.')
        if (parts.length < 2) return null
        const base64Url = parts[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        )
        return JSON.parse(jsonPayload)
    } catch {
        return null
    }
}

export const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes continuous inactivity
export const LAST_ACTIVITY_KEY = 'seutoppers_last_activity'

export function recordActivity() {
    try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    } catch {}
}

export function getLastActivity() {
    try {
        const val = localStorage.getItem(LAST_ACTIVITY_KEY)
        return val ? Number(val) : 0
    } catch {
        return 0
    }
}

export function isInactive() {
    const token = localStorage.getItem('seutoppers_token')
    if (!token) return false
    const last = getLastActivity()
    if (!last) return false
    return Date.now() - last >= INACTIVITY_TIMEOUT_MS
}

export function isTokenExpired(token) {
    if (!token) return true
    const payload = parseJwt(token)
    if (!payload || !payload.exp) return false
    return Date.now() >= payload.exp * 1000
}

async function request(path, options = {}) {
    const requestEpoch = currentSessionEpoch
    const method = (options.method || 'GET').toUpperCase()
    const isGet = method === 'GET'
    const token = localStorage.getItem('seutoppers_token')

    // User-scoped cache key prevents any data from User A being served to User B
    const cacheKey = getCacheKey(path, token)

    // Check cache for GET requests unless explicitly skipped
    if (isGet && !options.skipCache) {
        const cached = cache.get(cacheKey)
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data
        }
    }

    const headers = new Headers(options.headers || {})

    if (token) {
        if (isInactive()) {
            localStorage.removeItem('seutoppers_auth')
            localStorage.removeItem('seutoppers_token')
            localStorage.removeItem(LAST_ACTIVITY_KEY)
            resetApiSession()
            window.dispatchEvent(new CustomEvent('seutoppers-auth-expired', {
                detail: { message: 'You were logged out due to inactivity.' }
            }))
            throw new Error('You were logged out due to inactivity.')
        }

        if (isTokenExpired(token)) {
            localStorage.removeItem('seutoppers_auth')
            localStorage.removeItem('seutoppers_token')
            localStorage.removeItem(LAST_ACTIVITY_KEY)
            resetApiSession()
            window.dispatchEvent(new CustomEvent('seutoppers-auth-expired', {
                detail: { message: 'You were logged out.' }
            }))
            throw new Error('You were logged out.')
        }
        headers.set('Authorization', `Bearer ${token}`)
        recordActivity()
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json')
    }

    const signal = options.signal || activeAbortController.signal

    let response
    try {
        response = await fetch(`${BASE}${path}`, {
            ...options,
            headers,
            signal
        })
    } catch (err) {
        if (err.name === 'AbortError' || requestEpoch !== currentSessionEpoch) {
            const abortErr = new Error('Request aborted due to session change')
            abortErr.name = 'AbortError'
            throw abortErr
        }
        throw err
    }

    // Discard stale in-flight responses if session changed before response arrived
    if (requestEpoch !== currentSessionEpoch) {
        const staleErr = new Error('Request discarded: session changed')
        staleErr.name = 'AbortError'
        throw staleErr
    }

    const type = response.headers.get('content-type') || ''
    const data = type.includes('application/json')
        ? await response.json()
        : await response.text()

    // Second check after body parse in case session changed during transfer
    if (requestEpoch !== currentSessionEpoch) {
        const staleErr = new Error('Request discarded: session changed')
        staleErr.name = 'AbortError'
        throw staleErr
    }

    if (!response.ok) {
        if (response.status === 401 && !path.includes('/auth/login')) {
            localStorage.removeItem('seutoppers_auth')
            localStorage.removeItem('seutoppers_token')
            localStorage.removeItem(LAST_ACTIVITY_KEY)
            resetApiSession()
            window.dispatchEvent(new CustomEvent('seutoppers-auth-expired', {
                detail: { message: 'You were logged out.' }
            }))
        }
        const message =
            typeof data === 'object' && data
                ? data.message || data.error || `Request failed (${response.status})`
                : data || `Request failed (${response.status})`

        throw new Error(message)
    }

    if (data && typeof data === 'object' && (data.status >= 400 || data.error)) {
        throw new Error(data.message || data.error || 'Request failed')
    }

    // Cache GET response strictly under user-scoped cacheKey
    if (isGet && !options.skipCache) {
        cache.set(cacheKey, {
            data,
            expiresAt: Date.now() + (options.cacheTtl || 60000)
        })
    } else if (!isGet) {
        invalidateForMutation(path)
    }

    return data
}

const json = (method, path, body) =>
    request(path, {
        method,
        body: JSON.stringify(body)
    })

export const api = {
    clearCache: clearApiCache,
    resetSession: resetApiSession,

    health: () => request('/actuator/health'),

    login: body => json('POST', '/auth/login', body),

    googleLogin: credential =>
        json('POST', '/auth/google', { credential }),

    register: body =>
        json('POST', '/auth/register', body),

    verifyEmail: body =>
        json('POST', '/auth/verify-email', body),

    forgotPassword: body =>
        json('POST', '/auth/forgot-password', body),

    resetPassword: body =>
        json('POST', '/auth/reset-password', body),

    studentProfile: () =>
        request('/student/profile'),

    createStudentProfile: body =>
        json('POST', '/student/profile', body),

    updateStudentProfile: body =>
        json('PUT', '/student/profile', body),

    completion: () =>
        request('/student/profile/completion'),

    searchStudents: name =>
        request(`/student/profile/search?name=${encodeURIComponent(name)}`),

    teachers: () =>
        request('/teacher/profiles'),

    teacherSearch: subject =>
        request(`/teacher/profiles/search?subject=${encodeURIComponent(subject)}`),

    teacherProfile: () =>
        request('/teacher/profile'),

    updateTeacherProfile: body =>
        json('PUT', '/teacher/profile', body),

    myTeacherApplication: () =>
        request('/teacher/application'),

    applyTeacher: body =>
        json('POST', '/teacher/apply', body),

    cancelTeacherApplication: () =>
        json('POST', '/teacher/application/cancel', {}),

    uploadProfile: file => {
        const body = new FormData()
        body.append('file', file)

        return request('/files/profile', {
            method: 'POST',
            body
        })
    },

    uploadCv: file => {
        const body = new FormData()
        body.append('file', file)

        return request('/files/cv', {
            method: 'POST',
            body
        })
    },

    openRequests: () =>
        request('/help'),

    myRequests: () =>
        request('/help/mine'),

    createRequest: body =>
        json('POST', '/help', body),

    interests: id =>
        request(`/help/${id}/interests`),

    interest: (id, message) =>
        json('POST', `/help/${id}/interest`, { message }),

    // Remove the current teacher's interest from a request.
    // Backend must expose DELETE /help/{id}/interest for this to work.
    removeInterest: id =>
        request(`/help/${id}/interest`, {
            method: 'DELETE'
        }),

    selectTeacher: (id, teacherId) =>
        json('POST', `/help/${id}/select-teacher`, { teacherId }),

    // Notifications
    notifications: () =>
        request('/notifications'),

    markNotificationRead: id =>
        request(`/notifications/${id}/read`, {
            method: 'POST'
        }),

    markAllNotificationsRead: () =>
        request('/notifications/read-all', {
            method: 'POST'
        }),

    myClasses: () =>
        request('/classes/mine'),

    teacherClasses: () =>
        request('/classes/teacher'),

    createClass: body =>
        json('POST', '/classes', body),

    startClass: id =>
        request(`/classes/${id}/start`, {
            method: 'POST'
        }),

    completeClass: id =>
        request(`/classes/${id}/complete`, {
            method: 'POST'
        }),

    reviewClass: (id, body) =>
        json('POST', `/classes/${id}/review`, body),

    myReviews: () =>
        request('/reviews/mine'),

    myTeacherReviews: () =>
        request('/reviews/teacher'),

    teacherReviews: teacherId =>
        request(`/reviews/teacher/${teacherId}`),

    myPayments: () =>
        request('/payments/mine'),

    initiatePayment: classId =>
        request(`/payments/${classId}/initiate`, {
            method: 'POST'
        }),

    payPayment: (id, body) =>
        json('POST', `/payments/${id}/pay`, body),

    cancelPayment: id =>
        request(`/payments/${id}/cancel`, {
            method: 'POST'
        }),

    // Live chat endpoints
    chatMessages: classId =>
        request(`/chat/messages?classId=${encodeURIComponent(classId)}`, { skipCache: true }),

    sendMessage: body =>
        json('POST', '/chat/send', body),

    teacherConversations: () =>
        request('/chat/teacher/conversations', { skipCache: true }),

    unreadChatCount: () =>
        request('/chat/unread-count', { skipCache: true }),

    pendingApplications: () =>
        request('/admin/teacher-applications/pending'),

    approveApplication: id =>
        request(`/admin/teacher-applications/${id}/approve`, {
            method: 'POST'
        }),

    rejectApplication: id =>
        request(`/admin/teacher-applications/${id}/reject`, {
            method: 'POST'
        }),

    adminPayments: () =>
        request('/admin/payments'),

    adminClasses: () =>
        request('/admin/classes'),

    holdPayment: (id, transactionId) =>
        request(
            `/admin/payments/${id}/hold?transactionId=${encodeURIComponent(transactionId)}`,
            {
                method: 'POST'
            }
        ),

    adminStudents: () =>
        request('/admin/students'),

    banUser: (userId, days) =>
        request(`/admin/users/${userId}/ban?days=${days}`, {
            method: 'POST'
        }),

    removeTeacher: userId =>
        request(`/admin/teachers/${userId}`, {
            method: 'DELETE'
        }),

    removeUser: userId =>
        request(`/admin/users/${userId}`, {
            method: 'DELETE'
        })
}

export function fileUrl(value) {
    if (!value) return ''

    if (typeof value === 'object') {
        value =
            value.secure_url ||
            value.secureUrl ||
            value.url ||
            value.path ||
            ''
    }

    if (typeof value !== 'string') return ''

    if (/^(https?|blob|data):/i.test(value)) return value

    const origin = BASE.replace(/\/api$/, '')
    return `${origin}${value.startsWith('/') ? value : `/${value}`}`
}

export function getChatWebSocketUrl(token) {
    const origin = BASE.replace(/\/api$/, '').replace(/^http/, 'ws')
    return `${origin}/ws/chat?token=${encodeURIComponent(token || '')}`
}