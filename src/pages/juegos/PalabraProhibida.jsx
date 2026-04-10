import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const DURACIONES = [
  { label: '1 día', dias: 1 },
  { label: '2 días', dias: 2 },
  { label: '3 días', dias: 3 },
]

export default function PalabraProhibida() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.PALABRA_PROHIBIDA, pareja?.id, userId)
  const [palabraEs, setPalabraEs] = useState('')
  const [palabraNl, setPalabraNl] = useState('')
  const [duracion, setDuracion] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [tiempoRestante, setTiempoRestante] = useState('')
  const [terminado, setTerminado] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  const datos = sesion?.datos || {}
  const pts = PUNTOS_JUEGO.palabra_prohibida

  useEffect(() => {
    solicitarPermisoNotificaciones()
  }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización en el juego!', { body: 'Palabra Prohibida: Se actualizó algo' })
    }
  }, [sesion?.updated_at])

  useEffect(() => {
    if (!sesion || sesion.estado !== 'pendiente' || !datos.expira) return
    const interval = setInterval(() => {
      const diff = new Date(datos.expira) - new Date()
      if (diff <= 0) {
        setTerminado(true)
        setTiempoRestante('¡Se acabó el tiempo!')
        enviarNotificacion('⏰ Palabra Prohibida completada', { body: 'Entra y confirma si lo lograron' })
        clearInterval(interval)
        return
      }
      const dias = Math.ceil(diff / 86400000)
      setTiempoRestante(`Faltan ${dias} día${dias !== 1 ? 's' : ''}`)
    }, 60000)
    setTiempoRestante('Activada')
    return () => clearInterval(interval)
  }, [sesion, datos.expira])

  async function activar() {
    if (!palabraEs.trim() || !palabraNl.trim()) return
    setEnviando(true)
    try {
      const expira = new Date(Date.now() + DURACIONES[duracion].dias * 24 * 60 * 60 * 1000).toISOString()
      await crear({ palabra_es: palabraEs.trim(), palabra_nl: palabraNl.trim(), duracion_label: DURACIONES[duracion].label, expira })
    } catch { alert('Error al activar') }
    setPalabraEs('')
    setPalabraNl('')
    setEnviando(false)
  }

  async function confirmarLogro() {
    setEnviando(true)
    try {
      const confirmaciones = datos.confirmaciones || []
      if (confirmaciones.includes(userId)) return
      const nuevas = [...confirmaciones, userId]
      if (nuevas.length >= 2) {
        await otorgarPuntos(sesion.iniciador_id, pareja.id, TIPOS_JUEGO.PALABRA_PROHIBIDA, pts)
        setShowPuntos(true)
        await actualizar(sesion.id, 'finalizado', { ...datos, confirmaciones: nuevas, logrado: true })
      } else {
        await actualizar(sesion.id, 'pendiente', { ...datos, confirmaciones: nuevas })
      }
    } catch { alert('Error al confirmar') }
    setEnviando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  const yaConfirmo = (datos.confirmaciones || []).includes(userId)

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}

      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>LA PALABRA PROHIBIDA</h1>
      <PuntosAnimacion puntos={pts} visible={showPuntos} />

      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Elige una palabra que ambos no podrán decir durante los días que elijas.</p>
          <input className="input-field" placeholder="Palabra en español" value={palabraEs} onChange={e => setPalabraEs(e.target.value)} />
          <input className="input-field" placeholder="Palabra en holandés" value={palabraNl} onChange={e => setPalabraNl(e.target.value)} />
          <div style={s.durRow}>
            {DURACIONES.map((d, i) => (
              <button key={i} onClick={() => setDuracion(i)} style={duracion === i ? s.durActive : s.durBtn}>{d.label}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={activar} disabled={enviando || !palabraEs.trim() || !palabraNl.trim()}>
            {enviando ? <span className="loader" /> : 'JUGAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}>
            <p style={s.cardLabel}>Palabra prohibida</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '12px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🇪🇸 ES</p>
                <p style={s.cardValue}>{datos.palabra_es}</p>
              </div>
              <span style={{ color: 'var(--text-hint)', fontSize: 20 }}>↔</span>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🇳🇱 NL</p>
                <p style={s.cardValue}>{datos.palabra_nl}</p>
              </div>
            </div>
          </div>

          <div style={{ ...s.card, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{terminado ? 'Resultado' : 'Tiempo restante'}</p>
            <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-title)', color: terminado ? '#4caf50' : '#30699b' }}>
              {tiempoRestante || 'Calculando...'}
            </p>
          </div>

          {terminado && (
            <>
              {yaConfirmo ? (
                <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} confirme...</p>
              ) : (
                <button className="btn-primary" onClick={confirmarLogro} disabled={enviando}>
                  {enviando ? <span className="loader" /> : 'CONTINUAR - Lo logramos ✓'}
                </button>
              )}
            </>
          )}

          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}>
            <p style={s.cardLabel}>Palabra prohibida</p>
            <p style={s.cardValue}>{datos.palabra_es} ↔ {datos.palabra_nl}</p>
          </div>
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#4caf50' }}>
            ¡Lo lograron! +{pts}pts
          </p>
          <button className="btn-primary" onClick={() => navigate('/inicio')}>Volver al inicio</button>
        </div>
      )}
    </div>
  )
}

const s = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  back: { background: 'none', color: 'var(--text-secondary)', fontSize: 15, padding: 0, marginBottom: 16 },
  title: { fontFamily: 'var(--font-title)', fontSize: 24, marginBottom: 20 },
  content: { display: 'flex', flexDirection: 'column', gap: 16 },
  instruccion: { color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5 },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  durRow: { display: 'flex', gap: 10 },
  durBtn: { flex: 1, padding: 12, background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14, minHeight: 44 },
  durActive: { flex: 1, padding: 12, background: '#30699b', border: '1.5px solid #30699b', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, minHeight: 44 },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
