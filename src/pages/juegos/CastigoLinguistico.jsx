import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { supabase } from '../../lib/supabase'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

export default function CastigoLinguistico() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.CASTIGO_LINGUISTICO, pareja?.id, userId)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  // Audio recording
  const [grabando, setGrabando] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const pts = PUNTOS_JUEGO.castigo_linguistico

  useEffect(() => { return () => { clearInterval(timer.current) } }, [])

  useEffect(() => {
    solicitarPermisoNotificaciones()
  }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización en el juego!', { body: 'Castigo Lingüístico: Se actualizó algo' })
    }
  }, [sesion?.updated_at])

  async function startGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunks.current = []
      recorder.ondataavailable = e => chunks.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current = recorder
      recorder.start()
      setGrabando(true)
      setSegundos(0)
      timer.current = setInterval(() => {
        setSegundos(s => {
          if (s >= 59) { stopGrabacion(); return 60 }
          return s + 1
        })
      }, 1000)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  function stopGrabacion() {
    clearInterval(timer.current)
    setGrabando(false)
    mediaRecorder.current?.stop()
  }

  async function enviarReto() {
    if (!texto.trim()) return
    setEnviando(true)
    try { await crear({ frase: texto.trim() }) }
    catch { alert('Error al enviar') }
    setTexto('')
    setEnviando(false)
  }

  async function enviarAudio() {
    if (!audioBlob) return
    setEnviando(true)
    try {
      const path = `${pareja.id}/${sesion.id}.webm`
      const { error: upErr } = await supabase.storage.from('audios').upload(path, audioBlob, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('audios').getPublicUrl(path)
      await actualizar(sesion.id, 'respondido', { ...datos, audio_url: urlData.publicUrl })
      setAudioBlob(null)
      setAudioUrl(null)
    } catch (e) {
      alert(`Error al subir audio: ${e.message}`)
    }
    setEnviando(false)
  }

  async function evaluar(aceptado) {
    setEnviando(true)
    try {
      if (aceptado) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.CASTIGO_LINGUISTICO, pts)
        setShowPuntos(true)
        await actualizar(sesion.id, 'finalizado', { ...datos, aceptado: true })
      } else {
        await actualizar(sesion.id, 'pendiente', { ...datos, audio_url: null })
      }
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}

      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>CASTIGO LINGÜÍSTICO</h1>
      <PuntosAnimacion puntos={pts} visible={showPuntos} />

      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Escribe una frase ridícula que {parejaProfile?.nombre || 'tu pareja'} deberá cantar o decir.</p>
          <input className="input-field" placeholder="Frase ridícula..." value={texto} onChange={e => setTexto(e.target.value)} />
          <button className="btn-primary" onClick={enviarReto} disabled={enviando || !texto.trim()}>
            {enviando ? <span className="loader" /> : 'JUGAR'}
          </button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase enviada</p><p style={s.cardValue}>{datos.frase}</p></div>
          <p style={s.esperando}>Esperando el audio de {parejaProfile?.nombre || 'tu pareja'}...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¡Tienes un reto! Graba cómo dices esta frase:</p>
          <div style={s.card}><p style={s.cardValue}>{datos.frase}</p></div>

          {!audioUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <button
                onClick={grabando ? stopGrabacion : startGrabacion}
                style={{ ...s.recBtn, background: grabando ? '#ff6b6b' : '#30699b' }}
              >
                {grabando ? '■' : '◉'}
              </button>
              {grabando && <p style={{ color: '#ff6b6b', fontWeight: 600 }}>{segundos}s / 60s</p>}
              <p style={{ color: 'var(--text-hint)', fontSize: 13 }}>{grabando ? 'Toca para detener' : 'Toca para grabar'}</p>
            </div>
          ) : (
            <div style={s.content}>
              <audio src={audioUrl} controls style={{ width: '100%' }} />
              <div style={s.btnRow}>
                <button className="btn-outline" onClick={() => { setAudioBlob(null); setAudioUrl(null) }} style={{ flex: 1 }}>Regrabar</button>
                <button className="btn-primary" onClick={enviarAudio} disabled={enviando} style={{ flex: 1 }}>
                  {enviando ? <span className="loader" /> : 'CONTINUAR'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {sesion?.estado === 'respondido' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase}</p></div>
          <audio src={datos.audio_url} controls style={{ width: '100%' }} />
          <div style={s.btnRow}>
            <button className="btn-primary" onClick={() => evaluar(true)} disabled={enviando} style={{ flex: 1 }}>Acepto ✓</button>
            <button className="btn-outline" onClick={() => evaluar(false)} disabled={enviando} style={{ flex: 1 }}>Repite ✕</button>
          </div>
        </div>
      )}

      {sesion?.estado === 'respondido' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardLabel}>Frase</p><p style={s.cardValue}>{datos.frase}</p></div>
          <p style={s.esperando}>Esperando evaluación...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 16 }}>← Volver al inicio</button>
        </div>
      )}

      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}><p style={s.cardValue}>{datos.frase}</p></div>
          {datos.audio_url && <audio src={datos.audio_url} controls style={{ width: '100%' }} />}
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#4caf50' }}>
            ¡Aceptado! +{pts}pts
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
  recBtn: { width: 80, height: 80, borderRadius: '50%', border: 'none', fontSize: 32, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
