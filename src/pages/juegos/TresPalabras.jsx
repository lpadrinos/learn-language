import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { supabase } from '../../lib/supabase'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const BANCO = {
  es: ['perro', 'lluvia', 'beso', 'luna', 'café', 'playa', 'miedo', 'risa', 'sueño', 'fuego', 'carta', 'ventana', 'música', 'secreto', 'viaje'],
  nl: ['hond', 'regen', 'kus', 'maan', 'koffie', 'strand', 'angst', 'lach', 'droom', 'vuur', 'brief', 'raam', 'muziek', 'geheim', 'reis'],
}

function palabrasAleatorias(idioma) {
  const banco = [...(BANCO[idioma] || BANCO.es)]
  const res = []
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * banco.length)
    res.push(banco.splice(idx, 1)[0])
  }
  return res
}

function contarPalabras(texto) {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

export default function TresPalabras() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.TRES_PALABRAS, pareja?.id, userId)

  // Fase de palabras de la pareja
  const [palabrasInput, setPalabrasInput] = useState(['', '', ''])
  const [palabras, setPalabras] = useState([])
  const [faseEscribirPalabras, setFaseEscribirPalabras] = useState(false)

  const [historia, setHistoria] = useState('')
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  // Audio
  const [modoAudio, setModoAudio] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [segundosGrabados, setSegundosGrabados] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerGrabacionRef = useRef(null)

  // Guardar historia
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const idiomaNativo = profile?.idioma_habla || 'es'
  const idiomaAprende = profile?.idioma_aprende || 'nl'

  useEffect(() => { solicitarPermisoNotificaciones() }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización!', { body: 'Tres Palabras: Se actualizó algo' })
    }
  }, [sesion?.updated_at])

  // AUDIO
  async function iniciarGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setGrabando(true)
      setSegundosGrabados(0)
      timerGrabacionRef.current = setInterval(() => {
        setSegundosGrabados(s => {
          if (s >= 59) {
            detenerGrabacion()
            return 60
          }
          return s + 1
        })
      }, 1000)
    } catch { alert('No se pudo acceder al micrófono') }
  }

  function detenerGrabacion() {
    clearInterval(timerGrabacionRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    setGrabando(false)
  }

  function descartarAudio() {
    setAudioBlob(null)
    setAudioUrl(null)
    setSegundosGrabados(0)
    setGrabando(false)
  }

  async function enviarHistoria() {
    const textoPalabras = palabras.length > 0 ? palabras : datos.palabras_pareja
    if (!historia.trim() || contarPalabras(historia) < 20) return
    setEnviando(true)
    try {
      let audio_historia_url = null
      if (audioBlob) {
        const path = `${pareja.id}/historia-${Date.now()}.webm`
        const { error: upErr } = await supabase.storage.from('audios').upload(path, audioBlob, { upsert: false, contentType: 'audio/webm' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('audios').getPublicUrl(path)
          audio_historia_url = urlData.publicUrl
        }
      }
      await crear({
        palabras: textoPalabras,
        historia: historia.trim(),
        audio_historia_url,
        idioma_usado: idiomaAprende,
      })
    } catch { alert('Error al enviar') }
    setHistoria('')
    setAudioBlob(null)
    setAudioUrl(null)
    setEnviando(false)
  }

  async function evaluar(encanto) {
    setEnviando(true)
    try {
      if (encanto) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.TRES_PALABRAS, PUNTOS_JUEGO.tres_palabras)
        setShowPuntos(true)
      }
      await actualizar(sesion.id, 'finalizado', { ...datos, encanto, comentario: comentario.trim() })
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  async function guardarHistoria() {
    if (guardado) return
    setGuardando(true)
    try {
      const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
      const autorId = esIniciador ? userId : respondedorId
      await supabase.from('historias_guardadas').insert({
        pareja_id: pareja.id,
        autor_id: autorId,
        palabras: datos.palabras,
        historia: datos.historia,
        audio_url: datos.audio_historia_url || null,
        puntuacion: datos.encanto || false,
      })
      setGuardado(true)
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}
      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>TRES PALABRAS, UNA HISTORIA</h1>
      <PuntosAnimacion puntos={PUNTOS_JUEGO.tres_palabras} visible={showPuntos} />

      {/* Sin sesión — pantalla inicial */}
      {!sesion && !faseEscribirPalabras && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>
            Reta a tu pareja. Ellos escribirán 3 palabras para que tú construyas una historia en {idiomaAprende === 'nl' ? 'holandés' : 'español'}.
          </p>
          <button className="btn-primary" onClick={() => setFaseEscribirPalabras(true)}>Empezar reto</button>
          <button
            onClick={() => navigate('/historias')}
            style={{ background: 'none', color: '#30699b', fontSize: 14, padding: '12px 0', fontWeight: 600, textAlign: 'center' }}>
            Ver historias guardadas
          </button>
        </div>
      )}

      {/* Fase: la pareja escribe 3 palabras */}
      {!sesion && faseEscribirPalabras && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Pásale el teléfono a <strong>{parejaProfile?.nombre || 'tu pareja'}</strong>
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>
              Que escriba 3 palabras en {idiomaNativo === 'es' ? 'español' : 'holandés'} para que las uses en tu historia.
            </p>
          </div>
          {palabrasInput.map((p, i) => (
            <input
              key={i}
              className="input-field"
              placeholder={`Palabra ${i + 1}`}
              value={p}
              onChange={e => {
                const next = [...palabrasInput]
                next[i] = e.target.value
                setPalabrasInput(next)
              }}
            />
          ))}
          <button
            className="btn-primary"
            disabled={palabrasInput.some(p => !p.trim())}
            onClick={() => {
              setPalabras(palabrasInput.map(p => p.trim()))
              setFaseEscribirPalabras(false)
            }}>
            Listo — Ver mis palabras
          </button>
          <button style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 14, padding: '8px 0' }}
            onClick={() => setFaseEscribirPalabras(false)}>
            Cancelar
          </button>
        </div>
      )}

      {/* Iniciador escribe la historia */}
      {!sesion && palabras.length > 0 && !faseEscribirPalabras && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Usa estas 3 palabras para escribir una historia en <strong>{idiomaAprende === 'nl' ? 'holandés' : 'español'}</strong>.</p>

          <div style={{ display: 'flex', gap: 10 }}>
            {palabras.map((p, i) => (
              <div key={i} style={s.palabraCard}><p style={s.palabraText}>{p}</p></div>
            ))}
          </div>

          {/* Toggle texto / audio */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setModoAudio(false)} style={{ ...s.toggleBtn, background: !modoAudio ? '#30699b' : 'var(--bg-secondary)', color: !modoAudio ? '#fff' : 'var(--text-secondary)', flex: 1 }}>
              Escribir
            </button>
            <button onClick={() => setModoAudio(true)} style={{ ...s.toggleBtn, background: modoAudio ? '#30699b' : 'var(--bg-secondary)', color: modoAudio ? '#fff' : 'var(--text-secondary)', flex: 1 }}>
              Grabar audio
            </button>
          </div>

          {!modoAudio ? (
            <div>
              <p style={{ ...s.cardLabel, marginBottom: 8 }}>
                Escribe tu historia en <strong>{idiomaAprende === 'nl' ? 'holandés' : 'español'}</strong> (mín. 20 palabras)
              </p>
              <textarea
                className="input-field"
                placeholder="Érase una vez..."
                value={historia}
                onChange={e => setHistoria(e.target.value)}
                style={{ minHeight: 160, resize: 'vertical', fontFamily: 'inherit', fontSize: 15 }}
              />
              <p style={{ fontSize: 12, color: contarPalabras(historia) >= 20 ? '#4caf50' : 'var(--text-hint)', marginTop: 4, textAlign: 'right' }}>
                {contarPalabras(historia)} palabras {contarPalabras(historia) < 20 ? `(faltan ${20 - contarPalabras(historia)})` : '✓'}
              </p>
            </div>
          ) : (
            <div style={s.card}>
              <p style={{ ...s.cardLabel, marginBottom: 12 }}>Graba leyendo tu historia (máx. 60s)</p>
              {!audioBlob ? (
                <>
                  {grabando ? (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#ff4444' }}>{segundosGrabados}s</p>
                      <p style={{ fontSize: 13, color: 'var(--text-hint)', marginBottom: 12 }}>Grabando...</p>
                      <button onClick={detenerGrabacion} style={{ ...s.toggleBtn, background: '#ff4444', color: '#fff', width: '100%' }}>■ Detener</button>
                    </div>
                  ) : (
                    <button onClick={iniciarGrabacion} style={{ ...s.toggleBtn, background: '#30699b', color: '#fff', width: '100%' }}>◉ Iniciar grabación</button>
                  )}
                </>
              ) : (
                <div>
                  <audio src={audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />
                  <button onClick={descartarAudio} style={{ ...s.toggleBtn, background: 'rgba(255,80,80,0.15)', color: '#ff4444', width: '100%' }}>✕ Descartar y volver a grabar</button>
                </div>
              )}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={enviarHistoria}
            disabled={enviando || (!modoAudio && contarPalabras(historia) < 20) || (modoAudio && !audioBlob)}>
            {enviando ? <span className="loader" /> : 'ENVIAR HISTORIA'}
          </button>
        </div>
      )}

      {/* Iniciador esperando */}
      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}>
            <p style={s.cardLabel}>Palabras usadas</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {datos.palabras?.map((p, i) => <span key={i} style={s.badge}>{p}</span>)}
            </div>
          </div>
          <div style={s.card}>
            <p style={s.cardLabel}>Tu historia</p>
            <p style={s.historia}>{datos.historia}</p>
            {datos.audio_historia_url && (
              <audio src={datos.audio_historia_url} controls style={{ width: '100%', marginTop: 12 }} />
            )}
          </div>
          <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} la evalúe...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* Pareja evalúa */}
      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¡Lee la historia de {parejaProfile?.nombre || 'tu pareja'}!</p>
          <div style={s.card}>
            <p style={s.cardLabel}>Palabras usadas</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {datos.palabras?.map((p, i) => <span key={i} style={s.badge}>{p}</span>)}
            </div>
            <p style={s.cardLabel}>Historia</p>
            <p style={s.historia}>{datos.historia}</p>
            {datos.audio_historia_url && (
              <audio src={datos.audio_historia_url} controls style={{ width: '100%', marginTop: 12 }} />
            )}
          </div>
          <textarea
            className="input-field"
            placeholder="Comentario opcional..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={s.btnRow}>
            <button className="btn-primary" onClick={() => evaluar(true)} disabled={enviando} style={{ flex: 1 }}>Me encantó ♥</button>
            <button className="btn-outline" onClick={() => evaluar(false)} disabled={enviando} style={{ flex: 1 }}>Puedes más ✕</button>
          </div>
        </div>
      )}

      {/* Finalizado */}
      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.card}>
            <p style={s.cardLabel}>Palabras</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {datos.palabras?.map((p, i) => <span key={i} style={s.badge}>{p}</span>)}
            </div>
            <p style={s.cardLabel}>Historia</p>
            <p style={s.historia}>{datos.historia}</p>
            {datos.audio_historia_url && (
              <audio src={datos.audio_historia_url} controls style={{ width: '100%', marginTop: 12 }} />
            )}
          </div>
          {datos.comentario && (
            <div style={s.card}><p style={s.cardLabel}>Comentario</p><p style={{ fontSize: 15, lineHeight: 1.5 }}>{datos.comentario}</p></div>
          )}
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: datos.encanto ? '#4caf50' : '#ff6b6b' }}>
            {datos.encanto ? `¡Le encantó! +${PUNTOS_JUEGO.tres_palabras}pts` : 'Puedes hacerlo mejor la próxima vez'}
          </p>
          <button
            onClick={guardarHistoria}
            disabled={guardando || guardado}
            style={{ background: guardado ? 'rgba(76,175,80,0.15)' : 'rgba(48,105,155,0.15)', border: `1px solid ${guardado ? '#4caf50' : '#30699b'}`, borderRadius: 12, padding: '14px', color: guardado ? '#4caf50' : '#30699b', fontWeight: 600, fontSize: 15, cursor: guardado ? 'default' : 'pointer' }}>
            {guardado ? '✓ Historia guardada' : guardando ? <span className="loader" /> : 'Guardar historia'}
          </button>
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
  historia: { fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)' },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  btnRow: { display: 'flex', gap: 12 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
  palabraCard: { flex: 1, background: '#30699b', borderRadius: 12, padding: '14px 8px', textAlign: 'center' },
  palabraText: { fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-title)' },
  badge: { background: 'rgba(48,105,155,0.2)', color: '#30699b', padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 600 },
  toggleBtn: { border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 },
}
