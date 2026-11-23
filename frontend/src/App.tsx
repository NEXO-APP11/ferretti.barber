import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarDays, Camera, MapPin, Menu, Scissors, Phone, X, ArrowRight, Clock3 } from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

type Service = { id: string; name: string; description?: string; price: number; duration: number }
type Settings = { name: string; whatsapp?: string; address?: string; instagram?: string }
type AvailabilityResponse = { slots: string[] }
type AvailabilityState = { query: string; slots: string[] }
type AppointmentSummary = {
  id: string
  startAt: string
  client: { name: string }
  service: { name: string }
}
type DashboardData = {
  todayAppointments: number
  totalClients: number
  revenue: number
  nextAppointments: AppointmentSummary[]
}

const fallbackServices: Service[] = [
  { id: 'fallback-corte', name: 'Corte masculino', description: 'Corte técnico, acabamento preciso e finalização personalizada.', price: 0, duration: 30 },
  { id: 'fallback-fade', name: 'Degradê (Fade)', description: 'Transição suave, desenho e acabamento na régua.', price: 0, duration: 40 },
  { id: 'fallback-social', name: 'Corte social', description: 'Clássico atemporal com alinhamento elegante.', price: 0, duration: 30 },
  { id: 'fallback-barba', name: 'Barba', description: 'Desenho da barba, alinhamento e acabamento.', price: 0, duration: 30 },
  { id: 'fallback-sobrancelha', name: 'Sobrancelha', description: 'Design masculino discreto e natural.', price: 0, duration: 15 },
  { id: 'fallback-pezinho', name: 'Pezinho', description: 'Acabamento rápido para manter o corte alinhado.', price: 0, duration: 15 },
  { id: 'fallback-combo', name: 'Combo cabelo + barba', description: 'Experiência completa de corte e barba.', price: 0, duration: 60 }
]

