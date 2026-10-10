import React, { useEffect, useMemo, useState } from 'react'

import {
  ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, FileText, GraduationCap, Home, LayoutDashboard, LogIn, LogOut,
  Menu, MessageCircle, Search, ShieldCheck, Star, UserRound, Users, WalletCards,
  X, Upload, Sparkles, Ban, CheckCircle2, AlertCircle, Eye, Plus, RefreshCw, LockKeyhole, Send,
  Award, HelpCircle, CreditCard, Lock
} from 'lucide-react'
import { api, fileUrl } from './api'


const requestInterestUiStyle = `
.request-interest-star {
  margin-left: auto;
  width: 42px;
  height: 42px;
  min-width: 42px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 11px;
  background: rgba(255,255,255,.04);
  color: #c9d6e5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: 0 0 auto;
  transition: .2s ease;
}
.request-interest-star:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(255,210,70,.55);
  color: #ffd54a;
}
.request-interest-star.marked {
  color: #ffd54a;
  background: rgba(255,213,74,.10);
  border-color: rgba(255,213,74,.45);
}
.request-interest-star:disabled {
  opacity: 1;
  cursor: default;
}
.request-student-avatar {
  border-radius: 50% !important;
}
`

if (typeof document !== 'undefined' && !document.getElementById('seutoppers-request-ui-fix')) {
  const style = document.createElement('style')
  style.id = 'seutoppers-request-ui-fix'
  style.textContent = requestInterestUiStyle
  document.head.appendChild(style)
}

const APP = import.meta.env.VITE_APP_NAME || 'SeuToppers'
const departments = ['CSE', 'BBA', 'EEE', 'TEXTILE', 'BANGLA', 'ENGLISH', 'ECONOMICS']
const programs = ['BSc', 'MSc', 'BBA', 'MBA', 'BA', 'MA', 'BSS', 'MSS', 'LLB', 'LLM', 'Other']
const REVIEW_STORAGE_KEY = 'seutoppers_reviews'

function readStoredReviews() {
  try {
    const reviews = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]')
    return Array.isArray(reviews) ? reviews : []
  } catch {
    return []
  }
}

function storeReview(review) {
  try {
    const reviews = readStoredReviews().filter(item => item.classId !== review.classId)
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify([review, ...reviews]))
  } catch (error) {
    console.error('Failed to cache submitted review:', error)
  }
}

function readAuth() {
  try {
    const value = JSON.parse(localStorage.getItem('seutoppers_auth') || 'null')

    if (!value?.token || !value?.userId || !value?.role) {
      localStorage.removeItem('seutoppers_auth')
      localStorage.removeItem('seutoppers_token')
      return null
    }

    return value
  } catch {
    localStorage.removeItem('seutoppers_auth')
    localStorage.removeItem('seutoppers_token')
    return null
  }
}

function saveAuth(value) {
  if (!value?.token || !value?.userId || !value?.role) {
    throw new Error('Invalid authentication response')
  }

  localStorage.setItem('seutoppers_auth', JSON.stringify(value))
  localStorage.setItem('seutoppers_token', value.token)
}

function clearAuth() {
  localStorage.removeItem('seutoppers_auth')
  localStorage.removeItem('seutoppers_token')
}

