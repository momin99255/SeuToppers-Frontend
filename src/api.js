const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')

async function request(path, options = {}) {
    const headers = new Headers(options.headers || {})
    const token = localStorage.getItem('seutoppers_token')

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    if (options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`${BASE}${path}`, {
        ...options,
        headers
    })

    const type = response.headers.get('content-type') || ''
    const data = type.includes('application/json')
        ? await response.json()
        : await response.text()

    if (!response.ok) {
        const message =
            typeof data === 'object' && data
                ? data.message || data.error || `Request failed (${response.status})`
                : data || `Request failed (${response.status})`

        throw new Error(message)
    }

    return data
}

const json = (method, path, body) =>
    request(path, {
        method,
        body: JSON.stringify(body)
    })

export const api = {
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

    if (/^https?:\/\//i.test(value)) return value

    const origin = BASE.replace(/\/api$/, '')
    return `${origin}${value.startsWith('/') ? value : `/${value}`}`
}