const gallery = [
  { image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85', label: 'Corte masculino' },
  { image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85', label: 'Degradê & Fade' },
  { image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=85', label: 'Barba' },
  { image: 'https://images.unsplash.com/photo-1593702295094-aea22597af65?auto=format&fit=crop&w=900&q=85', label: 'Acabamento' }
]

function PublicSite() {
  const [services, setServices] = useState<Service[]>(fallbackServices)
  const [settings, setSettings] = useState<Settings>({ name: 'FERRETTI BARBER' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [availability, setAvailability] = useState<AvailabilityState | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', serviceId: '', date: '', startAt: '' })
  const [message, setMessage] = useState('')
  const availabilityQuery = form.date && form.serviceId ? `${form.date}:${form.serviceId}` : ''
  const currentAvailability = availability?.query === availabilityQuery ? availability : null
  const slots = currentAvailability?.slots ?? []
  const loadingSlots = Boolean(availabilityQuery && !currentAvailability)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/public/services`).then((r) => r.ok ? r.json() : fallbackServices).catch(() => fallbackServices),
      fetch(`${API_URL}/public/settings`).then((r) => r.ok ? r.json() : {}).catch(() => ({}))
    ]).then(([serviceData, settingsData]) => {
      setServices(Array.isArray(serviceData) && serviceData.length ? serviceData as Service[] : fallbackServices)
      setSettings((settingsData as Settings) || { name: 'FERRETTI BARBER' })
    })
  }, [])

  useEffect(() => {
    if (!form.date || !form.serviceId) return
    let cancelled = false
    const query = `${form.date}:${form.serviceId}`
    fetch(`${API_URL}/public/availability?date=${form.date}&serviceId=${form.serviceId}`)
      .then((response) => response.ok ? response.json() as Promise<AvailabilityResponse> : { slots: [] })
      .then((data) => {
        if (!cancelled) setAvailability({ query, slots: data.slots || [] })
      })
      .catch(() => {
        if (!cancelled) setAvailability({ query, slots: [] })
      })
    return () => { cancelled = true }
  }, [form.date, form.serviceId])

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!settings.whatsapp) return setMessage('O WhatsApp da barbearia ainda não foi configurado.')
    try {
      const response = await fetch(`${API_URL}/public/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!response.ok) throw new Error((await response.json()).message || 'Não foi possível registrar')
      const service = services.find((item) => item.id === form.serviceId)
      const date = new Date(form.startAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      const text = [
        'Olá, FERRETTI BARBER!',
        'Gostaria de solicitar um horário.',
        '',
        `Nome: ${form.name}`,
        `Telefone: ${form.phone}`,
        `Serviço: ${service?.name || ''}`,
        `Data e horário: ${date}`,
        '',
        'O agendamento depende de confirmação pelo WhatsApp.'
      ].join('\n')
      window.open(`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
      setMessage('Solicitação registrada. O agendamento depende de confirmação pelo WhatsApp.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao solicitar agendamento')
    }
  }

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }

  return (
    <main>
      <header className="navbar">
        <button className="brand" onClick={() => scrollTo('inicio')} aria-label="Início"><Scissors size={22} /> <span>{settings.name}</span></button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'nav-open' : ''}>
          <button onClick={() => scrollTo('servicos')}>Serviços</button>
          <button onClick={() => scrollTo('galeria')}>Resultados</button>
          <button onClick={() => scrollTo('barbearia')}>A barbearia</button>
          <button onClick={() => scrollTo('contato')}>Contato</button>
          <button className="nav-admin" onClick={() => { window.location.hash = '/admin' }}>Painel</button>
        </nav>
      </header>

      <section id="inicio" className="hero-section">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow"><span /> EXPERIÊNCIA & ESTILO</p>
          <h1>Seu corte.<br/><em>Sua assinatura.</em></h1>
          <p className="hero-copy">Precisão, atendimento exclusivo e estilo que acompanha você.</p>
          <div className="hero-actions"><button className="primary-button" onClick={() => setBookingOpen(true)}><CalendarDays size={19}/> Agendar horário</button><button className="text-button" onClick={() => scrollTo('servicos')}>Ver serviços <ArrowRight size={18}/></button></div>
        </div>
        <div className="hero-note"><span>01</span><p>Especialidade<br/><strong>Cortes masculinos</strong></p></div>
      </section>

      <section id="servicos" className="section services-section">
        <div className="section-heading"><p>O QUE OFERECEMOS</p><h2>Escolha seu estilo</h2></div>
        <div className="services-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.id}>
              <div className="service-top"><span>{String(index + 1).padStart(2, '0')}</span><Scissors size={23}/></div>
              <h3>{service.name}</h3>
              <p>{service.description || 'Atendimento profissional e acabamento preciso.'}</p>
              <div className="service-footer"><strong>{service.price > 0 ? service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Valor a confirmar'}</strong><span><Clock3 size={14}/> {service.duration} min</span></div>
              <button onClick={() => { setForm({ ...form, serviceId: service.id }); setBookingOpen(true) }}>Agendar <ArrowRight size={16}/></button>
            </article>
          ))}
        </div>
      </section>

      <section id="galeria" className="gallery-section">
        <div className="gallery-heading"><p>REFERÊNCIAS DE ESTILO</p><h2>Detalhe em cada acabamento.</h2></div>
        <div className="gallery-grid">{gallery.map((item, index) => <article key={item.label} className={index === 0 ? 'gallery-feature' : ''}><img src={item.image} alt={`Referência de ${item.label} em barbearia`} loading="lazy"/><div><span>0{index + 1}</span><h3>{item.label}</h3></div></article>)}</div>
      </section>

      <section id="barbearia" className="section about-section">
        <div className="about-mark"><div className="about-image"/><div className="about-seal"><Scissors/><span>PRECISÃO</span></div></div>
        <div className="about-copy"><p className="eyebrow">FERRETTI BARBER</p><h2>Mais que um corte.<br/><em>Uma experiência.</em></h2><p>Cuidamos dos detalhes que fazem a diferença. Atendimento personalizado, técnica e um ambiente pensado para você.</p><div className="about-points"><span>Profissionalismo</span><span>Acabamento preciso</span><span>Estilo autoral</span></div></div>
      </section>

      <section id="contato" className="contact-section">
        <div><p className="eyebrow">LOCALIZAÇÃO & CONTATO</p><h2>Venha nos visitar.</h2></div>
        <div className="contact-grid">
          {settings.address && <p><MapPin/> <span><small>Endereço</small>{settings.address}</span></p>}
          {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer"><Camera/> <span><small>Redes sociais</small>Instagram</span></a>}
          {settings.whatsapp && <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Phone/> <span><small>Atendimento</small>WhatsApp</span></a>}
        </div>
      </section>

      {settings.whatsapp && <a className="floating-whatsapp" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="Conversar pelo WhatsApp"><Phone/><span>WhatsApp</span></a>}

      {bookingOpen && <div className="modal-backdrop" role="dialog" aria-modal="true">
        <form className="booking-modal" onSubmit={submitBooking}>
          <button type="button" className="modal-close" onClick={() => setBookingOpen(false)}><X/></button>
          <p className="eyebrow">SOLICITAR AGENDAMENTO</p><h2>Escolha seu horário</h2>
          <label>Nome<input required placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Telefone<input required placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}/></label>
          <label>Serviço<select required value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value, date: '', startAt: '' })}><option value="">Selecione</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Data<input type="date" required min={new Date().toISOString().slice(0,10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, startAt: '' })}/></label>
          {loadingSlots && <p className="empty">Consultando horários...</p>}
          {!loadingSlots && slots.length > 0 && <div className="slot-grid">{slots.map((slot) => <button type="button" className={form.startAt === slot ? 'selected' : ''} key={slot} onClick={() => setForm({ ...form, startAt: slot })}>{new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</button>)}</div>}
          {!loadingSlots && form.date && form.serviceId && slots.length === 0 && <p className="empty">Não há horários disponíveis para esta data.</p>}
          <button className="primary-button full" disabled={!form.startAt}>Solicitar pelo WhatsApp</button>
          <small>Ao continuar, você será redirecionado. O agendamento só será confirmado após resposta pelo WhatsApp.</small>
          {message && <p className="form-message">{message}</p>}
        </form>
      </div>}
    </main>
  )
}

function Admin() {
  const [token, setToken] = useState(localStorage.getItem('ferretti_token') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  const authFetch = useCallback((path: string, options: RequestInit = {}) => fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } }), [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    authFetch('/dashboard')
      .then((response) => response.ok ? response.json() as Promise<DashboardData> : null)
      .then((data) => { if (!cancelled) setDashboard(data) })
      .catch(() => { if (!cancelled) setDashboard(null) })
    return () => { cancelled = true }
  }, [token, authFetch])

  const login = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await response.json()
    if (!response.ok) return setError(data.message)
    localStorage.setItem('ferretti_token', data.token); setToken(data.token)
  }

  if (!token) return <main className="login-page"><form className="login-card" onSubmit={login}><div className="login-logo"><Scissors/> FERRETTI BARBER</div><p>Acesso administrativo</p><label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}/></label>{error && <p className="form-message">{error}</p>}<button className="primary-button full">Entrar</button></form></main>

  return <main className="admin-layout"><aside><div className="admin-brand"><Scissors/> FERRETTI</div><nav><button className="active">Dashboard</button><button onClick={() => window.location.hash = ''}>Ver site</button></nav><button className="logout" onClick={() => { localStorage.removeItem('ferretti_token'); setToken('') }}>Sair</button></aside><section className="admin-content"><header><p>Painel administrativo</p><h1>Dashboard</h1></header><div className="stat-grid"><article><span>Agendamentos hoje</span><strong>{dashboard?.todayAppointments ?? '—'}</strong></article><article><span>Clientes ativos</span><strong>{dashboard?.totalClients ?? '—'}</strong></article><article><span>Receita concluída</span><strong>{dashboard ? dashboard.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</strong></article></div><div className="admin-panel"><h2>Próximos agendamentos</h2>{dashboard?.nextAppointments?.length ? dashboard.nextAppointments.map((item) => <div className="appointment-row" key={item.id}><strong>{item.client.name}</strong><span>{item.service.name}</span><time>{new Date(item.startAt).toLocaleString('pt-BR')}</time></div>) : <p className="empty">Nenhum agendamento próximo.</p>}</div></section></main>
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash)
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route === '#/admin' ? <Admin/> : <PublicSite/>
}
