import React, { useEffect, useMemo, useState } from 'react'

import {
  ArrowRight, Bell, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, CircleDollarSign,
  ClipboardList, Clock3, FileText, GraduationCap, Home, LayoutDashboard, LogIn, LogOut,
  Menu, MessageCircle, Pencil, Search, ShieldCheck, Star, UserRound, Users, WalletCards,
  X, Upload, Sparkles, Ban, CheckCircle2, AlertCircle, Eye, Plus, RefreshCw, LockKeyhole
} from 'lucide-react'
import { api, fileUrl } from './api'

const APP = import.meta.env.VITE_APP_NAME || 'SeuToppers'
const departments = ['CSE', 'BBA', 'EEE', 'TEXTILE', 'BANGLA', 'ENGLISH', 'ECONOMICS']
const programs = ['BSc', 'MSc', 'BBA', 'MBA', 'BA', 'MA', 'BSS', 'MSS', 'LLB', 'LLM', 'Other']

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
      <button className="brand brand-large" onClick={() => go('login')}><span className="brand-mark"><Sparkles size={20}/></span><span>Seu<span>Toppers</span></span></button>
      <div className="showcase-copy">
        <span className="eyebrow"><span className="eyebrow-dot"/> SEU student network</span>
        <h1>One account.<br/><em>Every learning path.</em></h1>
        <p>Find peer teachers, ask for academic help, book a class and build your teaching profile inside one focused SEU community.</p>
        <div className="showcase-list"><span><Check size={16}/> SEU email verification</span><span><Check size={16}/> Role-based access</span><span><Check size={16}/> Payment and class tracking</span></div>
      </div>
      <div className="showcase-orb orb-left"/><div className="showcase-orb orb-right"/>
      <div className="showcase-card"><div><span>Profile completion</span><strong>80%</strong></div><div className="progress"><i style={{ width: '80%' }}/></div><small>Unlock requests and teacher applications</small></div>
    </section>
    <section className="auth-panel"><div className="auth-card"><div className="auth-kicker">{kicker}</div><h2>{title}</h2>{children}</div></section>
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

      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 400,
        text: 'continue_with',
        shape: 'rectangular'
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
    if (!email.trim().toLowerCase().endsWith('@seu.edu.bd')) return setError('Use your SEU email ending with @seu.edu.bd.')
    setSubmitting(true)
    try {
      login(await busy(() => api.login({ email: email.trim().toLowerCase(), password })))
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
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@seu.edu.bd" type="email" required />
      <PasswordField label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <div className="form-row end"><button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button></div>
      <ErrorBox error={error}/><button className="primary full" disabled={submitting}>{submitting ? <Spinner/> : <>Log in <ArrowRight size={17}/></>}</button>
      <div className="auth-divider"><span>OR</span></div>
      <div id="google-login-button" className="google-login-button" />
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

    if (!email.trim().toLowerCase().endsWith('@seu.edu.bd')) {
      return setError('Registration is restricted to an SEU email address.')
    }

    if (password !== confirm) {
      return setError('Passwords do not match.')
    }

    setSubmitting(true)

    try {
      await busy(() =>
          api.register({
            email: email.trim().toLowerCase(),
            password,
            confirmPassword: confirm
          })
      )

      localStorage.setItem(
          'seutoppers_pending_email',
          email.trim().toLowerCase()
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
      <Field label="SEU email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@seu.edu.bd" type="email" required />
      <PasswordField label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <PasswordField label="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      <ErrorBox error={error}/>
      <button className="primary full" disabled={submitting}>
        {submitting ? <Spinner/> : <>Continue <ArrowRight size={17}/></>}
      </button>
    </form>
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

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-top"><Brand onClick={() => { go('dashboard'); setOpen(false) }}/><button className="mobile-close" onClick={() => setOpen(false)}><X size={19}/></button></div>
      <div className="side-account">
        <div className="avatar">
          {profileImage ? <img src={profileImage} alt="Profile"/> : initials(displayName)}
        </div>
        <div><strong>{displayName}</strong><span>{teacher ? 'Student & Teacher' : auth.role}</span></div>
      </div>
      <nav className="side-nav">{links.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { go(id); setOpen(false) }}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button onClick={() => { go('profile'); setOpen(false) }}><SettingsIcon/><span>Account settings</span></button><button className="logout" onClick={logout}><LogOut size={18}/><span>Log out</span></button></div>
    </aside>
    <div className="main-shell">
      <header className="appbar"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu/></button><div className="crumb"><span>{APP}</span><ChevronRight size={15}/><b>{links.find(x => x[0] === page)?.[1] || 'Overview'}</b></div><div className="app-actions"><div className="notification-wrap"><button className="icon-btn" onClick={() => setNotiOpen(v => !v)}><Bell size={18}/>{notifications.items.some(x => !x.read) && <i className="notify-dot"/>}</button>{notiOpen && <NotificationPanel items={notifications.items} markRead={notifications.markRead} markAll={notifications.markAll}/>}</div><span className="role-pill">{teacher ? 'TEACHER + STUDENT' : auth.role}</span><button className="icon-btn" onClick={logout}><LogOut size={17}/></button></div></header>
      <main className="content"><Page page={page} auth={auth} go={go} notify={notify} busy={busy} notifications={notifications}/></main>
    </div>
  </div>
}

function Page({ page, auth, go, notify, busy, notifications }) {
  if (auth.role === 'ADMIN') return <AdminPage page={page} auth={auth} go={go} notify={notify} busy={busy} notifications={notifications}/>
  if (page === 'teachers') return <TeachersPage auth={auth} notify={notify} />
  if (page === 'requests') return <RequestsPage auth={auth} go={go} notify={notify} busy={busy} />
  if (page === 'create-request') return <CreateRequestPage notify={notify} />
  if (page === 'service-taken') return <ServiceTakenPage notify={notify} />
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
    ['Reviews', teacherProfile.data?.totalReviews || 0, Star],
    ['Services', (classes.data || []).length, BookOpen],
    ['Profile', `${completion.data || 0}%`, UserRound]
  ] : [
    ['Profile', `${completion.data || 0}%`, UserRound],
    ['Classes', (classes.data || []).length, BookOpen],
    ['Teachers', teachers.data?.length || 0, Users],
    ['Status', completion.data >= 80 ? 'Ready' : 'Complete profile', CheckCircle2]
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

  return (
      <div className="page-stack">
        <PageHero
            title={`Good to see you, ${displayName(profile.data, auth.email)}.`}
            subtitle={auth.role === 'TEACHER'
                ? 'Manage both sides of your learning journey from one dashboard.'
                : 'Find a teacher, ask for help or build your teaching profile.'}
            action={completion.data < 80
                ? { label: 'Complete profile', onClick: () => window.location.hash = 'profile' }
                : { label: 'Find a teacher', onClick: () => window.location.hash = 'teachers' }}
        />

        <div className="stat-grid">
          {stats.map(([label, value, Icon]) => (
              <StatCard key={label} label={label} value={value} icon={Icon}/>
          ))}
        </div>

        <section className="section">
          <SectionHeading
              title="Top ranked teachers"
              subtitle="Click a teacher or use View Profile to see the full profile."
              action={
                <button className="text-button" onClick={() => go('teachers')}>
                  View all <ArrowRight size={15}/>
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
          <section className="panel promo-panel">
            <div className="promo-icon"><GraduationCap size={23}/></div>
            <div>
              <span className="eyebrow">TEACHER PATH</span>
              <h3>{auth.role === 'TEACHER' ? 'Your teacher profile is active.' : 'Want to become a teacher?'}</h3>
              <p>{auth.role === 'TEACHER'
                  ? 'Add your subjects, hourly rate, teaching mode and availability from your profile.'
                  : 'You need at least 80% student profile completion. The application also requires a 3.80+ CGPA in this frontend.'}</p>
            </div>
            <button className="secondary" onClick={() => go(auth.role === 'TEACHER' ? 'profile' : 'teacher-apply')}>
              {auth.role === 'TEACHER' ? 'Edit teaching profile' : 'Apply now'} <ArrowRight size={16}/>
            </button>
          </section>

          <section className="panel mini-chart-panel">
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
  const [interestSubject, setInterestSubject] = useState(teacher.subjects?.[0] || '')
  const rating = Number(teacher.rating || 0)
  return <div className="page-stack"><button className="back-button" onClick={onBack}><ChevronRight size={17} className="back-icon"/> Back to teachers</button><section className="profile-hero panel"><div className="profile-avatar large">{teacher.profileImage ? <img src={fileUrl(teacher.profileImage)} alt=""/> : initials(teacher.fullName)}</div><div className="profile-main"><span className="eyebrow">PEER TEACHER</span><h1>{teacher.fullName || 'Teacher'}</h1><p>{teacher.qualification || teacher.program || 'SEU teacher'} · {teacher.department || 'SEU'}</p><div className="chips">{(teacher.subjects || []).map(s => <span key={s}>{s}</span>)}</div></div><div className="rating-box"><div className="rating-ring" style={{ '--rating': `${rating / 5 * 100}%` }}><strong>{rating.toFixed(1)}</strong><span>/ 5</span></div><b>{teacher.totalReviews || 0} reviews</b></div></section><div className="detail-grid"><section className="panel"><SectionHeading title="Performance snapshot" subtitle="Only metrics exposed by the current backend are shown."/><div className="metric-chart"><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, rating / 5 * 100))}%` }}/></div><div className="metric-row"><span>Average rating</span><strong>{rating.toFixed(1)} / 5</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, Number(teacher.totalReviews || 0) * 5)}%` }}/></div><div className="metric-row"><span>Review volume</span><strong>{teacher.totalReviews || 0}</strong></div></div><div className="subject-graph">{(teacher.subjects || []).map((s, i) => <div key={s} className="subject-row"><span>{s}</span><i style={{ width: `${Math.max(24, 92 - i * 11)}%` }}/></div>)}</div></section><section className="panel"><SectionHeading title="Teacher details"/><InfoRow label="Experience" value={teacher.experience || 'Not provided'}/><InfoRow label="Teaching mode" value={teacher.teachingMode || 'Not provided'}/><InfoRow label="Availability" value={teacher.availability || 'Not provided'}/><InfoRow label="Hourly rate" value={teacher.hourlyRate ? `৳${teacher.hourlyRate}` : 'Set after selection'}/><InfoRow label="Location" value={teacher.location || 'SEU community'}/></section></div></div>
}

