import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const idiomaLabel = (code) => code === 'nl' ? 'holandés' : code === 'es' ? 'español' : code

export default function CompletaFrase() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.COMPLETA_FRASE, pareja?.id, userId)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const pts = PUNTOS_JUEGO.completa_frase
  const idiomaPareja = parejaProfile?.idioma_aprende

  useEffect(() => {
    solicitarPermisoNotificaciones()
  }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización en el juego!', { body: 'Completa la Frase: Se actualizó algo' })
    }
  }, [sesion?.updated_at])

  async function enviarReto() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await crear({ frase_incompleta: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  async function enviarCompletada() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await actualizar(sesion.id, 'respondido', { ...datos, completada: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  async function evaluar(gustó) {
    setEnviando(true)
    try {
      if (gustó) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.COMPLETA_FRASE, pts)
        setShowPuntos(true)
      }
      await actualizar(sesion.id, 'finalizado', { ...datos, gustó })
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}

      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>COMPLETA LA FRASE PÍCARA</h1>
      <PuntosAnimacion puntos={pts} visible={showPuntos} />

      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Escribe una frase incompleta romántica o pícara en tu idioma.</p>
          <p style={s.nota}>Tu pareja la completará en {idiomaLabel(idiomaPareja)}</p>
          <input className="input-field" placeholder="Ej: Me gustaría que tú..." value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarReto} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'JUGAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase enviada</p><p style={s.cardValue}>{datos.frase_incompleta}</p></div>
          <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} la complete...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¡Completa esta frase en {idiomaLabel(profile?.idioma_aprende)}!</p>
          <div style={s.card}><p style={s.cardValue}>{datos.frase_incompleta}</p></div>
          <input className="input-field" placeholder={`Completa en ${idiomaLabel(profile?.idioma_aprende)}...`} value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarCompletada} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'CONTINUAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'respondido' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Tu frase</p><p style={s.cardValue}>{datos.frase_incompleta}</p></div>
          <div style={s.card}><p style={s.cardLabel}>{parejaProfile?.nombre} completó</p><p style={s.cardValue}>{datos.completada}</p></div>
          <div style={s.btnRow}>
            <button className="btn-primary" onClick={() => evaluar(true)} disabled={enviando} style={{ flex: 1 }}>Me encantó ♥</button>
            <button className="btn-outline" onClick={() => evaluar(false)} disabled={enviando} style={{ flex: 1 }}>Puedes más ✕</button>
          </div>
        </div>
      )}

      {sesion?.estado === 'respondido' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase_incompleta}</p></div>
          <div style={s.card}><p style={s.cardLabel}>Tu respuesta</p><p style={s.cardValue}>{datos.completada}</p></div>
          <p style={s.esperando}>Esperando evaluación...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase_incompleta}</p></div>
          <div style={s.card}><p style={s.cardLabel}>Completada</p><p style={s.cardValue}>{datos.completada}</p></div>
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: datos.gustó ? '#4caf50' : '#ff6b6b' }}>
            {datos.gustó ? `¡Le encantó! 🔥 +${pts}pts` : 'Puedes más la próxima vez'}
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
  nota: { color: 'var(--accent)', fontSize: 13, fontWeight: 600, background: 'rgba(48,105,155,0.15)', padding: '8px 12px', borderRadius: 8 },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  btnRow: { display: 'flex', gap: 12 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
