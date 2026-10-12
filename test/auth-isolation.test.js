import test from 'node:test'
import assert from 'node:assert/strict'

// Polyfill minimal browser globals for testing
const mockStorage = new Map()
globalThis.localStorage = {
  getItem: key => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: key => mockStorage.delete(key),
  clear: () => mockStorage.clear()
}
globalThis.sessionStorage = {
  getItem: key => mockStorage.get(`session:${key}`) || null,
  setItem: (key, val) => mockStorage.set(`session:${key}`, String(val)),
  removeItem: key => mockStorage.delete(`session:${key}`),
  clear: () => mockStorage.clear()
}
globalThis.window = {
  dispatchEvent: () => true
}
globalThis.CustomEvent = class CustomEvent {
  constructor(type, detail) {
    this.type = type
    this.detail = detail
  }
}

// Helper to create a fake valid JWT with custom subject and expiration
function createTestJwt(subject, expiresInSeconds = 3600) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: subject,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  })).toString('base64url')
  return `${header}.${payload}.fake_signature`
}

// Import api module
const {
  api,
  parseJwt,
  isTokenExpired,
  clearApiCache,
  resetApiSession
} = await import('../src/api.js')

test('1. parseJwt and isTokenExpired correctly validate JWT payloads', () => {
  const validToken = createTestJwt('momin@seu.edu.bd', 3600)
  const expiredToken = createTestJwt('momin@seu.edu.bd', -10)

  const payload = parseJwt(validToken)
  assert.equal(payload.sub, 'momin@seu.edu.bd')
  assert.equal(isTokenExpired(validToken), false)
  assert.equal(isTokenExpired(expiredToken), true)
  assert.equal(isTokenExpired(null), true)
})

test('2. Cache Isolation: User A data is NEVER served to User B', async () => {
  mockStorage.clear()
  resetApiSession()

  const tokenA = createTestJwt('momin@seu.edu.bd')
  const tokenB = createTestJwt('mehidi@seu.edu.bd')

  // Mock global fetch
  let fetchCallCount = 0
  globalThis.fetch = async (url, options) => {
    fetchCallCount++
    const authHeader = options?.headers?.get('Authorization') || ''
    if (authHeader.includes(tokenA)) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ fullName: 'Momin Islam', email: 'momin@seu.edu.bd' })
      }
    } else if (authHeader.includes(tokenB)) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ fullName: 'Mehidi Hasan', email: 'mehidi@seu.edu.bd' })
      }
    }
    return {
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Unauthorized' })
    }
  }

  // User A logs in
  localStorage.setItem('seutoppers_token', tokenA)
  const profileA1 = await api.studentProfile()
  assert.equal(profileA1.fullName, 'Momin Islam')
  assert.equal(fetchCallCount, 1)

  // Second request by User A within cache window should hit User A cache
  const profileA2 = await api.studentProfile()
  assert.equal(profileA2.fullName, 'Momin Islam')
  assert.equal(fetchCallCount, 1, 'User A request was served from User A cache')

  // User A logs out
  resetApiSession()
  localStorage.removeItem('seutoppers_token')

  // User B logs in
  localStorage.setItem('seutoppers_token', tokenB)
  const profileB1 = await api.studentProfile()
  assert.equal(profileB1.fullName, 'Mehidi Hasan', 'User B received Mehidi profile, NOT Momin')
  assert.equal(fetchCallCount, 2, 'User B made a new fetch request because User A cache was not reused')
})

test('3. Stale In-Flight Responses: Responses started under User A are aborted and discarded upon logout/switch', async () => {
  mockStorage.clear()
  resetApiSession()

  const tokenA = createTestJwt('momin@seu.edu.bd')
  const tokenB = createTestJwt('mehidi@seu.edu.bd')

  // Simulate slow endpoint for User A
  let requestACompleted = false
  globalThis.fetch = async (url, options) => {
    const authHeader = options?.headers?.get('Authorization') || ''
    if (authHeader.includes(tokenA)) {
      // Simulate delay
      await new Promise(r => setTimeout(r, 60))
      requestACompleted = true
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ fullName: 'Momin Stale' })
      }
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ fullName: 'Mehidi Fresh' })
    }
  }

  localStorage.setItem('seutoppers_token', tokenA)

  // Start in-flight request for User A
  const pendingRequestA = api.studentProfile().catch(err => {
    return { aborted: true, error: err.message }
  })

  // User A logs out while request is in-flight!
  resetApiSession()
  localStorage.removeItem('seutoppers_token')

  // User B logs in immediately
  localStorage.setItem('seutoppers_token', tokenB)

  const resultA = await pendingRequestA
  assert.equal(resultA.aborted, true, 'User A in-flight request was safely aborted and discarded')

  // Fetch for User B
  const profileB = await api.studentProfile()
  assert.equal(profileB.fullName, 'Mehidi Fresh')
})

test('4. Failed login leaves no active session or credentials in storage', async () => {
  mockStorage.clear()
  resetApiSession()

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Wrong username or password' })
    }
  }

  // Attempt login with invalid credentials
  await assert.rejects(
    async () => {
      await api.login({ email: 'unknown@seu.edu.bd', password: 'wrong' })
    },
    /Wrong username or password/
  )

  assert.equal(localStorage.getItem('seutoppers_auth'), null)
  assert.equal(localStorage.getItem('seutoppers_token'), null)
})

test('5. Expired token triggers automatic logout and session reset', async () => {
  mockStorage.clear()
  resetApiSession()

  const expiredToken = createTestJwt('momin@seu.edu.bd', -100)
  localStorage.setItem('seutoppers_token', expiredToken)
  localStorage.setItem('seutoppers_auth', JSON.stringify({ token: expiredToken, userId: 'u1', role: 'STUDENT' }))

  await assert.rejects(
    async () => {
      await api.studentProfile()
    },
    /You were logged out/
  )

  assert.equal(localStorage.getItem('seutoppers_token'), null)
  assert.equal(localStorage.getItem('seutoppers_auth'), null)
})