function RequestsPage({ auth, go, notify, busy }) {
  const open = useLoad(api.openRequests, [])
  const mine = useLoad(api.myRequests, [auth.role])

  const [active, setActive] = useState('open')
  const [interests, setInterests] = useState({})
  const [message, setMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [booking, setBooking] = useState(null)

  const rawList = active === 'mine' ? mine.data : open.data

  const list = Array.isArray(rawList)
      ? rawList
      : Array.isArray(rawList?.content)
          ? rawList.content
          : Array.isArray(rawList?.data)
              ? rawList.data
              : []

  const loadInterests = async requestId => {
    try {
      const value = await api.interests(requestId)
      setInterests(x => ({ ...x, [requestId]: value }))
    } catch (e) {
      notify(e.message)
    }
  }

  const showInterests = async requestId => {
    await loadInterests(requestId)
    setSelectedRequest(requestId)
  }

  const sendInterest = async id => {
    try {
      await busy(() => api.interest(id, message))
      setMessage('')
      notify('Interest submitted. The student can now review your details.')
      open.reload()
    } catch (e) {
      notify(e.message)
    }
  }

  const selectTeacher = async (id, teacherId) => {
    try {
      await busy(() => api.selectTeacher(id, teacherId))
      notify('Teacher selected. You can now create the class booking.')
      mine.reload()
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
                  : 'Post the topic and time you need help with.'
            }
            action={
              auth.role !== 'TEACHER'
                  ? {
                    label: 'Post a request',
                    onClick: () => go('create-request')
                  }
                  : null
            }
        />

        <div className="tabs">
          <button
              className={active === 'open' ? 'active' : ''}
              onClick={() => setActive('open')}
          >
            Open requests
          </button>

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
                  onInterest={() => sendInterest(item.id)}
                  onShowInterests={() => showInterests(item.id)}
                  message={message}
                  setMessage={setMessage}
                  onBook={() => setBooking(item)}
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
                onClose={() => setSelectedRequest(null)}
                onSelect={selectTeacher}
            />
        )}

        {booking && (
            <BookingModal
                request={booking}
                onClose={() => setBooking(null)}
                onDone={() => {
                  setBooking(null)
                  mine.reload()
                }}
            />
        )}
      </div>
  )
}