function useHashPage(defaultPage) {
  const [page, setPage] = useState(() => window.location.hash.replace('#', '') || defaultPage)
  useEffect(() => {
    const handler = () => setPage(window.location.hash.replace('#', '') || defaultPage)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [defaultPage])
  const go = value => { window.location.hash = value }
  return [page, go]
}

function useNotifications(auth) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    if (!auth?.userId || !localStorage.getItem('seutoppers_token')) {
      setItems([])
      setLoading(false)
      return
    }

    try {
      const data = await api.notifications()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auth?.userId) {
      setItems([])
      setLoading(false)
      return
    }

    loadNotifications()

    const interval = setInterval(() => {
      loadNotifications()
    }, 5000)

    const handleVisibility = () => {
      if (!document.hidden) {
        loadNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [auth?.userId])

  const markRead = async id => {
    try {
      await api.markNotificationRead(id)

      setItems(prev =>
          prev.map(item =>
              item.id === id
                  ? { ...item, read: true }
                  : item
          )
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead()

      setItems(prev =>
          prev.map(item => ({
            ...item,
            read: true
          }))
      )
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  return {
    items,
    loading,
    markRead,
    markAll,
    refresh: loadNotifications
  }
}

function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const reload = async () => {
    setState(s => ({ ...s, loading: true, error: '' }))
    try { setState({ loading: false, data: await loader(), error: '' }) }
    catch (e) { setState({ loading: false, data: null, error: e.message }) }
  }
  useEffect(() => { reload() }, deps)
  return { ...state, reload }
}

export default function App() {
  const [auth, setAuth] = useState(readAuth)
  const [page, go] = useHashPage(auth ? 'dashboard' : 'login')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const notifications = useNotifications(auth)

  useEffect(() => {
    document.title = loading ? `Loading • ${APP}` : `${APP}`
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3600)
    return () => clearTimeout(id)
  }, [toast, loading])

  useEffect(() => {
    const onVisibility = () => { document.body.classList.toggle('profile-blur', document.hidden && page === 'profile') }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [page])

  const notify = message => setToast(message)
  const login = value => { saveAuth(value); setAuth(value); go('dashboard') }
  const logout = () => { clearAuth(); setAuth(null); go('login'); notify('You have been logged out.') }
  const busy = async action => { setLoading(true); try { return await action() } finally { setLoading(false) } }

  return <>
    <div className="ambient ambient-one" />
    <div className="ambient ambient-two" />
    {loading && <div className="top-loader" />}
    {!auth ? <AuthRouter page={page} go={go} login={login} notify={notify} busy={busy} /> :
        <AppShell auth={auth} page={page} go={go} logout={logout} notify={notify} busy={busy} notifications={notifications} />}
    {toast && <div className="toast"><CheckCircle2 size={17}/><span>{toast}</span><button onClick={() => setToast('')}><X size={15}/></button></div>}
  </>
}

function AuthRouter({ page, go, login, notify, busy }) {
  if (page === 'register') return <Register go={go} notify={notify} busy={busy} />
  if (page === 'verify') return <Verify go={go} login={login} notify={notify} busy={busy} />
  if (page === 'forgot') return <Forgot go={go} notify={notify} busy={busy} />
  if (page === 'reset') return <Reset go={go} notify={notify} busy={busy} />
  return <Login go={go} login={login} notify={notify} busy={busy} />
}

function AuthFrame({ kicker, title, children, go }) {
  return <main className="auth-page">
    <section className="auth-showcase">
      {/* Section 1: Logo & Brand */}
      <div className="showcase-brand-section">
        <button className="brand brand-large" onClick={() => go('login')}>
          <span className="brand-mark">
            <img src="/SeuToppersFavicon.png" alt="SeuToppers" />
          </span>
          <span>Seu<span>Toppers</span></span>
        </button>
      </div>

      {/* Section 2: Middle Content */}
      <div className="showcase-content-section showcase-copy">
        <span className="eyebrow"><span className="eyebrow-dot"/> SEU student network</span>
        <h1>One account.<br/><em>Every learning path.</em></h1>
        <p>Find peer teachers, ask for academic help, book a class and build your teaching profile inside one focused SEU community.</p>
        <div className="showcase-list">
          <span><Check size={16}/> SEU email verification</span>
          <span><Check size={16}/> Role-based access</span>
          <span><Check size={16}/> Payment and class tracking</span>
        </div>
      </div>

      {/* Section 3: Profile Progress Graph */}
      <div className="showcase-graph-section showcase-card">
        <div>
          <span>Profile completion</span>
          <strong>80%</strong>
        </div>
        <div className="progress">
          <i style={{ width: '80%' }}/>
        </div>
        <small>Unlock requests and teacher applications</small>
      </div>

      <div className="showcase-orb orb-left"/>
      <div className="showcase-orb orb-right"/>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <div className="mobile-auth-brand">
          <button className="brand brand-large" onClick={() => go('login')}>
            <span className="brand-mark">
              <img src="/SeuToppersFavicon.png" alt="SeuToppers" />
            </span>
            <span>Seu<span>Toppers</span></span>
          </button>
        </div>
        <div className="auth-kicker">{kicker}</div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  </main>
}

function Login({ go, login, notify, busy }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const renderGoogleButton = () => {
      if (!window.google) return

      const container = document.getElementById('google-login-button')
      if (!container) return

      container.innerHTML = ''

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async response => {
          setError('')
          try {
            const value = await busy(() => api.googleLogin(response.credential))
            login(value)
            notify('Welcome to SeuToppers.')
          } catch (e) {
            setError(e.message)
          }
        }
      })

      const targetWidth = Math.min(Math.max(container.offsetWidth || 400, 240), 400)
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: targetWidth,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      })
    }

    if (window.google) {
      renderGoogleButton()
      return
    }

    const timer = setInterval(() => {
      if (window.google) {
        clearInterval(timer)
        renderGoogleButton()
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  const submit = async e => {
    e.preventDefault(); setError('')
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return setError('Please enter your SEU email address.')
    if (!trimmedEmail.endsWith('@seu.edu.bd')) {
      return setError('Only Southeast University email (@seu.edu.bd) is allowed. Please provide your official SEU email.')
    }
    if (!password) return setError('Please enter your password.')
    setSubmitting(true)
    try {
      login(await busy(() => api.login({ email: trimmedEmail, password })))
      notify('Welcome back to SeuToppers.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }
  return <AuthFrame kicker="Welcome back" title="Log in to SeuToppers" go={go}>
    <div className="auth-intro"><b>Built for the SEU community</b><p>Students can find teachers, request help, book classes and track learning payments.</p></div>
    <form className="form" onSubmit={submit}>
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} placeholder="enter your SEU mail" type="email" required />
      <PasswordField label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <div className="form-row end"><button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button></div>
      <ErrorBox error={error}/><button className="primary full" disabled={submitting}>{submitting ? <Spinner/> : <>Log in <ArrowRight size={17}/></>}</button>
      <div className="auth-divider"><span>OR</span></div>
      <div className="google-login-container">
        <div id="google-login-button" className="google-login-button" />
      </div>
    </form>
    <p className="auth-switch">New to SeuToppers? <button className="link" onClick={() => go('register')}>Create an account</button></p>
  </AuthFrame>
}

function Register({ go, notify, busy }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return setError('Please enter your SEU email address.')
    if (!trimmedEmail.endsWith('@seu.edu.bd')) {
      return setError('Only Southeast University email (@seu.edu.bd) is allowed for registration.')
    }
    if (!password) return setError('Please choose a secure password.')
    if (password !== confirm) {
      return setError('Passwords do not match. Please ensure both password fields are identical.')
    }

    setSubmitting(true)

    try {
      await busy(() =>
          api.register({
            email: trimmedEmail,
            password,
            confirmPassword: confirm
          })
      )

      localStorage.setItem(
          'seutoppers_pending_email',
          trimmedEmail
      )

      notify('Verification code sent to your SEU email.')
      go('verify')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthFrame kicker="Join SeuToppers" title="Create your student account" go={go}>
    <form className="form" onSubmit={submit}>
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} placeholder="enter your SEU mail" type="email" required />
      <PasswordField label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <PasswordField label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      <ErrorBox error={error}/>
      <button className="primary full" disabled={submitting}>
        {submitting ? <Spinner/> : <>Continue <ArrowRight size={17}/></>}
      </button>
    </form>
    <div className="auth-guidance">
      <div className="auth-guidance-item">
        <CheckCircle2 size={15}/>
        <span><strong>SEU Community Only:</strong> Registration requires an active Southeast University email address.</span>
      </div>
      <div className="auth-guidance-item">
        <ShieldCheck size={15}/>
        <span><strong>Verification:</strong> A 6-digit verification code will be sent to your university inbox to activate your account.</span>
      </div>
    </div>
    <p className="auth-switch">Already registered? <button className="link" onClick={() => go('login')}>Log in</button></p>
  </AuthFrame>
}

function Verify({ go, login, notify, busy }) {
  const [email, setEmail] = useState(localStorage.getItem('seutoppers_pending_email') || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const value = await busy(() => api.verifyEmail({ email, otp }))
      localStorage.removeItem('seutoppers_pending_email')
      login(value)
      notify('Email verified. Welcome to SeuToppers.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthFrame kicker="Verify email" title="Confirm your SEU email" go={go}>
    <p className="muted">Enter the OTP sent to your university email. The code is short-lived for security.</p>
    <form className="form" onSubmit={submit}>
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} type="email" required/>
      <Field label="Verification code" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" required/>
      <ErrorBox error={error}/>
      <button className="primary full" disabled={submitting}>
        {submitting ? <Spinner/> : <>Verify and enter <ArrowRight size={17}/></>}
      </button>
    </form>
    <p className="auth-switch"><button className="link" onClick={() => go('register')}>Use another email</button></p>
  </AuthFrame>
}

function Forgot({ go, notify, busy }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await busy(() => api.forgotPassword({ email }))
      localStorage.setItem('seutoppers_reset_email', email)
      notify('If the account exists, a reset code has been sent.')
      go('reset')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthFrame kicker="Account recovery" title="Forgot your password?" go={go}>
    <p className="muted">We will send a reset code to your SEU email.</p>
    <form className="form" onSubmit={submit}>
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} type="email" required/>
      <ErrorBox error={error}/>
      <button className="primary full" disabled={submitting}>
        {submitting ? <Spinner/> : <>Send reset code <ArrowRight size={17}/></>}
      </button>
    </form>
    <p className="auth-switch"><button className="link" onClick={() => go('login')}>Back to login</button></p>
  </AuthFrame>
}

function Reset({ go, notify, busy }) {
  const [email, setEmail] = useState(localStorage.getItem('seutoppers_reset_email') || '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await busy(() => api.resetPassword({ email, otp, newPassword: password }))
      localStorage.removeItem('seutoppers_reset_email')
      notify('Password reset successful.')
      go('login')
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthFrame kicker="Set a new password" title="Reset your password" go={go}>
    <form className="form" onSubmit={submit}>
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} type="email" required/>
      <Field label="Reset code" value={otp} onChange={e => setOtp(e.target.value)} required/>
      <PasswordField label="New password" value={password} onChange={e => setPassword(e.target.value)} required/>
      <ErrorBox error={error}/>
      <button className="primary full" disabled={submitting}>
        {submitting ? <Spinner/> : <>Save password <Check size={17}/></>}
      </button>
    </form>
  </AuthFrame>
}

function AppShell({ auth, page, go, logout, notify, busy, notifications }) {
  const [open, setOpen] = useState(false), [notiOpen, setNotiOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const teacher = auth.role === 'TEACHER'

  const links = auth.role === 'ADMIN' ? [
    ['dashboard', 'Overview', LayoutDashboard], ['admin-teachers', 'Teachers', Users], ['admin-students', 'Students', UserRound], ['admin-applications', 'Applications', ClipboardList], ['admin-payments', 'Payments', WalletCards], ['admin-classes', 'Classes', CalendarDays]
  ] : [
    ['dashboard', 'Overview', LayoutDashboard], ['teachers', 'Find teachers', Users], ['requests', 'Help requests', MessageCircle], ['service-taken', 'Service taken', BookOpen], ...(teacher ? [['service-given', 'Service given', GraduationCap]] : []), ['payments', 'Payment history', WalletCards], ['reviews', 'Your reviews', Star], ...(teacher ? [['teacher-reviews', 'Student reviews', Star]] : []), ...(teacher ? [] : [['teacher-apply', 'Become a teacher', GraduationCap]]), ['profile', 'My profile', UserRound]
  ]

  const loadProfile = async () => {
    if (auth.role === 'ADMIN') return
    try {
      const value = await api.studentProfile()
      setProfile(value)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    loadProfile()
    const handler = event => {
      if (event.detail) setProfile(event.detail)
      else loadProfile()
    }
    window.addEventListener('seutoppers-profile-updated', handler)
    return () => window.removeEventListener('seutoppers-profile-updated', handler)
  }, [auth.role])

  const displayName = profile?.fullName || auth.email?.split('@')[0] || 'User'
  const profileImage = profile?.profileImage ? fileUrl(profile.profileImage) : ''

  const mobileNavItems = auth.role === 'ADMIN' ? [
    ['dashboard', 'Overview', LayoutDashboard],
    ['admin-users', 'Users', Users],
    ['admin-classes', 'Classes', CalendarDays],
    ['admin-payments', 'Payments', CreditCard]
  ] : [
    ['dashboard', 'Home', LayoutDashboard],
    ['requests', 'Requests', MessageCircle],
    [teacher ? 'service-given' : 'service-taken', 'Classes', BookOpen],
    ['payments', 'Payments', CreditCard],
    ['profile', 'Profile', UserRound]
  ]

  return <div className="app-shell">
    {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-top"><Brand onClick={() => { go('dashboard'); setOpen(false) }}/><button className="mobile-close" onClick={() => setOpen(false)}><X size={19}/></button></div>
      <div className="side-account">
        <div className="avatar">
          {profileImage ? <img src={profileImage} alt="Profile"/> : initials(displayName)}
        </div>
        <div><strong>{displayName}</strong><span>{teacher ? 'Student & Teacher' : auth.role}</span></div>
      </div>
      <nav className="side-nav">{links.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { go(id); setOpen(false) }}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="logout" onClick={logout}><LogOut size={18}/><span>Log out</span></button></div>
    </aside>
    <div className="main-shell">
      <header className="appbar">
        <button className="mobile-menu" onClick={() => setOpen(true)}><Menu/></button>
        <div className="crumb"><span className="crumb-app">{APP}</span><ChevronRight size={15} className="crumb-chevron"/><b>{links.find(x => x[0] === page)?.[1] || 'Overview'}</b></div>
        <div className="app-actions">
          <div className="notification-wrap">
            <button className="icon-btn" onClick={() => setNotiOpen(v => !v)}><Bell size={18}/>{notifications.items.some(x => !x.read) && <i className="notify-dot"/>}</button>
            {notiOpen && <NotificationPanel items={notifications.items} markRead={notifications.markRead} markAll={notifications.markAll}/>}
          </div>
          <span className="role-pill">{teacher ? 'TEACHER + STUDENT' : auth.role}</span>
          <button className="icon-btn" onClick={logout}><LogOut size={17}/></button>
        </div>
      </header>
      <main className="content"><Page page={page} auth={auth} go={go} notify={notify} busy={busy} notifications={notifications}/></main>
    </div>
    <nav className="mobile-bottom-nav">
      {mobileNavItems.map(([id, label, Icon]) => {
        const isActive = page === id || (id === 'service-taken' && (page === 'service-taken' || page === 'service-given'))
        return (
          <button
            key={id}
            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => {
              go(id)
              setOpen(false)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  </div>
}

function Page({ page, auth, go, notify, busy, notifications }) {
  if (auth.role === 'ADMIN') return <AdminPage page={page} auth={auth} go={go} notify={notify} busy={busy} notifications={notifications}/>
  if (page === 'teachers') return <TeachersPage auth={auth} notify={notify} />
  if (page === 'requests') return <RequestsPage auth={auth} go={go} notify={notify} busy={busy} />
  if (page === 'create-request') return <CreateRequestPage notify={notify} />
  if (page === 'service-taken') return <ServiceTakenPage auth={auth} notify={notify} />
  if (page === 'service-given') return <ServiceGivenPage notify={notify} />
  if (page === 'payments') return <PaymentsPage notify={notify} />
  if (page === 'reviews') return <ReviewsPage auth={auth} />
  if (page === 'teacher-reviews') return <TeacherReviewsPage />
  if (page === 'teacher-apply') return <TeacherApplyPage notify={notify} busy={busy}/>
  if (page === 'profile') return <ProfilePage auth={auth} notify={notify} busy={busy}/>
  return <DashboardPage auth={auth} go={go} notify={notify}/>
}

function DashboardPage({ auth, go, notify }) {
  const teachers = useLoad(api.teachers, [])
  const profile = useLoad(api.studentProfile, [])
  const completion = useLoad(api.completion, [])
  const classes = useLoad(api.myClasses, [])
  const teacherProfile = useLoad(auth.role === 'TEACHER' ? api.teacherProfile : async () => null, [auth.role])
  const [selectedTeacher, setSelectedTeacher] = useState(null)

  const top = useMemo(
      () => (teachers.data || [])
          .filter(x => x.rating != null)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 4),
      [teachers.data]
  )

  const stats = auth.role === 'TEACHER' ? [
    ['Rating', Number(teacherProfile.data?.rating || 0).toFixed(1), Star],
    ['Reviews', teacherProfile.data?.totalReviews || 0, Award],
    ['Classes', (classes.data || []).length, BookOpen],
    ['Profile', `${completion.data || 0}%`, UserRound]
  ] : [
    ['Profile', `${completion.data || 0}%`, UserRound],
    ['Classes', (classes.data || []).length, BookOpen],
    ['Teachers', teachers.data?.length || 0, Users],
    ['Status', (completion.data || 0) >= 80 ? 'Ready' : 'Incomplete', CheckCircle2]
  ]

  if (selectedTeacher) {
    return (
        <TeacherProfileView
            teacher={selectedTeacher}
            onBack={() => setSelectedTeacher(null)}
            auth={auth}
        />
    )
  }

  const avatar = profile.data?.profileImage ? fileUrl(profile.data.profileImage) : null
  const greetingName = displayName(profile.data, auth.email)

  return (
      <div className="page-stack">
        <section className="dashboard-hero">
          <div className="dashboard-hero-content">
            <div className="dashboard-greeting">
              <div className="dashboard-avatar-ring">
                {avatar ? <img src={avatar} alt="User" /> : initials(greetingName)}
              </div>
              <div>
                <span className="eyebrow"><span className="eyebrow-dot" /> SEU TOPPERS · ACADEMIC HUB</span>
                <h1 className="dashboard-hero-title">Welcome back, {greetingName}!</h1>
                <p className="dashboard-hero-subtitle">
                  {auth.role === 'TEACHER'
                    ? 'Manage your tutoring sessions, track ratings, and accept student requests.'
                    : 'Connect with top-rated university peer tutors and elevate your academic performance.'}
                </p>
              </div>
            </div>

            <div className="dashboard-hero-actions">
              {(completion.data || 0) < 80 ? (
                <button className="primary" onClick={() => go('profile')}>
                  Complete Profile ({completion.data || 0}%) <ArrowRight size={16}/>
                </button>
              ) : (
                <button className="primary" onClick={() => go('teachers')}>
                  Find a Teacher <ArrowRight size={16}/>
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="quick-actions-bar">
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7891aa' }}>
            Quick Actions:
          </span>
          <button className="quick-action-pill" onClick={() => go('teachers')}>
            <Users size={14}/> Find Tutors
          </button>
          <button className="quick-action-pill" onClick={() => go('create-request')}>
            <HelpCircle size={14}/> Post Help Request
          </button>
          <button className="quick-action-pill" onClick={() => go(auth.role === 'TEACHER' ? 'service-given' : 'service-taken')}>
            <BookOpen size={14}/> {auth.role === 'TEACHER' ? 'Teaching Classes' : 'My Classes'}
          </button>
          <button className="quick-action-pill" onClick={() => go('payments')}>
            <CreditCard size={14}/> Payments
          </button>
        </div>

        <div className="stat-grid">
          {stats.map(([label, value, Icon]) => (
              <StatCard key={label} label={label} value={value} icon={Icon}/>
          ))}
        </div>

        <section className="section" style={{ animation: 'fadeInUp 0.45s ease-out' }}>
          <SectionHeading
              title="Top ranked teachers"
              subtitle="Browse top-rated peer tutors and click to inspect their complete profile and student reviews."
              action={
                <button className="text-button" onClick={() => go('teachers')}>
                  View all ({teachers.data?.length || 0}) <ArrowRight size={15}/>
                </button>
              }
          />

          <div className="teacher-grid">
            {teachers.loading ? (
                <SkeletonCards/>
            ) : (
                top.map((t, i) => (
                    <TeacherCard
                        key={t.id}
                        teacher={t}
                        rank={i + 1}
                        onOpen={() => setSelectedTeacher(t)}
                    />
                ))
            )}
          </div>

          {!teachers.loading && !top.length && (
              <EmptyState
                  icon={Users}
                  title="No teachers found"
                  text="No ranked teacher profiles are available yet."
              />
          )}
        </section>

        <div className="dashboard-grid">
          <section className="panel promo-panel" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
            <div className="promo-icon"><GraduationCap size={23}/></div>
            <div>
              <span className="eyebrow">TEACHER PATH</span>
              <h3>{auth.role === 'TEACHER' ? 'Your teacher profile is active.' : 'Want to become a teacher?'}</h3>
              <p>{auth.role === 'TEACHER'
                  ? 'Update your subjects, hourly rate, teaching mode and availability from your profile.'
                  : 'Earn by teaching fellow students. Requires 80%+ profile completion and 3.80+ CGPA.'}</p>
            </div>
            <button className="secondary" onClick={() => go(auth.role === 'TEACHER' ? 'profile' : 'teacher-apply')}>
              {auth.role === 'TEACHER' ? 'Edit teaching profile' : 'Apply now'} <ArrowRight size={16}/>
            </button>
          </section>

          <section className="panel mini-chart-panel" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
            <SectionHeading title="Your class activity" subtitle="Current records from the class API."/>
            <MiniActivity classes={classes.data || []}/>
          </section>
        </div>
      </div>
  )
}

function TeachersPage({ auth, notify }) {
  const [query, setQuery] = useState(''), [selected, setSelected] = useState(null)
  const data = useLoad(api.teachers, [])
  const filtered = useMemo(() => (data.data || []).filter(t => `${t.fullName || ''} ${(t.subjects || []).join(' ')} ${t.department || ''}`.toLowerCase().includes(query.toLowerCase())), [data.data, query])
  if (selected) return <TeacherProfileView teacher={selected} onBack={() => setSelected(null)} auth={auth}/>
  return <div className="page-stack"><PageHero title="Find your teacher" subtitle="Search peer teachers by name, subject or department."/><section className="panel"><div className="search-row"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by teacher, subject or department"/></div><span className="result-count">{filtered.length} teachers</span></div><div className="teacher-grid large">{data.loading ? <SkeletonCards count={6}/> : filtered.map((t, i) => <TeacherCard key={t.id} teacher={t} rank={i < 3 ? i + 1 : null} onOpen={() => setSelected(t)}/>)}</div>{!data.loading && !filtered.length && <EmptyState icon={Users} title="No teacher found" text="Try another name or subject."/>}</section></div>
}

function TeacherProfileView({ teacher, onBack, auth }) {
  const rating = Number(teacher.rating || 0)
  const teacherId = teacher.userId || teacher.id
  const reviewsData = useLoad(() => api.teacherReviews(teacherId), [teacherId])
  const reviewsList = Array.isArray(reviewsData.data) ? reviewsData.data : []

  return (
    <div className="page-stack teacher-profile-page" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="back-button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid var(--line)', color: '#d0e2f7', fontWeight: 700, cursor: 'pointer' }}>
          <ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} /> Back
        </button>
        <span className="eyebrow"><span className="eyebrow-dot" /> VERIFIED SEU PEER TUTOR</span>
      </div>

      <section className="profile-hero panel" style={{ background: 'linear-gradient(145deg, rgba(14, 33, 56, 0.95), rgba(7, 18, 31, 0.95))', border: '1px solid rgba(112, 230, 207, 0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div className="profile-avatar large" style={{ width: 88, height: 88, minWidth: 88, borderRadius: 24, overflow: 'hidden' }}>
          {teacher.profileImage ? <img src={fileUrl(teacher.profileImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(teacher.fullName)}
        </div>
        <div className="profile-main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="eyebrow">DEPARTMENT OF {teacher.department?.toUpperCase() || 'SEU'}</span>
            {teacher.hourlyRate && (
              <span className="teacher-rating-pill" style={{ color: '#70e6cf', borderColor: 'rgba(112,230,207,.3)', background: 'rgba(112,230,207,.08)' }}>
                ৳{teacher.hourlyRate} / hour
              </span>
            )}
            {teacher.teachingMode && (
              <span className="status status-paid" style={{ fontSize: 10 }}>
                {teacher.teachingMode}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 30, letterSpacing: '-0.03em', margin: '6px 0 3px' }}>{teacher.fullName || 'Teacher'}</h1>
          <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
            {teacher.qualification || teacher.program || 'SEU Peer Tutor'} · {teacher.department || 'SEU'} {teacher.batch ? `· Batch ${teacher.batch}` : ''}
          </p>
          <div className="chips">
            {(teacher.subjects || []).map(s => <span key={s} style={{ background: 'rgba(112,230,207,0.08)', borderColor: 'rgba(112,230,207,0.25)', color: '#d2f9f1' }}>{s}</span>)}
          </div>
        </div>
        <div className="rating-box">
          <div className="rating-ring" style={{ '--rating': `${rating / 5 * 100}%` }}>
            <strong>{rating.toFixed(1)}</strong>
            <span>/ 5</span>
          </div>
          <b>{teacher.totalReviews || reviewsList.length || 0} reviews</b>
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <SectionHeading title="About & Performance" subtitle="Teacher overview and course specialties." />
          {teacher.bio ? (
            <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px solid var(--line)', marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: '#7ba1c7', fontWeight: 800, marginBottom: 4 }}>About Teacher</span>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#cbe0f8' }}>{teacher.bio}</p>
            </div>
          ) : null}

          <div className="metric-chart">
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, rating / 5 * 100))}%` }} />
            </div>
            <div className="metric-row">
              <span>Overall rating</span>
              <strong>{rating.toFixed(1)} / 5</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(100, Number(teacher.totalReviews || reviewsList.length || 0) * 10)}%` }} />
            </div>
            <div className="metric-row">
              <span>Total completed reviews</span>
              <strong>{teacher.totalReviews || reviewsList.length || 0}</strong>
            </div>
          </div>
          <div className="subject-graph" style={{ marginTop: 14 }}>
            {(teacher.subjects || []).map((s, i) => (
              <div key={s} className="subject-row">
                <span>{s}</span>
                <i style={{ width: `${Math.max(28, 92 - i * 11)}%` }} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionHeading title="Teaching details" subtitle="Teaching mode, schedule and rates." />
          <InfoRow label="Experience" value={teacher.experience || 'Experienced SEU peer tutor'} />
          <InfoRow label="Teaching mode" value={teacher.teachingMode || 'Flexible (Online / In-person)'} />
          <InfoRow label="Availability" value={teacher.availability || 'Evening / Weekends'} />
          <InfoRow label="Hourly rate" value={teacher.hourlyRate ? `৳${teacher.hourlyRate}` : 'Negotiable'} />
          <InfoRow label="Department" value={teacher.department || 'SEU'} />
          <InfoRow label="Program" value={teacher.program || 'Undergraduate'} />
          <InfoRow label="Location" value={teacher.location || 'Southeast University'} />
        </section>
      </div>

      <section className="panel" style={{ marginTop: 14, animation: 'fadeInUp 0.4s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, margin: '0 0 4px', fontWeight: 800 }}>Student reviews ({reviewsList.length})</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Genuine feedback submitted by students who took classes with this teacher.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,215,0,.1)', border: '1px solid rgba(255,215,0,.25)', color: '#ffd700' }}>
            <Star size={14} fill="currentColor"/>
            <strong style={{ fontSize: 13 }}>{rating.toFixed(1)}</strong>
            <small style={{ color: '#d8c265', fontSize: 11 }}>/ 5.0</small>
          </div>
        </div>

        <div className="review-grid">
          {reviewsList.map(x => (
            <article className="review-card" key={x.id} style={{ padding: 18, borderRadius: 16, background: 'rgba(14, 30, 48, 0.7)', border: '1px solid var(--line)' }}>
              <div className="review-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="profile-avatar" style={{ width: 38, height: 38, minWidth: 38, borderRadius: '50%', overflow: 'hidden' }}>
                    {x.studentProfileImage ? (
                      <img src={fileUrl(x.studentProfileImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials(x.studentName || 'Student')
                    )}
                  </div>
                  <div>
                    <b style={{ fontSize: 14, color: '#f0f6ff' }}>{x.studentName || 'Student'}</b>
                    <small style={{ display: 'block', color: '#7d95b0', fontSize: 11 }}>
                      {formatDate(x.createdAt)} {formatTime(x.createdAt) ? `· ${formatTime(x.createdAt)}` : ''}
                    </small>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Stars value={x.rating} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#ffd700', marginLeft: 4 }}>{x.rating}.0</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#d1e3f8' }}>{x.comment}</p>
            </article>
          ))}
        </div>

        {!reviewsData.loading && !reviewsList.length && (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'rgba(255,255,255,.015)', borderRadius: 16, border: '1px dashed var(--line)' }}>
            <Award size={32} style={{ color: '#6d8ba9', margin: '0 auto 8px' }} />
            <b style={{ display: 'block', fontSize: 15, color: '#e2edfa', marginBottom: 4 }}>No student reviews yet</b>
            <p className="muted" style={{ margin: 0, fontSize: 13, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              Classes completed with this teacher will show verified ratings and feedback here.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function RequestsPage({ auth, go, notify, busy }) {
  const open = useLoad(
      auth.role === 'TEACHER' ? api.openRequests : async () => [],
      [auth.role]
  )
  const mine = useLoad(api.myRequests, [auth.role])

  const [active, setActive] = useState(auth.role === 'TEACHER' ? 'open' : 'mine')
  const [interests, setInterests] = useState({})
  const [message, setMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [markedRequests, setMarkedRequests] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`seutoppers_interested_${auth.userId}`) || '{}')
    } catch {
      return {}
    }
  })

  const rawList = active === 'mine' ? mine.data : open.data

  const allList = Array.isArray(rawList)
      ? rawList
      : Array.isArray(rawList?.content)
          ? rawList.content
          : Array.isArray(rawList?.data)
              ? rawList.data
              : []

  const list = active === 'open'
      ? allList.filter(item => item.studentId !== auth.userId)
      : allList

  const loadInterests = async requestId => {
    try {
      const value = await api.interests(requestId)

      setInterests(x => ({
        ...x,
        [requestId]: value
      }))
    } catch (e) {
      notify(e.message)
    }
  }

  const showInterests = async requestId => {
    await loadInterests(requestId)
    setSelectedRequest(requestId)
  }

  const toggleInterest = async requestId => {
    const targetItem = allList.find(r => r.id === requestId)
    if (targetItem && targetItem.studentId === auth.userId) {
      notify('You cannot express interest in your own request.')
      return
    }

    const alreadyMarked = !!markedRequests[requestId]

    try {
      if (alreadyMarked) {
        await busy(() => api.removeInterest(requestId))

        setMarkedRequests(x => {
          const next = { ...x }
          delete next[requestId]
          localStorage.setItem(
              `seutoppers_interested_${auth.userId}`,
              JSON.stringify(next)
          )
          return next
        })

        notify('Interest removed.')
      } else {
        await busy(() => api.interest(requestId, message))

        setMessage('')

        setMarkedRequests(x => {
          const next = { ...x, [requestId]: true }
          localStorage.setItem(
              `seutoppers_interested_${auth.userId}`,
              JSON.stringify(next)
          )
          return next
        })

        notify(
            'Interest submitted. The student can now review your profile.'
        )
      }

      open.reload()
    } catch (e) {
      notify(e.message)
    }
  }

  const selectTeacher = async (requestId, teacherId) => {
    try {
      await busy(() =>
          api.selectTeacher(requestId, teacherId)
      )

      /*
       * Backend automatically:
       * 1. Selects the teacher
       * 2. Creates a 1-hour class
       * 3. Sets price to ৳100
       * 4. Creates simulated HELD payment
       * 5. Notifies the teacher
       */
      notify(
          'Teacher selected! Please go to Payment history to complete payment and confirm the class.'
      )

      await mine.reload()

      setSelectedRequest(null)
    } catch (e) {
      notify(e.message)
    }
  }

  return (
      <div className="page-stack">

        <PageHero
            title="Help requests"
            subtitle={
              auth.role === 'TEACHER'
                  ? 'Explore open requests and respond when your expertise matches.'
                  : 'Manage your requests and review interested teachers.'
            }
            action={{
              label: 'Post a request',
              onClick: () => go('create-request')
            }}
        />

        <div className="tabs">
          {auth.role === 'TEACHER' && (
              <button
                  className={active === 'open' ? 'active' : ''}
                  onClick={() => setActive('open')}
              >
                Open requests
              </button>
          )}
          <button
              className={active === 'mine' ? 'active' : ''}
              onClick={() => setActive('mine')}
          >
            My requests
          </button>

        </div>

        <div className="request-grid">

          {list.map(item => (
              <RequestCard
                  key={item.id}
                  item={item}
                  role={auth.role}
                  isOwner={item.studentId === auth.userId}
                  canInterest={auth.role === 'TEACHER' && item.studentId !== auth.userId}
                  interested={!!markedRequests[item.id]}
                  onInterest={() => toggleInterest(item.id)}
                  onShowInterests={() => showInterests(item.id)}
                  message={message}
                  setMessage={setMessage}
              />
          ))}

        </div>

        {!list.length && !(open.loading || mine.loading) && (
            <EmptyState
                icon={MessageCircle}
                title="Nothing here yet"
                text={
                  active === 'mine'
                      ? 'You have not posted any help requests.'
                      : 'No open help requests are available.'
                }
            />
        )}

        {selectedRequest && (
            <InterestModal
                requestId={selectedRequest}
                interests={interests[selectedRequest] || []}
                requestOwnerId={allList.find(r => r.id === selectedRequest)?.studentId || auth.userId}
                currentUserId={auth.userId}
                onClose={() => setSelectedRequest(null)}
                onSelect={selectTeacher}
            />
        )}

      </div>
  )
}

function CreateRequestPage({ notify }) {
  const [form, setForm] = useState({
    topic: '',
    description: '',
    requestedTime: ''
  })

  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError('')

    try {
      await api.createRequest({
        topic: form.topic,
        description: form.description,
        requestedTime: form.requestedTime
      })

      setDone(true)
      notify('Help request posted successfully.')
    } catch (e) {
      setError(e.message)
    }
  }

  if (done) {
    return (
        <div className="empty-page">
          <div className="success-mark">
            <Check size={25}/>
          </div>

          <h2>Request posted</h2>

          <p>
            Teachers can now respond with interest.
          </p>

          <button
              className="primary"
              onClick={() => window.location.hash = 'requests'}
          >
            View requests <ArrowRight size={16}/>
          </button>
        </div>
    )
  }

  return (
      <div className="page-stack">
        <PageHero
            title="Post a help request"
            subtitle="Describe what you need and when you need help."
        />

        <section className="panel form-panel">
          <form className="form" onSubmit={submit}>

            <div className="form-grid">
              <Field
                  label="Topic"
                  value={form.topic}
                  onChange={e =>
                      setForm({
                        ...form,
                        topic: e.target.value
                      })
                  }
                  placeholder="e.g. Data Mining - DBSCAN"
                  required
              />

              <Field
                  label="Requested time"
                  value={form.requestedTime}
                  onChange={e =>
                      setForm({
                        ...form,
                        requestedTime: e.target.value
                      })
                  }
                  placeholder="e.g. Friday 8:00 PM"
                  required
              />
            </div>

            <TextArea
                label="Description"
                value={form.description}
                onChange={e =>
                    setForm({
                      ...form,
                      description: e.target.value
                    })
                }
                placeholder="Explain the exact topic or problem you need help with."
                required
            />

            <div className="info-box">
              <strong>Class details</strong>
              <span>Duration: 1 hour · Fixed price: ৳100</span>
            </div>

            <ErrorBox error={error}/>

            <button className="primary" type="submit">
              Post request <ArrowRight size={16}/>
            </button>

          </form>
        </section>
      </div>
  )
}

function ServiceTakenPage({ auth, notify }) {
  const data = useLoad(api.myClasses, [])
  const teachers = useLoad(api.teachers, [])
  const myReviews = useLoad(api.myReviews, [auth?.userId])
  const [reviews, setReviews] = useState(readStoredReviews)
  const map = useMemo(() => Object.fromEntries((teachers.data || []).map(x => [x.userId, x])), [teachers.data])
  const reviewedIds = useMemo(() => {
    const ids = new Set((myReviews.data || []).map(x => x.classId))
    reviews.forEach(x => ids.add(x.classId))
    return ids
  }, [reviews, myReviews.data])
  const reviewedClasses = (data.data || []).filter(c => reviewedIds.has(c.id) || c.status === 'COMPLETED')
  const classesToReview = (data.data || []).filter(c => !reviewedIds.has(c.id) && c.status !== 'COMPLETED' && c.status !== 'CANCELLED')

  const refresh = async () => {
    await data.reload()
    await myReviews.reload()
    setReviews(readStoredReviews())
  }

  return <div className="page-stack">
    <PageHero title="Service taken" subtitle="Track accepted classes, their status and your teacher reviews."/>

    {!!classesToReview.length && (
        <section className="panel">
          <SectionHeading title="Your classes" subtitle="Review a class when you are ready."/>
          <div className="class-list">
            {classesToReview.map(c => (
                <ClassCard
                    key={c.id}
                    item={c}
                    teacher={map[c.teacherId]}
                    auth={auth}
                    studentView
                    pendingReview
                    onReview={refresh}
                    notify={notify}
                />
            ))}
          </div>
        </section>
    )}

    {!!reviewedClasses.length && (
        <section className="panel">
          <SectionHeading title="Reviewed classes" subtitle="Your submitted reviews are saved here."/>
          <div className="class-list">
            {reviewedClasses.map(c => (
                <ClassCard
                    key={c.id}
                    item={c}
                    teacher={map[c.teacherId]}
                    auth={auth}
                    studentView
                    reviewed
                    onReview={refresh}
                    notify={notify}
                />
            ))}
          </div>
        </section>
    )}

    {!data.loading && !classesToReview.length && !reviewedClasses.length && (
        <EmptyState icon={BookOpen} title="No services taken yet" text="A class will appear here after you accept a teacher from your request."/>
    )}
  </div>
}

function ServiceGivenPage({ notify }) {
  const data = useLoad(api.teacherClasses, [])
  return <div className="page-stack"><PageHero title="Service given" subtitle="Manage classes where you are the teacher."/><section className="class-list">{data.loading ? <LoadingCard/> : (data.data || []).map(c => <TeacherClassCard key={c.id} item={c} notify={notify} reload={data.reload}/>)}</section>{!data.loading && !data.data?.length && <EmptyState icon={GraduationCap} title="No services given yet" text="When a student books you, the class will appear here."/>}</div>
}

function PaymentsPage({ notify }) {
  const payments = useLoad(api.myPayments, [])
  const classes = useLoad(api.myClasses, [])
  const teachers = useLoad(api.teachers, [])

  const classMap = useMemo(() => Object.fromEntries((classes.data || []).map(x => [x.id, x])), [classes.data])
  const teacherMap = useMemo(() => Object.fromEntries((teachers.data || []).map(x => [x.userId || x.id, x])), [teachers.data])

  const [activePaymentForPay, setActivePaymentForPay] = useState(null)
  const [activeChat, setActiveChat] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)

  const getNormalizedStatus = (status) => {
    if (status === 'CANCELLED') return 'CANCELLED'
    if (status === 'PAID' || status === 'HELD' || status === 'RELEASED') return 'PAID'
    return 'PENDING'
  }

  const handleCancel = async (p) => {
    if (!window.confirm('Are you sure you want to cancel this class booking and payment?')) return
    setCancellingId(p.id)
    try {
      await api.cancelPayment(p.id)
      notify('Class booking and payment have been cancelled.')
      await payments.reload()
      await classes.reload()
    } catch (e) {
      notify(e.message)
    } finally {
      setCancellingId(null)
    }
  }

  const handlePaymentSuccess = async (message) => {
    notify(message || 'Payment successful! Your class is confirmed.')
    setActivePaymentForPay(null)
    await payments.reload()
    await classes.reload()
  }

  return (
    <div className="page-stack">
      <PageHero
        title="Payment history"
        subtitle="Track payment states, chat with teachers, cancel pending bookings, or confirm services via payment gateway."
      />

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 64, textAlign: 'center' }}>Chat</th>
                <th>Class</th>
                <th>Amount</th>
                <th>Gateway</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ minWidth: 195 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data || []).map(p => {
                const classItem = classMap[p.classId]
                const teacher = teacherMap[p.teacherId] || (classItem ? teacherMap[classItem.teacherId] : null)
                const normalizedStatus = getNormalizedStatus(p.status)

                return (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="chat-action-btn"
                        title="Chat with teacher (Demo)"
                        onClick={() => setActiveChat({ payment: p, classItem, teacher })}
                      >
                        <MessageCircle size={16} />
                      </button>
                    </td>
                    <td>
                      <strong>{classItem?.scheduledTime || 'Class session'}</strong>
                      <small>{teacher?.fullName ? `Teacher: ${teacher.fullName}` : `Class ID: ${p.classId?.slice(-6) || '—'}`}</small>
                    </td>
                    <td>
                      <strong style={{ color: '#eaf3ff' }}>৳{p.amount ?? '-'}</strong>
                    </td>
                    <td>
                      <span className="gateway-badge">{p.gateway || 'BKASH'}</span>
                    </td>
                    <td>
                      <StatusPill value={normalizedStatus} />
                    </td>
                    <td>
                      <div>{formatDate(p.createdAt)}</div>
                      {formatTime(p.createdAt) && (
                        <small style={{ color: 'var(--muted, #94a3b8)', fontSize: '11px', display: 'block', marginTop: 2 }}>
                          {formatTime(p.createdAt)}
                        </small>
                      )}
                    </td>
                    <td>
                      {normalizedStatus === 'PENDING' ? (
                        <div className="payment-action-group">
                          <button
                            type="button"
                            className="btn-pay-green"
                            onClick={() => setActivePaymentForPay({ payment: p, classItem, teacher })}
                          >
                            <CircleDollarSign size={14} /> Pay
                          </button>
                          <button
                            type="button"
                            className="btn-cancel-red"
                            disabled={cancellingId === p.id}
                            onClick={() => handleCancel(p)}
                          >
                            <X size={14} /> {cancellingId === p.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      ) : normalizedStatus === 'PAID' ? (
                        <span className="payment-confirmed-tag">
                          <CheckCircle2 size={14} /> Paid & Confirmed
                        </span>
                      ) : (
                        <span className="payment-cancelled-tag">
                          <Ban size={14} /> Cancelled
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!payments.loading && !payments.data?.length && (
          <EmptyState icon={WalletCards} title="No payments yet" text="Your class payment records will appear here." />
        )}
      </section>

      {activePaymentForPay && (
        <PaymentGatewayModal
          payment={activePaymentForPay.payment}
          classItem={activePaymentForPay.classItem}
          teacher={activePaymentForPay.teacher}
          onClose={() => setActivePaymentForPay(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {activeChat && (
        <DemoChatModal
          payment={activeChat.payment}
          classItem={activeChat.classItem}
          teacher={activeChat.teacher}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  )
}

function PaymentGatewayModal({ payment, classItem, teacher, onClose, onSuccess }) {
  const minAmount = Number(payment.amount || 100)
  const [amount, setAmount] = useState(minAmount)
  const [phone, setPhone] = useState('01812345678')
  const [trxId, setTrxId] = useState(() => 'BK' + Math.random().toString(36).substring(2, 9).toUpperCase())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePay = async (e) => {
    e.preventDefault()
    setError('')
    const payVal = Number(amount)
    if (isNaN(payVal) || payVal < minAmount) {
      setError(`Payment amount must be equal to or greater than ৳${minAmount}.`)
      return
    }
    if (!phone.trim()) {
      setError('Please provide a valid bKash number.')
      return
    }

    setSubmitting(true)
    try {
      await api.payPayment(payment.id, {
        amount: payVal,
        transactionId: trxId.trim(),
        gateway: 'BKASH',
        senderNumber: phone.trim()
      })
      onSuccess(`Payment of ৳${payVal} completed successfully! Your class is confirmed and teacher is notified.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="bKash Payment Gateway" onClose={onClose}>
      <form className="form" onSubmit={handlePay}>
        <div className="bkash-banner">
          <div className="bkash-badge">bKash</div>
          <div>
            <strong>Merchant Payment Checkout</strong>
            <small>Automated escrow verification</small>
          </div>
        </div>

        <div className="bkash-service-info">
          <div>
            <span>Service</span>
            <strong>{classItem?.scheduledTime || 'Academic Class'}</strong>
          </div>
          <div>
            <span>Teacher</span>
            <strong>{teacher?.fullName || 'SEU Teacher'}</strong>
          </div>
          <div>
            <span>Required Minimum</span>
            <strong style={{ color: '#70e6cf' }}>৳{minAmount}</strong>
          </div>
        </div>

        <Field
          label={`Pay Amount (BDT) — Minimum ৳${minAmount} required`}
          type="number"
          min={minAmount}
          step="1"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />

        <Field
          label="bKash Account Number"
          type="text"
          placeholder="01XXXXXXXXX"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />

        <div className="field">
          <span>Transaction ID (Simulation)</span>
          <div className="password-wrap">
            <input
              type="text"
              value={trxId}
              onChange={e => setTrxId(e.target.value)}
              required
            />
            <button
              type="button"
              style={{ width: 'auto', padding: '0 10px', fontSize: '11px', color: '#70e6cf' }}
              onClick={() => setTrxId('BK' + Math.random().toString(36).substring(2, 9).toUpperCase())}
            >
              New TrxID
            </button>
          </div>
        </div>

        <ErrorBox error={error} />

        <div className="bkash-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="primary btn-bkash-confirm" disabled={submitting}>
            {submitting ? <Spinner /> : <><Check size={16} /> Confirm & Pay ৳{amount}</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DemoChatModal({ payment, classItem, teacher, onClose }) {
  const teacherName = teacher?.fullName || 'Teacher'
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'teacher',
      text: `Hello! Looking forward to our class${classItem?.scheduledTime ? ` on ${classItem.scheduledTime}` : ''}. Feel free to drop any questions or topics you'd like to prepare for!`,
      time: '10:00 AM'
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const newMsg = {
      id: Date.now(),
      sender: 'student',
      text: input.trim(),
      time: 'Just now'
    }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'teacher',
          text: 'Got it! I will have everything ready for our session. (Demo mode: Real-time messaging will be linked soon)',
          time: 'Just now'
        }
      ])
    }, 1000)
  }

  return (
    <Modal title={`Chat with ${teacherName}`} onClose={onClose}>
      <div className="demo-chat-box">
        <div className="demo-chat-header-bar">
          <div className="demo-chat-user-info">
            <div className="profile-avatar" style={{ width: 34, height: 34, borderRadius: 10 }}>
              {teacher?.profileImage ? (
                <img src={fileUrl(teacher.profileImage)} alt="" />
              ) : (
                initials(teacherName)
              )}
            </div>
            <div>
              <strong>{teacherName}</strong>
              <small><span className="chat-online-dot" /> Active now (Demo)</small>
            </div>
          </div>
          <span className="demo-chat-pill">Demo Chat</span>
        </div>

        <div className="demo-chat-body">
          <div className="demo-chat-notice">
            <span>Direct student-teacher chat demo for class #{payment?.classId?.slice(-6) || 'session'}</span>
          </div>
          {messages.map(m => (
            <div key={m.id} className={`chat-bubble-row ${m.sender === 'student' ? 'me' : 'them'}`}>
              <div className={`chat-bubble ${m.sender === 'student' ? 'bubble-me' : 'bubble-them'}`}>
                <p style={{ margin: 0 }}>{m.text}</p>
                <small>{m.time}</small>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="chat-bubble-row them">
              <div className="chat-bubble bubble-them typing-indicator">
                <span>{teacherName} is typing...</span>
              </div>
            </div>
          )}
        </div>

        <form className="demo-chat-footer" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="primary small" disabled={!input.trim()}>
            <Send size={15} /> Send
          </button>
        </form>
      </div>
    </Modal>
  )
}

function ReviewsPage({ auth }) {
  const data = useLoad(api.myReviews, [auth?.userId])
  const apiList = Array.isArray(data.data) ? data.data : []
  const localList = readStoredReviews().filter(review => review.studentId === auth?.userId)

  const map = new Map()
  apiList.forEach(r => map.set(r.classId || r.id, r))
  localList.forEach(r => {
    const key = r.classId || r.id
    if (!map.has(key)) map.set(key, r)
  })
  const items = Array.from(map.values())

  return (
    <div className="page-stack">
      <PageHero
        title="Your reviews"
        subtitle="Reviews you have submitted for your classes."
      />
      <section className="review-grid">
        {items.map(x => (
          <article className="review-card" key={x.id}>
            <div className="review-top">
              <div>
                <b>{x.teacherName || 'Teacher'}</b>
                <small>{formatDate(x.createdAt)}</small>
              </div>
              <Stars value={x.rating} />
            </div>
            <p>{x.comment}</p>
            <small className="muted">Class: {x.classId}</small>
          </article>
        ))}
      </section>
      {!data.loading && !items.length && (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          text="After accepting a teacher and completing the class, you can rate and review them from Service taken."
        />
      )}
    </div>
  )
}

function TeacherReviewsPage() {
  const profile = useLoad(api.teacherProfile, [])
  const teacherId = profile.data?.userId || profile.data?.id
  const data = useLoad(api.myTeacherReviews, [teacherId])
  const apiList = Array.isArray(data.data) ? data.data : []
  const localList = readStoredReviews().filter(review => review.teacherId === teacherId)

  const map = new Map()
  apiList.forEach(r => map.set(r.classId || r.id, r))
  localList.forEach(r => {
    const key = r.classId || r.id
    if (!map.has(key)) map.set(key, r)
  })
  const reviews = Array.from(map.values())

  const totalReviewsCount = profile.data?.totalReviews || reviews.length

  return (
    <div className="page-stack">
      <PageHero
        title="Student reviews"
        subtitle="Feedback and ratings submitted by students for your classes."
      />
      <section className="review-summary panel">
        <div
          className="rating-ring big"
          style={{ '--rating': `${Number(profile.data?.rating || 0) / 5 * 100}%` }}
        >
          <strong>{Number(profile.data?.rating || 0).toFixed(1)}</strong>
          <span>/ 5</span>
        </div>
        <div>
          <span className="eyebrow">CURRENT RATING</span>
          <h2>{totalReviewsCount} student reviews</h2>
        </div>
      </section>
      <section className="review-grid">
        {reviews.map(x => (
          <article className="review-card" key={x.id}>
            <div className="review-top">
              <div>
                <b>{x.studentName || 'Student'}</b>
                <small>{formatDate(x.createdAt)}</small>
              </div>
              <Stars value={x.rating} />
            </div>
            <p>{x.comment}</p>
            <small className="muted">Class: {x.classId}</small>
          </article>
        ))}
      </section>
      {!data.loading && !reviews.length && (
        <EmptyState
          icon={Star}
          title="No student reviews yet"
          text="When students complete classes and submit reviews, their feedback will appear here."
        />
      )}
    </div>
  )
}

function TeacherApplyPage({ notify, busy }) {
  const profile = useLoad(api.studentProfile, []), completion = useLoad(api.completion, []), app = useLoad(api.myTeacherApplication, [])
  const [cv, setCv] = useState(null), [form, setForm] = useState({ qualification: '', experience: '', subjects: '', motivation: '', currentCgpa: '', semester: '', batch: '' }), [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const update = (k, v) => setForm(x => ({ ...x, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setError('')
    if ((completion.data || 0) < 80) return setError('Complete at least 80% of your student profile first.')
    if (Number(form.currentCgpa) < 3.8) return setError('Minimum CGPA is 3.80 to apply as a teacher.')
    if (!cv) return setError('Upload your CV first.')

    setSubmitting(true)

    try {
      const cvUrl = await busy(() => api.uploadCv(cv))
      await busy(() => api.applyTeacher({
        ...form,
        currentCgpa: Number(form.currentCgpa),
        subjects: form.subjects.split(',').map(x => x.trim()).filter(Boolean),
        batch: form.batch || profile.data?.batch,
        cvUrl
      }))
      notify('Teacher application submitted for admin review.')
      setCv(null)
      app.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelApplication = async () => {
    setError('')
    setSubmitting(true)

    try {
      await busy(() => api.cancelTeacherApplication())
      notify('Teacher application cancelled.')
      app.reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const rawApplication = app.data
  const existing = ['PENDING', 'REJECTED', 'APPROVED'].includes(rawApplication?.status) ? rawApplication : null
  const pending = existing?.status === 'PENDING'
  const rejected = existing?.status === 'REJECTED'
  const approved = existing?.status === 'APPROVED'

  return <div className="page-stack">
    <PageHero title="Become a teacher" subtitle="Your application goes to the admin panel for CV review and interview."/>
    <section className="panel application-banner">
      <div className="requirement">
        <div className="requirement-icon"><ShieldCheck size={21}/></div>
        <div><b>Eligibility</b><p>At least 80% profile completion and a minimum 3.80 CGPA.</p></div>
      </div>
      <div className="completion-meter">
        <strong>{completion.data || 0}%</strong>
        <span>profile complete</span>
        <div className="progress"><i style={{ width: `${completion.data || 0}%` }}/></div>
      </div>
    </section>

    {pending && <section className="panel application-status">
      <div>
        <span className="eyebrow">APPLICATION PENDING</span>
        <h3>Waiting for admin review</h3>
        <p>Submitted {formatDate(existing.submittedAt)}. Your CV and application are under review.</p>
      </div>
      <div className="application-status-actions">
        <StatusPill value="PENDING"/>
        <button className="danger small" type="button" onClick={cancelApplication} disabled={submitting}>Cancel application</button>
      </div>
    </section>}

    {rejected && <section className="panel application-status">
      <div>
        <span className="eyebrow">APPLICATION REJECTED</span>
        <h3>You can apply again</h3>
        <p>Your previous application was rejected. Update your information and submit a new application.</p>
      </div>
      <StatusPill value="REJECTED"/>
    </section>}

    {approved && <section className="panel application-status">
      <div>
        <span className="eyebrow">APPLICATION APPROVED</span>
        <h3>You are now a teacher</h3>
        <p>Your teacher profile has been activated by the admin.</p>
      </div>
      <StatusPill value="APPROVED"/>
    </section>}

    {!pending && !approved && <section className="panel form-panel">
      <div className="section-heading">
        <div><span className="eyebrow">{rejected ? 'APPLY AGAIN' : 'TEACHER APPLICATION'}</span><h2>{rejected ? 'Submit a new application' : 'Apply to become a teacher'}</h2><p>Complete all required information and upload your CV before submitting.</p></div>
      </div>
      <form className="form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Qualification" value={form.qualification} onChange={e => update('qualification', e.target.value)} placeholder="e.g. BSc in CSE" required/>
          <Field label="Experience" value={form.experience} onChange={e => update('experience', e.target.value)} placeholder="e.g. 2 years peer tutoring" required/>
          <Field label="Current CGPA" type="number" step="0.01" min="0" max="4" value={form.currentCgpa} onChange={e => update('currentCgpa', e.target.value)} placeholder="3.80" required/>
          <Field label="Semester" value={form.semester} onChange={e => update('semester', e.target.value)} placeholder="e.g. 7th" required/>
          <Field label="Batch" value={form.batch || profile.data?.batch || ''} onChange={e => update('batch', e.target.value)} placeholder="e.g. 64" required/>
          <Field label="Subjects" value={form.subjects} onChange={e => update('subjects', e.target.value)} placeholder="DBMS, Java, Data Mining" required/>
        </div>
        <TextArea label="Motivation" value={form.motivation} onChange={e => update('motivation', e.target.value)} placeholder="Why should students choose you?" required/>
        <label className="upload-card">
          <Upload size={21}/>
          <div><b>{cv ? cv.name : 'Upload your CV'}</b><span>PDF, DOC or DOCX</span></div>
          <input type="file" accept=".pdf,.doc,.docx" onChange={e => setCv(e.target.files?.[0] || null)}/>
        </label>
        <ErrorBox error={error}/>
        <button className="primary" disabled={submitting || !profile.data}>{submitting ? <Spinner/> : <>{rejected ? 'Apply again' : 'Submit application'} <ArrowRight size={16}/></>}</button>
      </form>
    </section>}
  </div>
}

function ProfilePage({ auth, notify, busy }) {
  const student = useLoad(api.studentProfile, []), completion = useLoad(api.completion, []), teacher = useLoad(auth.role === 'TEACHER' ? api.teacherProfile : async () => null, [auth.role])
  const [form, setForm] = useState({ fullName: '', phone: '', profileImage: '', department: '', program: '', batch: '', location: '', bio: '', qualification: '', experience: '', subjects: '', hourlyRate: '', teachingMode: '', availability: '' }), [file, setFile] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  useEffect(() => { const p = student.data || {}; const t = teacher.data || {}; setForm({ fullName: p.fullName || '', phone: p.phone || '', profileImage: p.profileImage || '', department: p.department || '', program: p.program || '', batch: p.batch || '', location: p.location || '', bio: p.bio || '', qualification: t.qualification || '', experience: t.experience || '', subjects: (t.subjects || []).join(', '), hourlyRate: t.hourlyRate || '', teachingMode: t.teachingMode || '', availability: t.availability || '' }) }, [student.data, teacher?.data])
  const set = (k, v) => setForm(x => ({ ...x, [k]: v }))
  const save = async e => {
    e.preventDefault()
    setError('')

    // Validation
    const cleanPhone = (form.phone || '').replace(/\D/g, '')
    if (cleanPhone.length !== 11) {
      return setError('Phone number must be exactly 11 numeric digits (e.g. 017XXXXXXXX).')
    }
    if (!cleanPhone.startsWith('01')) {
      return setError('Phone number must start with a valid Bangladeshi prefix (01XXXXXXXXX).')
    }
    if (!form.fullName || form.fullName.trim().length < 3) {
      return setError('Full name must be at least 3 characters long.')
    }
    if (!form.department) {
      return setError('Please select your academic department.')
    }
    if (!form.batch || !form.batch.trim()) {
      return setError('Please enter your batch.')
    }
    if (!form.program) {
      return setError('Please select your program.')
    }

    setSaving(true)
    try {
      let image = form.profileImage
      if (file) image = await api.uploadProfile(file)
      const studentPayload = { fullName: form.fullName.trim(), phone: cleanPhone, profileImage: image, department: form.department, program: form.program, batch: form.batch.trim(), location: form.location?.trim() || '', bio: form.bio?.trim() || '' }
      await api.updateStudentProfile(studentPayload)
      if (auth.role === 'TEACHER') {
        await api.updateTeacherProfile({ ...studentPayload, qualification: form.qualification?.trim(), experience: form.experience?.trim(), subjects: form.subjects.split(',').map(x => x.trim()).filter(Boolean), hourlyRate: Number(form.hourlyRate) || null, teachingMode: form.teachingMode?.trim(), availability: form.availability?.trim() })
      }
      setForm(x => ({ ...x, phone: cleanPhone, profileImage: image }))
      setFile(null)
      await student.reload()
      await completion.reload()
      if (auth.role === 'TEACHER') await teacher.reload()
      window.dispatchEvent(new CustomEvent('seutoppers-profile-updated', {
        detail: { ...studentPayload }
      }))
      notify('Profile saved successfully.')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }
  const image = file ? URL.createObjectURL(file) : fileUrl(form.profileImage)
  return <div className="page-stack profile-page"><PageHero title="My profile" subtitle="Keep your student information complete. Teachers can also manage their teaching identity here."/><form onSubmit={save}><div className="profile-layout"><section className="panel"><div className="profile-photo-row"><div className="profile-avatar xl">{image ? <img src={image} alt="Profile"/> : initials(form.fullName)}</div><div><h3>{form.fullName || 'Your profile'}</h3><p className="muted">{completion.data || 0}% complete</p><label className="upload-button"><Upload size={16}/> Upload profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    if (selectedFile) {
      const previewUrl = URL.createObjectURL(selectedFile)
      window.dispatchEvent(new CustomEvent('seutoppers-profile-updated', {
        detail: { ...student.data, fullName: form.fullName, profileImage: previewUrl }
      }))
    }
  }}/></label><small className="hint">PNG, JPG or WEBP</small></div></div><div className="form-grid">
    <Field label="Full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} required/>
    <div>
      <Field label="Phone (11 digits, numbers only)" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="01XXXXXXXXX" required/>
      <div className={`phone-field-info ${form.phone.length === 11 && form.phone.startsWith('01') ? 'valid' : form.phone.length > 0 ? 'invalid' : ''}`}>
        <span>{form.phone.length === 11 && form.phone.startsWith('01') ? '✓ Valid Bangladeshi number' : 'Must be 11 digits starting with 01'}</span>
        <b>{form.phone.length}/11</b>
      </div>
    </div>
    <SelectField label="Department" value={form.department} onChange={e => set('department', e.target.value)} options={departments}/>
    <Field label="Batch" value={form.batch} onChange={e => set('batch', e.target.value)} placeholder="e.g. 54" required/>
    <SelectField label="Program" value={form.program} onChange={e => set('program', e.target.value)} options={programs}/>
    <Field label="Location (Optional)" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Tejgaon, Dhaka"/>
  </div>
  <TextArea label="Bio (Optional)" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the SEU community a little about you (optional)."/>
  </section><aside className="profile-side"><section className="panel completion-card"><span className="eyebrow">PROFILE COMPLETION</span><div className="completion-number">{completion.data || 0}%</div><div className="progress"><i style={{ width: `${completion.data || 0}%` }}/></div><p>{(completion.data || 0) >= 80 ? 'You can post help requests and apply to become a teacher.' : 'Reach 80% to unlock help requests and teacher applications.'}</p></section>{auth.role === 'TEACHER' && <section className="panel"><SectionHeading title="Teaching profile" subtitle="Visible to students when they visit your teacher profile."/><div className="form"><Field label="Qualification" value={form.qualification} onChange={e => set('qualification', e.target.value)}/><Field label="Experience" value={form.experience} onChange={e => set('experience', e.target.value)}/><Field label="Subjects" value={form.subjects} onChange={e => set('subjects', e.target.value)} placeholder="Java, DBMS, AI"/><div className="form-grid"><Field label="Hourly rate" type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)}/><Field label="Teaching mode" value={form.teachingMode} onChange={e => set('teachingMode', e.target.value)} placeholder="Online / Offline"/></div><Field label="Availability" value={form.availability} onChange={e => set('availability', e.target.value)} placeholder="Evening, weekends"/></div></section>}<section className="panel privacy-card"><LockKeyhole size={18}/><div><b>Profile privacy</b><p>Best-effort browser privacy is enabled on this page. Browsers cannot guarantee screenshot prevention.</p></div></section></aside></div><div className="save-row"><ErrorBox error={error}/><button className="secondary" type="button" onClick={() => student.reload()}><RefreshCw size={16}/> Refresh</button><button className="primary" disabled={saving}>{saving ? <Spinner/> : <><Check size={16}/> Save profile</>}</button></div></form></div>
}

function AdminPage({ page, auth, go, notify, busy, notifications }) {
  if (page === 'admin-applications') return <AdminApplications notify={notify} busy={busy}/>
  if (page === 'admin-payments') return <AdminPayments notify={notify}/>
  if (page === 'admin-classes') return <AdminClasses/>
  if (page === 'admin-teachers') return <AdminTeachers notify={notify}/>
  if (page === 'admin-students') return <AdminStudents notify={notify}/>
  return <AdminDashboard go={go}/>
}

function AdminDashboard({ go }) {
  const teachers = useLoad(api.teachers, [])
  const apps = useLoad(api.pendingApplications, [])
  const payments = useLoad(api.adminPayments, [])
  const classes = useLoad(api.adminClasses, [])
  const [selectedTeacher, setSelectedTeacher] = useState(null)

  const top = useMemo(() => {
    const list = Array.isArray(teachers.data) ? teachers.data : []

    return [...list]
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        .slice(0, 4)
  }, [teachers.data])

  if (selectedTeacher) {
    return (
        <TeacherProfileView
            teacher={selectedTeacher}
            onBack={() => setSelectedTeacher(null)}
            auth={{ role: 'ADMIN' }}
        />
    )
  }

  return (
      <div className="page-stack">
        <PageHero
            title="Admin control center"
            subtitle="A separate operations workspace for the SEU platform."
            action={{
              label: 'Review applications',
              onClick: () => go('admin-applications')
            }}
        />

        <div className="stat-grid">
          <StatCard
              label="Pending applications"
              value={apps.data?.length || 0}
              icon={ClipboardList}
          />
          <StatCard
              label="Teachers"
              value={teachers.data?.length || 0}
              icon={Users}
          />
          <StatCard
              label="Payments"
              value={payments.data?.length || 0}
              icon={WalletCards}
          />
          <StatCard
              label="Classes"
              value={classes.data?.length || 0}
              icon={CalendarDays}
          />
        </div>

        <section className="section">
          <SectionHeading
              title="Top ranked teachers"
              subtitle="Click any teacher to view the full profile."
          />

          <div className="teacher-grid">
            {teachers.loading ? (
                <SkeletonCards />
            ) : (
                top.map((t, i) => (
                    <TeacherCard
                        key={t.id}
                        teacher={t}
                        rank={i + 1}
                        onOpen={() => setSelectedTeacher(t)}
                    />
                ))
            )}
          </div>

          {!teachers.loading && !top.length && (
              <EmptyState
                  icon={Users}
                  title="No teachers found"
                  text="No approved teachers are available yet."
              />
          )}
        </section>

        <div className="dashboard-grid">
          <AdminQuick
              title="Teacher applications"
              value={apps.data?.length || 0}
              action="Open applications"
              onClick={() => go('admin-applications')}
              icon={ClipboardList}
          />

          <AdminQuick
              title="Payment history"
              value={payments.data?.length || 0}
              action="Open payments"
              onClick={() => go('admin-payments')}
              icon={WalletCards}
          />
        </div>
      </div>
  )
}

function AdminApplications({ notify, busy }) {
  const data = useLoad(api.pendingApplications, [])
  const act = async (id, approve) => { try { await busy(() => approve ? api.approveApplication(id) : api.rejectApplication(id)); notify(approve ? 'Teacher application approved.' : 'Teacher application rejected.'); data.reload() } catch (e) { notify(e.message) } }
  return <div className="page-stack"><PageHero title="Teacher applications" subtitle="Review CVs and application details before approval."/><div className="admin-list">{data.data?.map(a => <article className="application-card" key={a.id}><div className="application-main"><div className="avatar square"><FileText size={19}/></div><div><span className="eyebrow">PENDING</span><h3>{a.qualification}</h3><p>{(a.subjects || []).join(' · ')}</p><div className="application-meta"><span>CGPA {a.currentCgpa}</span><span>{a.semester}</span><span>Batch {a.batch}</span><span>{formatDate(a.submittedAt)}</span></div></div></div><div className="application-actions"><a className="secondary small" href={fileUrl(a.cvUrl)} target="_blank" rel="noreferrer"><Eye size={15}/> View CV</a><button className="danger small" onClick={() => act(a.id, false)}>Reject</button><button className="primary small" onClick={() => act(a.id, true)}>Approve</button></div></article>)}{!data.loading && !data.data?.length && <EmptyState icon={ClipboardList} title="No pending applications" text="New teacher applications will appear here."/>}</div></div>
}

function AdminPayments() {
  const data = useLoad(api.adminPayments, [])
  const list = Array.isArray(data.data) ? data.data : []

  return (
    <div className="page-stack">
      <PageHero
        title="Payment history"
        subtitle="All confirmed and paid transactions across the platform."
      />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paid by (Student)</th>
                <th>Paid to (Teacher)</th>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Gateway</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.studentName || 'Student'}</strong>
                    <small>{p.studentEmail || p.studentId}</small>
                  </td>
                  <td>
                    <strong>{p.teacherName || 'Teacher'}</strong>
                    <small>{p.teacherEmail || p.teacherId}</small>
                  </td>
                  <td>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 7px', borderRadius: 6, color: '#70e6cf', fontSize: '11px' }}>
                      {p.transactionId || '—'}
                    </code>
                  </td>
                  <td>
                    <strong style={{ color: '#eaf3ff' }}>৳{p.amount ?? '-'}</strong>
                  </td>
                  <td>
                    <span className="gateway-badge">{p.gateway || 'BKASH'}</span>
                  </td>
                  <td>
                    <StatusPill value={p.status || 'PAID'} />
                  </td>
                  <td>
                    <div>{formatDate(p.createdAt)}</div>
                    {formatTime(p.createdAt) && (
                      <small style={{ color: 'var(--muted, #94a3b8)', fontSize: '11px', display: 'block', marginTop: 2 }}>
                        {formatTime(p.createdAt)}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.loading && !list.length && (
          <EmptyState
            icon={WalletCards}
            title="No transactions yet"
            text="Completed student payments will appear here."
          />
        )}
      </section>
    </div>
  )
}

function AdminClasses() {
  const data = useLoad(api.adminClasses, [])
  const list = Array.isArray(data.data) ? data.data : []

  return (
    <div className="page-stack">
      <PageHero
        title="Class history"
        subtitle="All class bookings and sessions recorded across the platform."
      />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Class ID</th>
                <th>Student</th>
                <th>Teacher</th>
                <th>Scheduled</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id}>
                  <td>
                    <strong>#{c.id?.slice(-6) || c.id}</strong>
                  </td>
                  <td>
                    <strong>{c.studentName || 'Student'}</strong>
                    <small>{c.studentEmail || c.studentId}</small>
                  </td>
                  <td>
                    <strong>{c.teacherName || 'Teacher'}</strong>
                    <small>{c.teacherEmail || c.teacherId}</small>
                  </td>
                  <td>{c.scheduledTime || 'Time not set'}</td>
                  <td>
                    <strong style={{ color: '#eaf3ff' }}>৳{c.amount ?? '-'}</strong>
                  </td>
                  <td>
                    <StatusPill value={c.status} />
                  </td>
                  <td>
                    <div>{formatDate(c.createdAt)}</div>
                    {formatTime(c.createdAt) && (
                      <small style={{ color: 'var(--muted, #94a3b8)', fontSize: '11px', display: 'block', marginTop: 2 }}>
                        {formatTime(c.createdAt)}
                      </small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.loading && !list.length && (
          <EmptyState
            icon={CalendarDays}
            title="No classes recorded"
            text="Class bookings will appear here."
          />
        )}
      </section>
    </div>
  )
}

function AdminTeachers({ notify }) {
  const data = useLoad(api.teachers, [])
  const teachers = Array.isArray(data.data) ? data.data : []

  return (
      <div className="page-stack">
        <PageHero
            title="Teacher list"
            subtitle="Current teacher profiles from the backend."
        />

        <div className="teacher-grid large">
          {data.loading ? (
              <SkeletonCards />
          ) : (
              teachers.map(t => (
                  <AdminTeacherCard
                      key={t.id}
                      teacher={t}
                      notify={notify}
                      reload={data.reload}
                  />
              ))
          )}
        </div>

        {!data.loading && !teachers.length && (
            <EmptyState
                icon={Users}
                title="No teachers found"
                text="No approved teacher profiles are available yet."
            />
        )}
      </div>
  )
}

function AdminStudents({ notify }) {
  const data = useLoad(api.adminStudents, [])
  const students = Array.isArray(data.data) ? data.data : []

  return (
      <div className="page-stack">
        <PageHero
            title="Student list"
            subtitle="All student accounts on the platform, including approved teachers."
        />

        <div className="student-grid">
          {data.loading ? (
              <SkeletonCards />
          ) : (
              students.map(s => (
                  <AdminStudentCard
                      key={s.userId}
                      student={s}
                      notify={notify}
                      reload={data.reload}
                  />
              ))
          )}
        </div>

        {!data.loading && !students.length && (
            <EmptyState
                icon={UserRound}
                title="No students found"
                text="No student accounts are available yet."
            />
        )}
      </div>
  )
}

function AdminTeacherCard({ teacher, reload, notify }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [days, setDays] = useState('7')
  const [busy, setBusy] = useState(false)

  const showNotify = message => {
    notify(message)
  }

  const ban = async () => {
    setBusy(true)
    try {
      await api.banUser(teacher.userId, Number(days))
      showNotify('Teacher banned successfully.')
      setBanOpen(false)
      reload()
    } catch (e) {
      showNotify(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.removeUser(teacher.userId)
      showNotify('Teacher removed permanently.')
      setRemoveOpen(false)
      reload()
    } catch (e) {
      showNotify(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
      <>
        <article className="teacher-card admin-user-card">
          <div className="teacher-top">
            <div className="profile-avatar">
              {teacher.profileImage ? (
                  <img src={fileUrl(teacher.profileImage)} alt="" />
              ) : (
                  initials(teacher.fullName)
              )}
            </div>
            <div className="rank">Teacher</div>
          </div>

          <h3>{teacher.fullName || 'Teacher'}</h3>
          <p>{teacher.qualification || teacher.program || teacher.department || 'SEU teacher'}</p>

          <div className="chips small-chips">
            {(teacher.subjects || []).slice(0, 3).map(x => (
                <span key={x}>{x}</span>
            ))}
          </div>

          <div className="teacher-bottom">
          <span>
            <Star size={14} fill="currentColor" />
            {Number(teacher.rating || 0).toFixed(1)}
          </span>
            <span>{teacher.totalReviews || 0} reviews</span>
          </div>

          <div className="admin-card-actions">
            <button className="secondary small" onClick={() => setProfileOpen(true)}>
              <Eye size={15} /> View
            </button>
            <button className="secondary small" onClick={() => setBanOpen(true)}>
              <Ban size={15} /> Ban
            </button>
            <button className="danger small" onClick={() => setRemoveOpen(true)}>
              <X size={15} /> Remove
            </button>
          </div>
        </article>

        {profileOpen && (
            <Modal title="Teacher profile" onClose={() => setProfileOpen(false)}>
              <div className="admin-profile-modal">
                <div className="profile-avatar xl">
                  {teacher.profileImage ? (
                      <img src={fileUrl(teacher.profileImage)} alt="" />
                  ) : (
                      initials(teacher.fullName)
                  )}
                </div>
                <InfoRow label="Name" value={teacher.fullName || '—'} />
                <InfoRow label="Department" value={teacher.department || '—'} />
                <InfoRow label="Program" value={teacher.program || '—'} />
                <InfoRow label="Batch" value={teacher.batch || '—'} />
                <InfoRow label="Qualification" value={teacher.qualification || '—'} />
                <InfoRow label="Experience" value={teacher.experience || '—'} />
                <InfoRow label="Teaching mode" value={teacher.teachingMode || '—'} />
                <InfoRow label="Availability" value={teacher.availability || '—'} />
                <InfoRow label="Hourly rate" value={teacher.hourlyRate ? `৳${teacher.hourlyRate}` : '—'} />
                <InfoRow label="Rating" value={`${Number(teacher.rating || 0).toFixed(1)} / 5`} />
              </div>
            </Modal>
        )}

        {banOpen && (
            <Modal title="Ban teacher" onClose={() => !busy && setBanOpen(false)}>
              <div className="form">
                <p className="muted">
                  The teacher will not be able to log in or access the platform during the selected period.
                </p>
                <SelectField
                    label="Ban duration"
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    options={['1', '3', '7', '14', '30', '90']}
                />
                <div className="form-actions">
                  <button className="secondary" onClick={() => setBanOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="danger" onClick={ban} disabled={busy}>
                    {busy ? <Spinner /> : `Ban for ${days} days`}
                  </button>
                </div>
              </div>
            </Modal>
        )}

        {removeOpen && (
            <Modal title="Remove teacher" onClose={() => !busy && setRemoveOpen(false)}>
              <div className="form">
                <div className="warning-box">
                  <AlertCircle size={20} />
                  <div>
                    <strong>This action is permanent.</strong>
                    <p>The teacher account, profile and related teacher application will be permanently removed.</p>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="secondary" onClick={() => setRemoveOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="danger" onClick={remove} disabled={busy}>
                    {busy ? <Spinner /> : 'Yes, remove permanently'}
                  </button>
                </div>
              </div>
            </Modal>
        )}
      </>
  )
}

function AdminStudentCard({ student, notify, reload }) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [days, setDays] = useState('7')
  const [busy, setBusy] = useState(false)

  const ban = async () => {
    setBusy(true)
    try {
      await api.banUser(student.userId, Number(days))
      notify('Student banned successfully.')
      setBanOpen(false)
      reload()
    } catch (e) {
      notify(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.removeUser(student.userId)
      notify('Student removed permanently.')
      setRemoveOpen(false)
      reload()
    } catch (e) {
      notify(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
      <>
        <article className="student-card admin-user-card">
          <div className="profile-avatar">
            {student.profileImage ? (
                <img src={fileUrl(student.profileImage)} alt="" />
            ) : (
                initials(student.fullName || student.email)
            )}
          </div>

          <div>
            <h3>{student.fullName || student.email || 'Student'}</h3>
            <p>
              {student.department || 'Department not set'}
              {student.batch ? ` · Batch ${student.batch}` : ''}
            </p>
            <span>{student.program || 'Program not set'}</span>
            {student.role === 'TEACHER' && <span className="role-tag">Teacher</span>}
          </div>

          <div className="admin-card-actions">
            <button className="secondary small" onClick={() => setProfileOpen(true)}>
              <Eye size={15} /> View
            </button>
            <button className="secondary small" onClick={() => setBanOpen(true)}>
              <Ban size={15} /> Ban
            </button>
            <button className="danger small" onClick={() => setRemoveOpen(true)}>
              <X size={15} /> Remove
            </button>
          </div>
        </article>

        {profileOpen && (
            <Modal title="Student profile" onClose={() => setProfileOpen(false)}>
              <div className="admin-profile-modal">
                <div className="profile-avatar xl">
                  {student.profileImage ? (
                      <img src={fileUrl(student.profileImage)} alt="" />
                  ) : (
                      initials(student.fullName || student.email)
                  )}
                </div>
                <InfoRow label="Name" value={student.fullName || '—'} />
                <InfoRow label="Email" value={student.email || '—'} />
                <InfoRow label="Role" value={student.role || '—'} />
                <InfoRow label="Department" value={student.department || '—'} />
                <InfoRow label="Program" value={student.program || '—'} />
                <InfoRow label="Batch" value={student.batch || '—'} />
                <InfoRow label="Phone" value={student.phone || '—'} />
                <InfoRow label="Location" value={student.location || '—'} />
                <InfoRow label="Bio" value={student.bio || '—'} />
              </div>
            </Modal>
        )}

        {banOpen && (
            <Modal title="Ban student" onClose={() => !busy && setBanOpen(false)}>
              <div className="form">
                <p className="muted">
                  The student will not be able to log in or access the platform during the selected period.
                </p>
                <SelectField
                    label="Ban duration"
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    options={['1', '3', '7', '14', '30', '90']}
                />
                <div className="form-actions">
                  <button className="secondary" onClick={() => setBanOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="danger" onClick={ban} disabled={busy}>
                    {busy ? <Spinner /> : `Ban for ${days} days`}
                  </button>
                </div>
              </div>
            </Modal>
        )}

        {removeOpen && (
            <Modal title="Remove student" onClose={() => !busy && setRemoveOpen(false)}>
              <div className="form">
                <div className="warning-box">
                  <AlertCircle size={20} />
                  <div>
                    <strong>This action is permanent.</strong>
                    <p>The account and profile will be permanently removed.</p>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="secondary" onClick={() => setRemoveOpen(false)} disabled={busy}>
                    Cancel
                  </button>
                  <button className="danger" onClick={remove} disabled={busy}>
                    {busy ? <Spinner /> : 'Yes, remove permanently'}
                  </button>
                </div>
              </div>
            </Modal>
        )}
      </>
  )
}

function RequestCard({
                       item,
                       role,
                       isOwner,
                       canInterest,
                       interested,
                       onInterest,
                       onShowInterests,
                       message,
                       setMessage
                     }) {
  return (
      <article className="request-card">

        <div className="request-top">

          <div className="topic-icon">
            <MessageCircle size={19}/>
          </div>

          <div>
            <span className="eyebrow">
              {item.status}
            </span>

            <h3>{item.topic}</h3>
          </div>

          {canInterest && (
              <button
                  type="button"
                  aria-label={interested ? 'Remove interest' : 'Mark interest'}
                  title={interested ? 'Remove interest' : 'Mark interest'}
                  className={`request-interest-star ${interested ? 'marked' : ''}`}
                  onClick={onInterest}
              >
                <Star
                    size={22}
                    strokeWidth={2.2}
                    fill={interested ? 'currentColor' : 'none'}
                />
              </button>
          )}

        </div>

        <div className="request-requester" style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px' }}>
          <div
              className="profile-avatar request-student-avatar"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid rgba(112,230,207,0.35)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
          >
            {item.studentProfileImage ? (
                <img
                    src={fileUrl(item.studentProfileImage)}
                    alt={item.studentName || 'Requester'}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover'
                    }}
                />
            ) : (
                initials(item.studentName || 'Student')
            )}
          </div>

          <div>
            <b style={{ display: 'block', fontSize: 15, fontWeight: 750, color: '#eef6ff' }}>
              {item.studentName || 'Student'}
            </b>
          </div>
        </div>

        <p>
          {item.description}
        </p>

        <div className="request-meta">
          <span>
            <Clock3 size={14}/>
            {item.requestedTime}
          </span>

          <span>
            <BookOpen size={14}/>
            1 hour
          </span>

          <span>
            <CircleDollarSign size={14}/>
            ৳{item.budget || 100}
          </span>
        </div>

        {canInterest && item.status === 'OPEN' && (
            <>
              <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Short message to the student"
              />

              <button
                  className="primary full"
                  onClick={onInterest}
                  disabled={interested}
              >
                {interested ? 'Interest marked' : 'Show interest'}
                <ArrowRight size={15}/>
              </button>
            </>
        )}

        {isOwner && (
            <button
                className="secondary full"
                onClick={onShowInterests}
            >
              View interested teachers
            </button>
        )}

        {isOwner &&
            item.status === 'TEACHER_SELECTED' && (
                <div className="request-confirmed">
                  <CheckCircle2 size={16}/>
                  <span>
                    Teacher selected. Class and payment are confirmed.
                  </span>
                </div>
            )}

      </article>
  )
}

function InterestModal({ requestId, interests = [], requestOwnerId, currentUserId, onClose, onSelect }) {
  const [teachers, setTeachers] = useState([])
  const [profileTeacher, setProfileTeacher] = useState(null)

  const validInterests = useMemo(() => {
    return (interests || []).filter(item => {
      if (!item) return false
      if (requestOwnerId && item.teacherId === requestOwnerId) return false
      if (currentUserId && item.teacherId === currentUserId) return false
      return true
    })
  }, [interests, requestOwnerId, currentUserId])

  useEffect(() => {
    let active = true

    api.teachers()
        .then(data => {
          if (active) {
            setTeachers(Array.isArray(data) ? data : [])
          }
        })
        .catch(() => {
          if (active) setTeachers([])
        })

    return () => {
      active = false
    }
  }, [])

  const getTeacherProfile = teacherId =>
      teachers.find(
          teacher =>
              teacher.userId === teacherId ||
              teacher.id === teacherId
      ) || null

  if (profileTeacher) {
    const rating = Number(profileTeacher.rating || 0)
    const currentInterest = validInterests.find(
        item => item.teacherId === (profileTeacher.userId || profileTeacher.id)
    )

    return (
        <Modal title="Teacher Profile Details" onClose={onClose}>
          <div className="interest-profile-modal-view">
            <button
                type="button"
                className="secondary small"
                onClick={() => setProfileTeacher(null)}
                style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              ← Back to interested teachers
            </button>

            <div className="interest-profile-top-card">
              <div
                  className="profile-avatar large"
                  style={{
                    width: 76,
                    height: 76,
                    minWidth: 76,
                    borderRadius: 20,
                    overflow: 'hidden'
                  }}
              >
                {profileTeacher.profileImage ? (
                    <img
                        src={fileUrl(profileTeacher.profileImage)}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                    />
                ) : (
                    initials(profileTeacher.fullName || 'Teacher')
                )}
              </div>

              <div>
                <span className="eyebrow"><span className="eyebrow-dot" /> VERIFIED PEER TUTOR</span>
                <h2 style={{ fontSize: 20, margin: '4px 0 2px', fontWeight: 800 }}>{profileTeacher.fullName || 'Teacher'}</h2>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                  {profileTeacher.qualification ||
                      profileTeacher.program ||
                      'SEU Peer Tutor'}
                  {' · '}
                  {profileTeacher.department || 'SEU'}
                  {profileTeacher.batch ? ` · Batch ${profileTeacher.batch}` : ''}
                </p>
              </div>
            </div>

            <div className="interest-profile-metrics">
              <div className="interest-metric-box">
                <span>Rating</span>
                <strong style={{ color: '#ffd700' }}>★ {rating.toFixed(1)} / 5</strong>
              </div>
              <div className="interest-metric-box">
                <span>Reviews</span>
                <strong>{profileTeacher.totalReviews || 0} reviews</strong>
              </div>
              <div className="interest-metric-box">
                <span>Rate</span>
                <strong style={{ color: '#70e6cf' }}>{profileTeacher.hourlyRate ? `৳${profileTeacher.hourlyRate}/hr` : 'Flexible'}</strong>
              </div>
            </div>

            {(profileTeacher.subjects || []).length > 0 && (
              <div className="chips">
                {profileTeacher.subjects.map(subject => (
                    <span key={subject} style={{ background: 'rgba(112,230,207,0.08)', borderColor: 'rgba(112,230,207,0.25)', color: '#d2f9f1' }}>{subject}</span>
                ))}
              </div>
            )}

            {profileTeacher.bio && (
              <div className="interest-bio-box">
                <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: '#7ba1c7', fontWeight: 800, marginBottom: 4 }}>About</span>
                {profileTeacher.bio}
              </div>
            )}

            <section className="panel" style={{ padding: '14px 18px' }}>
              <SectionHeading
                  title="Teaching Specifications"
                  subtitle="Verified teacher information from their profile."
              />
              <InfoRow
                  label="Teaching mode"
                  value={profileTeacher.teachingMode || 'Online / Offline'}
              />
              <InfoRow
                  label="Availability"
                  value={profileTeacher.availability || 'Evening / Weekends'}
              />
              <InfoRow
                  label="Experience"
                  value={profileTeacher.experience || 'Active university peer tutor'}
              />
              <InfoRow
                  label="Location"
                  value={profileTeacher.location || 'Southeast University'}
              />
            </section>

            {currentInterest?.status === 'INTERESTED' ? (
                <button
                    type="button"
                    className="primary full"
                    onClick={() => onSelect(requestId, currentInterest.teacherId)}
                    style={{ padding: 12, fontSize: 14 }}
                >
                  Accept this teacher <Check size={16} />
                </button>
            ) : currentInterest?.status === 'SELECTED' ? (
                <div className="request-confirmed">
                  <CheckCircle2 size={16} />
                  <span>This teacher has already been accepted.</span>
                </div>
            ) : null}
          </div>
        </Modal>
    )
  }

  return (
      <Modal title="Interested teachers" onClose={onClose}>
        <div className="interest-list">
          {validInterests.map(item => {
            const teacher = getTeacherProfile(item.teacherId)
            const teacherRating = Number(teacher?.rating || 0)

            return (
                <article className="interest-item" key={item.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)' }}>
                  <div
                      className="profile-avatar"
                      style={{
                        width: 52,
                        height: 52,
                        minWidth: 52,
                        borderRadius: 16,
                        overflow: 'hidden'
                      }}
                  >
                    {teacher?.profileImage ? (
                        <img
                            src={fileUrl(teacher.profileImage)}
                            alt=""
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                        />
                    ) : (
                        initials(item.teacherName || 'Teacher')
                    )}
                  </div>

                  <div className="interest-main" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <b>{item.teacherName || 'Teacher'}</b>
                      {teacher && (
                        <span className="teacher-rating-pill" style={{ padding: '2px 8px', fontSize: 11 }}>
                          <Star size={12} fill="currentColor"/> {teacherRating.toFixed(1)} ({teacher.totalReviews || 0})
                        </span>
                      )}
                    </div>

                    {teacher?.department && (
                      <small className="muted" style={{ display: 'block', margin: '2px 0 6px', fontSize: 11 }}>
                        {teacher.qualification || teacher.program || 'Peer Tutor'} · {teacher.department}
                      </small>
                    )}

                    <p style={{ margin: '6px 0 10px', fontSize: 13, color: '#c3d5eb', fontStyle: 'italic' }}>
                      "{item.message || 'Interested in helping you with this course.'}"
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <StatusPill value={item.status} />

                      <div
                          className="interest-actions"
                          style={{
                            display: 'flex',
                            gap: 8,
                            marginLeft: 'auto'
                          }}
                      >
                        <button
                            type="button"
                            className="secondary small"
                            onClick={() => {
                              if (teacher) {
                                setProfileTeacher(teacher)
                              }
                            }}
                            disabled={!teacher}
                        >
                          <Eye size={14} />
                          View profile
                        </button>

                        {item.status === 'INTERESTED' && (
                            <button
                                type="button"
                                className="primary small"
                                onClick={() => onSelect(requestId, item.teacherId)}
                            >
                              <Check size={14} />
                              Accept teacher
                            </button>
                        )}

                        {item.status === 'SELECTED' && (
                            <span className="request-confirmed" style={{ fontSize: 11, padding: '4px 10px' }}>
                              <CheckCircle2 size={13} />
                              Accepted
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
            )
          })}

          {!validInterests.length && (
              <EmptyState
                  icon={Users}
                  title="No interests yet"
                  text="Interested teachers will appear here once they express interest in your request."
              />
          )}
        </div>
      </Modal>
  )
}

function BookingModal({ request, onClose, onDone }) { const [teacherId, setTeacherId] = useState(''), [time, setTime] = useState(request.requestedTime || ''), [amount, setAmount] = useState(request.budget || ''), [teachers, setTeachers] = useState([]), [error, setError] = useState(''); useEffect(() => { api.interests(request.id).then(setTeachers).catch(() => {}) }, [request.id]); const selected = teachers.find(x => x.status === 'SELECTED'); useEffect(() => { if (selected) setTeacherId(selected.teacherId) }, [selected]); const submit = async e => { e.preventDefault(); try { await api.createClass({ requestId: request.id, teacherId, scheduledTime: time, amount: Number(amount) }); onDone() } catch (e) { setError(e.message) } }; return <Modal title="Book your class" onClose={onClose}><form className="form" onSubmit={submit}><InfoRow label="Selected teacher" value={selected?.teacherName || 'Selected teacher'}/><Field label="Scheduled time" value={time} onChange={e => setTime(e.target.value)} required/><Field label="Amount (BDT)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required/><ErrorBox error={error}/><button className="primary full">Create class booking <ArrowRight size={16}/></button></form></Modal> }

function ClassCard({ item, teacher, auth, studentView, pendingReview, reviewed, onReview, notify }) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const isStarted = item.status === 'STARTED'
  const isCompleted = item.status === 'COMPLETED' || reviewed

  return <article className="class-card">
    <div className="class-icon"><CalendarDays size={19}/></div>
    <div className="class-main">
      <div className="class-heading">
        <div>
          <span className="eyebrow">{studentView ? 'SERVICE TAKEN' : 'CLASS'}</span>
          <h3>{teacher?.fullName || `Teacher ${item.teacherId?.slice(-5) || ''}`}</h3>
        </div>
        <StatusPill value={isCompleted ? 'COMPLETED' : item.status || 'PENDING'}/>
      </div>
      <div className="class-meta"><span>{item.scheduledTime || 'Time not set'}</span><span>৳{item.amount ?? '-'}</span><span>{formatDate(item.createdAt)}</span></div>
    </div>

    {studentView && !isCompleted && (
      isStarted ? (
        <button className="primary small" onClick={() => setReviewOpen(true)}>
          <Star size={15}/> Rate teacher
        </button>
      ) : (
        <button
          className="secondary small"
          disabled
          style={{ opacity: 0.55, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Teacher must start the class before you can review"
        >
          <Clock3 size={15}/> Rate teacher (Unmarked until started)
        </button>
      )
    )}

    {studentView && isCompleted && (
      <div className="request-confirmed">
        <CheckCircle2 size={16}/>
        <span>Review submitted. Class completed.</span>
      </div>
    )}

    {reviewOpen && (
      <ReviewModal
        classItem={item}
        teacher={teacher}
        auth={auth}
        onClose={() => setReviewOpen(false)}
        onDone={async message => {
          notify?.(message)
          await onReview?.()
        }}
      />
    )}
  </article>
}

function TeacherClassCard({ item, notify, reload }) {
  const student = typeof item.student === 'object' ? item.student : null
  const studentProfile = typeof item.studentProfile === 'object' ? item.studentProfile : null
  const studentName =
      item.studentName ||
      item.studentFullName ||
      student?.fullName ||
      student?.name ||
      studentProfile?.fullName ||
      studentProfile?.name ||
      `Student ${item.studentId?.slice(-5) || ''}`

  const action = async type => {
    try {
      if (type === 'start') {
        await api.startClass(item.id)
        notify('Class started. Student can now review and complete the class.')
      } else {
        await api.completeClass(item.id)
        notify('Class completed.')
      }
      reload()
    } catch (e) {
      notify(e.message)
    }
  }

  const isCompleted = item.status === 'COMPLETED'

  return <article className="class-card">
    <div className="class-icon"><GraduationCap size={19}/></div>
    <div className="class-main">
      <div className="class-heading">
        <div><span className="eyebrow">SERVICE GIVEN</span><h3>{studentName}</h3></div>
        <StatusPill value={isCompleted ? 'COMPLETED' : item.status || 'PENDING'}/>
      </div>
      <div className="class-meta"><span>{item.scheduledTime || 'Time not set'}</span><span>৳{item.amount ?? '-'}</span><span>{formatDate(item.createdAt)}</span></div>
    </div>
    <div className="button-row">
      {item.status === 'PAID' && (
        <button className="primary small" onClick={() => action('start')}>
          Start Class
        </button>
      )}
      {item.status === 'STARTED' && (
        <span className="status status-started" style={{ padding: '6px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Clock3 size={13} /> Class in progress
        </span>
      )}
      {isCompleted && (
        <div className="request-confirmed">
          <CheckCircle2 size={16}/>
          <span>Class completed & reviewed</span>
        </div>
      )}
    </div>
  </article>
}

function ReviewModal({ classItem, teacher, auth, onClose, onDone }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setError('')
    try {
      await api.reviewClass(classItem.id, { rating, comment })
      storeReview({
        id: `${classItem.id}-${Date.now()}`,
        classId: classItem.id,
        teacherId: classItem.teacherId,
        teacherName: teacher?.fullName || 'Teacher',
        studentId: auth.userId,
        studentName: classItem.studentName || auth.email?.split('@')[0] || 'Student',
        rating,
        comment,
        createdAt: new Date().toISOString()
      })
      await onDone?.('Review submitted successfully. The class is now marked reviewed.')
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  return <Modal title={`Review ${teacher?.fullName || 'teacher'}`} onClose={onClose}>
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Rating</span>
        <div className="rating-picker">{[1,2,3,4,5].map(x => <button type="button" key={x} className={x <= rating ? 'selected' : ''} onClick={() => setRating(x)}><Star size={23} fill="currentColor"/></button>)}</div>
      </label>
      <TextArea label="Review" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience." required/>
      <ErrorBox error={error}/>
      <button className="primary full">Submit review <Check size={16}/></button>
    </form>
  </Modal>
}

function TeacherCard({ teacher, rank, onOpen }) {
  const rating = Number(teacher.rating || 0)
  const rankClass = rank === 1 ? 'teacher-rank-1' : rank === 2 ? 'teacher-rank-2' : rank === 3 ? 'teacher-rank-3' : 'teacher-rank-other'

  return (
      <article
          className="teacher-card-cool"
          onClick={onOpen}
          style={{ cursor: onOpen ? 'pointer' : 'default' }}
      >
        <div>
          <div className="teacher-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="profile-avatar" style={{ width: 48, height: 48, borderRadius: 14 }}>
              {teacher.profileImage ? (
                  <img src={fileUrl(teacher.profileImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
              ) : (
                  initials(teacher.fullName)
              )}
            </div>
            <div className={`teacher-rank-tag ${rankClass}`}>
              {rank === 1 ? '★ #1 Top Rated' : rank ? `#${rank} Ranked` : 'Teacher'}
            </div>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 750, margin: '4px 0 2px' }}>{teacher.fullName || 'Teacher'}</h3>

          <p className="muted" style={{ fontSize: 12, margin: '0 0 10px' }}>
            {teacher.qualification ||
                teacher.program ||
                teacher.department ||
                'SEU Peer Tutor'} · {teacher.department || 'SEU'}
          </p>

          <div className="chips small-chips" style={{ marginBottom: 14 }}>
            {(teacher.subjects || []).slice(0, 3).map(x => (
                <span key={x}>{x}</span>
            ))}
          </div>
        </div>

        <div className="teacher-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="teacher-rating-pill">
              <Star size={13} fill="currentColor"/> {rating.toFixed(1)}
            </span>
            <small className="muted" style={{ fontSize: 11 }}>({teacher.totalReviews || 0} reviews)</small>
          </div>

          {onOpen && (
              <button
                  className="secondary small"
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    onOpen()
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Eye size={14}/>
                View Profile
              </button>
          )}
        </div>
      </article>
  )
}

function MiniActivity({ classes }) { const total = classes.length || 0, completed = classes.filter(x => x.status === 'COMPLETED').length, active = classes.filter(x => ['PAID','STARTED'].includes(x.status)).length; return <div className="activity-chart"><div className="activity-bar"><i style={{ height: `${Math.max(12, total ? completed / total * 100 : 12)}%` }}/><span>Completed</span></div><div className="activity-bar"><i style={{ height: `${Math.max(12, total ? active / total * 100 : 12)}%` }}/><span>Active</span></div><div className="activity-bar"><i style={{ height: `${Math.max(12, total ? (total - completed - active) / total * 100 : 12)}%` }}/><span>Pending</span></div></div> }

function AdminQuick({ title, value, action, onClick, icon: Icon }) { return <section className="panel admin-quick"><div className="quick-icon"><Icon size={20}/></div><div><span>{title}</span><strong>{value}</strong></div><button className="text-button" onClick={onClick}>{action} <ArrowRight size={15}/></button></section> }

function PageHero({ title, subtitle, action }) { return <section className="page-hero"><div><span className="eyebrow">SEUTOPPERS</span><h1>{title}</h1><p>{subtitle}</p></div>{action && <button className="primary" onClick={action.onClick}>{action.label} <ArrowRight size={16}/></button>}</section> }
function SectionHeading({ title, subtitle, action }) { return <div className="section-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function StatCard({ label, value, icon: Icon }) { return <article className="stat-card-cool"><div className="stat-icon-wrap"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong></div></article> }
function InfoRow({ label, value }) { return <div className="info-row"><span>{label}</span><b>{value}</b></div> }
function StatusPill({ value }) { const v = String(value || '').replaceAll('_', ' '); return <span className={`status status-${String(value || '').toLowerCase()}`}>{v}</span> }
function Stars({ value }) { return <div className="stars">{[1,2,3,4,5].map(x => <Star key={x} size={14} fill={x <= value ? 'currentColor' : 'none'}/>)}</div> }
function ErrorBox({ error }) { return error ? <div className="error-box"><AlertCircle size={16}/><span>{error}</span></div> : null }
function Spinner() { return <span className="spinner"/> }
function LoadingCard() { return <div className="loading-card"><Spinner/><span>Loading your records…</span></div> }
function SkeletonCards({ count = 4 }) { return Array.from({ length: count }).map((_, i) => <div className="skeleton-card" key={i}><i/><b/><span/></div>) }
function EmptyState({ icon: Icon, title, text }) { return <div className="empty-state"><div className="empty-icon"><Icon size={22}/></div><h3>{title}</h3><p>{text}</p></div> }
function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div> }
function NotificationPanel({ items, markRead, markAll }) { return <div className="notification-panel"><div className="notification-head"><b>Notifications</b><button className="link" onClick={markAll}>Mark all read</button></div>{items.length ? items.slice(0, 7).map(x => <button className={`notification-item ${x.read ? '' : 'unread'}`} key={x.id} onClick={() => markRead(x.id)}><div className="notification-dot"><Bell size={14}/></div><div><b>{x.title}</b><p>{x.text}</p><small>{formatDate(x.createdAt)}</small></div></button>) : <p className="muted notification-empty">No activity notifications yet.</p>}</div> }


function Brand({ onClick }) {
  return (
      <button className="brand" onClick={onClick}>
      <span className="brand-mark">
        <img
            src="/SeuToppersFavicon.png"
            alt="SeuToppers"
        />
      </span>

        <span>
        Seu<span>Toppers</span>
      </span>
      </button>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, required, ...rest }) { return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required} {...rest}/></label> }
function PasswordField({ label, value, onChange, required }) { const [show, setShow] = useState(false); return <label className="field"><span>{label}</span><div className="password-wrap"><input type={show ? 'text' : 'password'} value={value} onChange={onChange} required={required}/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label> }
function SelectField({ label, value, onChange, options }) { return <label className="field"><span>{label}</span><div className="select-wrap"><select value={value} onChange={onChange} required><option value="">Select</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select><ChevronDown size={16}/></div></label> }
function TextArea({ label, value, onChange, placeholder, required }) { return <label className="field"><span>{label}</span><textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required}/></label> }
function displayName(profile, email) { return profile?.fullName?.split(' ')[0] || email?.split('@')[0] || 'there' }
function initials(name) { return (name || 'ST').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() }
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
function formatTime(value) { if (!value) return ''; const d = new Date(value); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) }