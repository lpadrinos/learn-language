import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

export default function RetoBeso() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.RETO_BESO, pareja?.id, userId)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const pts = PUNTOS_JUEGO.reto_beso

  useEffect(() => {
    solicitarPermisoNotificaciones()
  }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización en el juego!', { body: 'Reto del Beso: Se actualizó algo' })
    }
  }, [sesion?.updated_at])

  async function enviarReto() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await crear({ frase: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  async function enviarTraduccion() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await actualizar(sesion.id, 'respondido', { ...datos, traduccion: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  async function evaluar(correcto) {
    setEnviando(true)
    try {
      if (correcto) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.RETO_BESO, pts)
        setShowPuntos(true)
        await actualizar(sesion.id, 'finalizado', { ...datos, correcto: true })
      } else {
        await actualizar(sesion.id, 'castigo', { ...datos, correcto: false })
      }
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  async function enviarCastigo() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await actualizar(sesion.id, 'finalizado', { ...datos, castigo: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}

      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>EL RETO DEL BESO</h1>
      <PuntosAnimacion puntos={pts} visible={showPuntos} />

      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Escribe una frase en tu idioma para que {parejaProfile?.nombre || 'tu pareja'} la traduzca.</p>
          <input className="input-field" placeholder="Escribe la frase..." value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarReto} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'JUGAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase enviada</p><p style={s.cardValue}>{datos.frase}</p></div>
          <p style={s.esperando}>Esperando traducción de {parejaProfile?.nombre || 'tu pareja'}...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¡Tienes un reto! Traduce esta frase:</p>
          <div style={s.card}><p style={s.cardValue}>{datos.frase}</p></div>
          <input className="input-field" placeholder="Tu traducción..." value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarTraduccion} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'CONTINUAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'respondido' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Tu frase</p><p style={s.cardValue}>{datos.frase}</p></div>
          <div style={s.card}><p style={s.cardLabel}>Traducción de {parejaProfile?.nombre}</p><p style={s.cardValue}>{datos.traduccion}</p></div>
          <div style={s.btnRow}>
            <button className="btn-primary" onClick={() => evaluar(true)} disabled={enviando} style={{ flex: 1 }}>¡Correcto! ✓</button>
            <button className="btn-outline" onClick={() => evaluar(false)} disabled={enviando} style={{ flex: 1 }}>Incorrecto ✕</button>
          </div>
        </div>
      )}

      {sesion?.estado === 'respondido' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase}</p></div>
          <div style={s.card}><p style={s.cardLabel}>Tu traducción</p><p style={s.cardValue}>{datos.traduccion}</p></div>
          <p style={s.esperando}>Esperando evaluación...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'castigo' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={{ color: '#ff6b6b', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>Traducción incorrecta ❌</p>
          <p style={s.instruccion}>Escribe el castigo para {parejaProfile?.nombre || 'tu pareja'}:</p>
          <input className="input-field" placeholder="El castigo es..." value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarCastigo} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'CONTINUAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'castigo' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={{ color: '#ff6b6b', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>Tu traducción fue incorrecta ❌</p>
          <p style={s.esperando}>Esperando tu castigo...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase}</p></div>
          {datos.traduccion && <div style={s.card}><p style={s.cardLabel}>Traducción</p><p style={s.cardValue}>{datos.traduccion}</p></div>}

          {datos.correcto ? (
            <p style={{ textAlign: 'center', fontSize: 40 }}>✓</p>
          ) : null}

          {datos.castigo && (
            <div style={{ ...s.card, borderColor: '#ff6b6b' }}>
              <p style={s.cardLabel}>Castigo</p>
              <p style={{ ...s.cardValue, color: '#ff6b6b' }}>{datos.castigo}</p>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: datos.correcto ? '#4caf50' : '#ff6b6b' }}>
            {datos.correcto ? `¡Correcto! +${pts}pts` : 'Incorrecto — ¡castigo asignado!'}
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
  btnRow: { display: 'flex', gap: 12 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