function CreateRequestPage({ notify }) {
  const [form, setForm] = useState({ topic: '', description: '', requestedTime: '', durationMinutes: 60, budget: '' }), [error, setError] = useState(''), [done, setDone] = useState(false)
  const submit = async e => { e.preventDefault(); setError(''); try { await api.createRequest({ ...form, durationMinutes: Number(form.durationMinutes), budget: Number(form.budget) }); setDone(true); notify('Help request posted successfully.') } catch (e) { setError(e.message) } }
  if (done) return <div className="empty-page"><div className="success-mark"><Check size={25}/></div><h2>Request posted</h2><p>Teachers can now respond with interest.</p><button className="primary" onClick={() => window.location.hash = 'requests'}>View requests <ArrowRight size={16}/></button></div>
  return <div className="page-stack"><PageHero title="Post a help request" subtitle="Describe what you need, when you need it and your budget."/><section className="panel form-panel"><form className="form" onSubmit={submit}><div className="form-grid"><Field label="Topic" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Data Mining - DBSCAN" required/><Field label="Requested time" value={form.requestedTime} onChange={e => setForm({ ...form, requestedTime: e.target.value })} placeholder="e.g. Friday 8:00 PM" required/><Field label="Duration (minutes)" type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} required/><Field label="Budget (BDT)" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} required/></div><TextArea label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explain the exact topic or problem." required/><ErrorBox error={error}/><button className="primary" disabled={false}>Post request <ArrowRight size={16}/></button></form></section></div>
}

function ServiceTakenPage({ notify }) {
  const data = useLoad(api.myClasses, [])
  const teachers = useLoad(api.teachers, [])
  const map = useMemo(() => Object.fromEntries((teachers.data || []).map(x => [x.userId, x])), [teachers.data])
  return <div className="page-stack"><PageHero title="Service taken" subtitle="Every class you booked as a student appears here."/><section className="class-list">{data.loading ? <LoadingCard/> : (data.data || []).map(c => <ClassCard key={c.id} item={c} teacher={map[c.teacherId]} studentView onReview={notify}/>)}</section>{!data.loading && !data.data?.length && <EmptyState icon={BookOpen} title="No classes yet" text="Select a teacher from a help request to book your first class."/>}</div>
}

function ServiceGivenPage({ notify }) {
  const data = useLoad(api.teacherClasses, [])
  return <div className="page-stack"><PageHero title="Service given" subtitle="Manage classes where you are the teacher."/><section className="class-list">{data.loading ? <LoadingCard/> : (data.data || []).map(c => <TeacherClassCard key={c.id} item={c} notify={notify} reload={data.reload}/>)}</section>{!data.loading && !data.data?.length && <EmptyState icon={GraduationCap} title="No services given yet" text="When a student books you, the class will appear here."/>}</div>
}

function PaymentsPage({ notify }) {
  const payments = useLoad(api.myPayments, []), classes = useLoad(api.myClasses, [])
  const classMap = useMemo(() => Object.fromEntries((classes.data || []).map(x => [x.id, x])), [classes.data])
  const pay = async p => { try { const result = await api.initiatePayment(p.classId); if (result.checkoutUrl) window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer'); else notify('bKash checkout URL is not configured in the backend yet.') } catch (e) { notify(e.message) } }
  return <div className="page-stack"><PageHero title="Payment history" subtitle="Track pending, held and released payments."/><section className="panel"><div className="table-wrap"><table><thead><tr><th>Class</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Date</th><th/></tr></thead><tbody>{(payments.data || []).map(p => <tr key={p.id}><td><strong>{classMap[p.classId]?.scheduledTime || 'Class'}</strong><small>{p.classId}</small></td><td>৳{p.amount ?? '-'}</td><td>{p.gateway || 'BKASH'}</td><td><StatusPill value={p.status}/></td><td>{formatDate(p.createdAt)}</td><td>{p.status === 'PENDING' && <button className="small-primary" onClick={() => pay(p)}>Pay with bKash</button>}</td></tr>)}</tbody></table></div>{!payments.loading && !payments.data?.length && <EmptyState icon={WalletCards} title="No payments yet" text="Your class payment records will appear here."/>}</section></div>
}

function ReviewsPage({ auth }) {
  const key = `seutoppers_reviews_${auth.userId}`
  const [items] = useState(() => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } })
  return <div className="page-stack"><PageHero title="Your reviews" subtitle="Reviews you have submitted are kept read-only here."/><section className="review-grid">{items.map(x => <article className="review-card" key={x.id}><div className="review-top"><div><b>{x.teacherName || 'Teacher'}</b><small>{formatDate(x.createdAt)}</small></div><Stars value={x.rating}/></div><p>{x.comment}</p></article>)}</section>{!items.length && <EmptyState icon={Star} title="No reviews yet" text="After a completed class, you can leave one review. Submitted reviews are uneditable."/>}</div>
}

function TeacherReviewsPage() {
  const profile = useLoad(api.teacherProfile, [])
  return <div className="page-stack"><PageHero title="Student reviews" subtitle="Your backend currently exposes aggregate rating data on the teacher profile."/><section className="review-summary panel"><div className="rating-ring big" style={{ '--rating': `${Number(profile.data?.rating || 0) / 5 * 100}%` }}><strong>{Number(profile.data?.rating || 0).toFixed(1)}</strong><span>/ 5</span></div><div><span className="eyebrow">CURRENT RATING</span><h2>{profile.data?.totalReviews || 0} student reviews</h2><p className="muted">Individual review retrieval is not exposed by the current backend API, so the frontend does not invent review text.</p></div></section></div>
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
    setSaving(true)
    setError('')
    try {
      let image = form.profileImage
      if (file) image = await api.uploadProfile(file)
      const studentPayload = { fullName: form.fullName, phone: form.phone, profileImage: image, department: form.department, program: form.program, batch: form.batch, location: form.location, bio: form.bio }
      await api.updateStudentProfile(studentPayload)
      if (auth.role === 'TEACHER') {
        await api.updateTeacherProfile({ ...studentPayload, qualification: form.qualification, experience: form.experience, subjects: form.subjects.split(',').map(x => x.trim()).filter(Boolean), hourlyRate: Number(form.hourlyRate) || null, teachingMode: form.teachingMode, availability: form.availability })
      }
      setForm(x => ({ ...x, profileImage: image }))
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
  }}/></label><small className="hint">PNG, JPG or WEBP</small></div></div><div className="form-grid"><Field label="Full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} required/><Field label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} required/><SelectField label="Department" value={form.department} onChange={e => set('department', e.target.value)} options={departments}/><Field label="Batch" value={form.batch} onChange={e => set('batch', e.target.value)} required/><SelectField label="Program" value={form.program} onChange={e => set('program', e.target.value)} options={programs}/><Field label="Location" value={form.location} onChange={e => set('location', e.target.value)}/></div><TextArea label="Bio" value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the SEU community a little about you."/></section><aside className="profile-side"><section className="panel completion-card"><span className="eyebrow">PROFILE COMPLETION</span><div className="completion-number">{completion.data || 0}%</div><div className="progress"><i style={{ width: `${completion.data || 0}%` }}/></div><p>{completion.data >= 80 ? 'You can post help requests and apply to become a teacher.' : 'Reach 80% to unlock help requests and teacher applications.'}</p></section>{auth.role === 'TEACHER' && <section className="panel"><SectionHeading title="Teaching profile" subtitle="Visible to students when they visit your teacher profile."/><div className="form"><Field label="Qualification" value={form.qualification} onChange={e => set('qualification', e.target.value)}/><Field label="Experience" value={form.experience} onChange={e => set('experience', e.target.value)}/><Field label="Subjects" value={form.subjects} onChange={e => set('subjects', e.target.value)} placeholder="Java, DBMS, AI"/><div className="form-grid"><Field label="Hourly rate" type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)}/><Field label="Teaching mode" value={form.teachingMode} onChange={e => set('teachingMode', e.target.value)} placeholder="Online / Offline"/></div><Field label="Availability" value={form.availability} onChange={e => set('availability', e.target.value)} placeholder="Evening, weekends"/></div></section>}<section className="panel privacy-card"><LockKeyhole size={18}/><div><b>Profile privacy</b><p>Best-effort browser privacy is enabled on this page. Browsers cannot guarantee screenshot prevention.</p></div></section></aside></div><div className="save-row"><ErrorBox error={error}/><button className="secondary" type="button" onClick={() => student.reload()}><RefreshCw size={16}/> Refresh</button><button className="primary" disabled={saving}>{saving ? <Spinner/> : <><Check size={16}/> Save profile</>}</button></div></form></div>
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

function AdminPayments({ notify }) {
  const data = useLoad(api.adminPayments, [])
  const hold = async p => { const tx = window.prompt('Enter bKash transaction ID'); if (!tx) return; try { await api.holdPayment(p.id, tx); notify('Payment marked as held.'); data.reload() } catch (e) { notify(e.message) } }
  return <div className="page-stack"><PageHero title="Payment history" subtitle="Review payment states and manually confirm bKash transactions when needed."/><section className="panel"><div className="table-wrap"><table><thead><tr><th>Class</th><th>Amount</th><th>Student</th><th>Teacher</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.data?.map(p => <tr key={p.id}><td>{p.classId}</td><td>৳{p.amount}</td><td>{p.studentId}</td><td>{p.teacherId}</td><td><StatusPill value={p.status}/></td><td>{p.status === 'PENDING' && <button className="small-primary" onClick={() => hold(p)}>Mark held</button>}</td></tr>)}</tbody></table></div></section></div>
}

function AdminClasses() {
  const data = useLoad(api.adminClasses, [])
  return <div className="page-stack"><PageHero title="Class history" subtitle="All class bookings recorded by the backend."/><section className="panel"><div className="table-wrap"><table><thead><tr><th>Class</th><th>Student</th><th>Teacher</th><th>Scheduled</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.data?.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.studentId}</td><td>{c.teacherId}</td><td>{c.scheduledTime}</td><td>৳{c.amount}</td><td><StatusPill value={c.status}/></td></tr>)}</tbody></table></div></section></div>
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

function RequestCard({ item, role, onInterest, onShowInterests, message, setMessage, onBook }) {
  return <article className="request-card"><div className="request-top"><div className="topic-icon"><MessageCircle size={19}/></div><div><span className="eyebrow">{item.status}</span><h3>{item.topic}</h3></div><span className="interest-count"><Users size={14}/> {item.interestedTeachers}</span></div><p>{item.description}</p><div className="request-meta"><span><Clock3 size={14}/>{item.requestedTime}</span><span><BookOpen size={14}/>{item.durationMinutes} min</span><span><CircleDollarSign size={14}/>৳{item.budget}</span></div>{role === 'TEACHER' && item.status === 'OPEN' && <><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Short message to the student"/><button className="primary full" onClick={onInterest}>Show interest <ArrowRight size={15}/></button></>}{role !== 'TEACHER' && item.status === 'OPEN' && <button className="secondary full" onClick={onShowInterests}>View interested teachers</button>}{role !== 'TEACHER' && item.status === 'TEACHER_SELECTED' && <button className="primary full" onClick={onBook}>Book class <ArrowRight size={15}/></button>}</article>
}

function InterestModal({ requestId, interests, onClose, onSelect }) { return <Modal title="Interested teachers" onClose={onClose}><div className="interest-list">{interests.map(x => <article className="interest-item" key={x.id}><div className="profile-avatar">{initials(x.teacherName)}</div><div><b>{x.teacherName}</b><p>{x.message}</p><StatusPill value={x.status}/></div><button className="primary small" disabled={x.status !== 'INTERESTED'} onClick={() => onSelect(requestId, x.teacherId)}>{x.status === 'SELECTED' ? 'Selected' : 'Select teacher'}</button></article>)}{!interests.length && <EmptyState icon={Users} title="No interests yet" text="Teachers who respond will appear here."/>}</div></Modal> }

function BookingModal({ request, onClose, onDone }) { const [teacherId, setTeacherId] = useState(''), [time, setTime] = useState(request.requestedTime || ''), [amount, setAmount] = useState(request.budget || ''), [teachers, setTeachers] = useState([]), [error, setError] = useState(''); useEffect(() => { api.interests(request.id).then(setTeachers).catch(() => {}) }, [request.id]); const selected = teachers.find(x => x.status === 'SELECTED'); useEffect(() => { if (selected) setTeacherId(selected.teacherId) }, [selected]); const submit = async e => { e.preventDefault(); try { await api.createClass({ requestId: request.id, teacherId, scheduledTime: time, amount: Number(amount) }); onDone() } catch (e) { setError(e.message) } }; return <Modal title="Book your class" onClose={onClose}><form className="form" onSubmit={submit}><InfoRow label="Selected teacher" value={selected?.teacherName || 'Selected teacher'}/><Field label="Scheduled time" value={time} onChange={e => setTime(e.target.value)} required/><Field label="Amount (BDT)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required/><ErrorBox error={error}/><button className="primary full">Create class booking <ArrowRight size={16}/></button></form></Modal> }

function ClassCard({ item, teacher, studentView, onReview }) { const [reviewOpen, setReviewOpen] = useState(false); return <article className="class-card"><div className="class-icon"><CalendarDays size={19}/></div><div className="class-main"><div className="class-heading"><div><span className="eyebrow">{studentView ? 'SERVICE TAKEN' : 'CLASS'}</span><h3>{teacher?.fullName || `Teacher ${item.teacherId?.slice(-5) || ''}`}</h3></div><StatusPill value={item.status}/></div><div className="class-meta"><span>{item.scheduledTime}</span><span>৳{item.amount}</span><span>{formatDate(item.createdAt)}</span></div></div>{studentView && item.status === 'COMPLETED' && <button className="secondary small" onClick={() => setReviewOpen(true)}><Star size={15}/> Review</button>}{reviewOpen && <ReviewModal classId={item.id} teacher={teacher} onClose={() => setReviewOpen(false)} onDone={onReview}/>}</article> }

function TeacherClassCard({ item, notify, reload }) { const action = async type => { try { if (type === 'start') await api.startClass(item.id); else await api.completeClass(item.id); notify(type === 'start' ? 'Class started.' : 'Class completed.'); reload() } catch (e) { notify(e.message) } }; return <article className="class-card"><div className="class-icon"><GraduationCap size={19}/></div><div className="class-main"><div className="class-heading"><div><span className="eyebrow">SERVICE GIVEN</span><h3>Student class</h3></div><StatusPill value={item.status}/></div><div className="class-meta"><span>{item.scheduledTime}</span><span>৳{item.amount}</span><span>{formatDate(item.createdAt)}</span></div></div><div className="button-row">{item.status === 'PAID' && <button className="secondary small" onClick={() => action('start')}>Start</button>}{['PAID', 'STARTED'].includes(item.status) && <button className="primary small" onClick={() => action('complete')}>Complete</button>}</div></article> }

function ReviewModal({ classId, teacher, onClose, onDone }) { const [rating, setRating] = useState(5), [comment, setComment] = useState(''), [error, setError] = useState(''); const submit = async e => { e.preventDefault(); try { await api.reviewClass(classId, { rating, comment }); const key = `seutoppers_reviews_${JSON.parse(localStorage.getItem('seutoppers_auth') || '{}').userId}`; const old = JSON.parse(localStorage.getItem(key) || '[]'); localStorage.setItem(key, JSON.stringify([{ id: crypto.randomUUID(), teacherName: teacher?.fullName, rating, comment, createdAt: new Date().toISOString() }, ...old])); onDone('Review submitted successfully.'); onClose() } catch (e) { setError(e.message) } }; return <Modal title={`Review ${teacher?.fullName || 'teacher'}`} onClose={onClose}><form className="form" onSubmit={submit}><label className="field"><span>Rating</span><div className="rating-picker">{[1,2,3,4,5].map(x => <button type="button" key={x} className={x <= rating ? 'selected' : ''} onClick={() => setRating(x)}><Star size={23} fill="currentColor"/></button>)}</div></label><TextArea label="Review" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience." required/><ErrorBox error={error}/><button className="primary full">Submit review <Check size={16}/></button></form></Modal> }

function TeacherCard({ teacher, rank, onOpen }) {
  return (
      <article
          className="teacher-card"
          onClick={onOpen}
          style={{ cursor: onOpen ? 'pointer' : 'default' }}
      >
        <div className="teacher-top">
          <div className="profile-avatar">
            {teacher.profileImage ? (
                <img src={fileUrl(teacher.profileImage)} alt="" />
            ) : (
                initials(teacher.fullName)
            )}
          </div>
          <div className="rank">{rank ? `#${rank}` : 'Teacher'}</div>
        </div>

        <h3>{teacher.fullName || 'Teacher'}</h3>

        <p>
          {teacher.qualification ||
              teacher.program ||
              teacher.department ||
              'SEU teacher'}
        </p>

        <div className="chips small-chips">
          {(teacher.subjects || []).slice(0, 3).map(x => (
              <span key={x}>{x}</span>
          ))}
        </div>

        <div className="teacher-bottom">
        <span>
          <Star size={14} fill="currentColor"/>
          {Number(teacher.rating || 0).toFixed(1)}
        </span>
          <span>{teacher.totalReviews || 0} reviews</span>

          {onOpen && (
              <button
                  className="secondary small"
                  onClick={e => {
                    e.stopPropagation()
                    onOpen()
                  }}
              >
                <Eye size={15}/>
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
function StatCard({ label, value, icon: Icon }) { return <article className="stat-card"><div className="stat-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong></div></article> }
function InfoRow({ label, value }) { return <div className="info-row"><span>{label}</span><b>{value}</b></div> }
function StatusPill({ value }) { const v = String(value || '').replaceAll('_', ' '); return <span className={`status status-${String(value || '').toLowerCase()}`}>{v}</span> }
function Stars({ value }) { return <div className="stars">{[1,2,3,4,5].map(x => <Star key={x} size={14} fill={x <= value ? 'currentColor' : 'none'}/>)}</div> }
function ErrorBox({ error }) { return error ? <div className="error-box"><AlertCircle size={16}/><span>{error}</span></div> : null }
function Spinner() { return <span className="spinner"/> }
function LoadingCard() { return <div className="loading-card"><Spinner/><span>Loading your records…</span></div> }
function SkeletonCards({ count = 4 }) { return Array.from({ length: count }).map((_, i) => <div className="skeleton-card" key={i}><i/><b/><span/></div>) }
function EmptyState({ icon: Icon, title, text }) { return <div className="empty-state"><div className="empty-icon"><Icon size={22}/></div><h3>{title}</h3><p>{text}</p></div> }
function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div></div> }
function NotificationPanel({ items, markRead, markAll }) { return <div className="notification-panel"><div className="notification-head"><b>Notifications</b><button className="link" onClick={markAll}>Mark all read</button></div>{items.length ? items.slice(0, 7).map(x => <button className={`notification-item ${x.read ? '' : 'unread'}`} key={x.id} onClick={() => markRead(x.id)}><div className="notification-dot"><Bell size={14}/></div><div><b>{x.title}</b><p>{x.text}</p><small>{formatDate(x.createdAt)}</small></div></button>) : <p className="muted notification-empty">No activity notifications yet.</p>}<small className="notification-note">Persistent server-side notifications are not exposed by the current backend.</small></div> }
function Brand({ onClick }) { return <button className="brand" onClick={onClick}><span className="brand-mark"><Sparkles size={18}/></span><span>Seu<span>Toppers</span></span></button> }
function SettingsIcon() { return <Pencil size={17}/> }
function Field({ label, value, onChange, type = 'text', placeholder, required, ...rest }) { return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required} {...rest}/></label> }
function PasswordField({ label, value, onChange, required }) { const [show, setShow] = useState(false); return <label className="field"><span>{label}</span><div className="password-wrap"><input type={show ? 'text' : 'password'} value={value} onChange={onChange} required={required}/><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label> }
function SelectField({ label, value, onChange, options }) { return <label className="field"><span>{label}</span><div className="select-wrap"><select value={value} onChange={onChange} required><option value="">Select</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select><ChevronDown size={16}/></div></label> }
function TextArea({ label, value, onChange, placeholder, required }) { return <label className="field"><span>{label}</span><textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} required={required}/></label> }
function displayName(profile, email) { return profile?.fullName?.split(' ')[0] || email?.split('@')[0] || 'there' }
function initials(name) { return (name || 'ST').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() }
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }