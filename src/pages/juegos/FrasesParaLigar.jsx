import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const SITUACIONES = [
  'Estás en un café en Ámsterdam y ves a alguien leyendo tu libro favorito',
  'Compartes paraguas con un extraño en la lluvia en Rotterdam',
  'Estás en un mercado de flores y alguien escoge las mismas flores que tú',
  'Coincides con alguien en el último asiento del tren a Madrid',
  'Alguien te pide que le enseñes a bailar salsa',
  'Están los dos esperando el mismo vuelo cancelado',
  'Te sientas al lado de alguien en un concierto y se saben la misma canción',
  'Alguien te pide direcciones y está completamente perdido en tu ciudad',
  'Están atrapados juntos en un ascensor por 20 minutos',
  'Coinciden en la misma clase de idiomas',
  'Ambos llegan al mismo tiempo a recoger el mismo pedido de comida',
  'Están sentados uno al lado del otro en una boda de desconocidos',
  'Te caes en la calle y alguien te ayuda a levantarte',
  'Ambos están mirando el mismo cuadro en un museo',
  'Están en la misma fila del supermercado con exactamente los mismos productos',
  'Es el último día de vacaciones y ambos esperan el mismo taxi al aeropuerto',
  'Se encuentran en la misma librería buscando el mismo libro',
  'Están en el mismo tour turístico y el guía los empareja',
]

function puntosPorPuntuacion(n) {
  if (n <= 4) return PUNTOS_JUEGO.frases_ligar.bajo
  if (n <= 7) return PUNTOS_JUEGO.frases_ligar.medio
  if (n <= 9) return PUNTOS_JUEGO.frases_ligar.alto
  return PUNTOS_JUEGO.frases_ligar.perfecto
}

function situacionAleatoria() {
  return SITUACIONES[Math.floor(Math.random() * SITUACIONES.length)]
}

export default function FrasesParaLigar() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.FRASES_LIGAR, pareja?.id, userId)

  const [situacion, setSituacion] = useState('')
  const [cambios, setCambios] = useState(0)
  const [frase, setFrase] = useState('')
  const [puntuacion, setPuntuacion] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [puntosVal, setPuntosVal] = useState(0)
  const [actualizado, setActualizado] = useState(false)

  // Stats & mejores frases
  const [verMejoresFrases, setVerMejoresFrases] = useState(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const idiomaAprende = profile?.idioma_aprende || 'nl'

  useEffect(() => { solicitarPermisoNotificaciones() }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización!', { body: 'Frases para Ligar: nueva acción' })
    }
  }, [sesion?.updated_at])

  function getPuntuacionesKey() { return `ligar_puntuaciones_${userId}` }
  function getMejoresFrasesKey() { return `ligar_mejores_${userId}` }

  function guardarPuntuacionLocal(puntos, fraseTexto, situacionTexto) {
    try {
      const key = getPuntuacionesKey()
      const stored = JSON.parse(localStorage.getItem(key) || '[]')
      stored.push({ puntos, frase: fraseTexto, situacion: situacionTexto, fecha: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(stored))
    } catch {}
  }

  function getPromedioLocal() {
    try {
      const stored = JSON.parse(localStorage.getItem(getPuntuacionesKey()) || '[]')
      if (!stored.length) return null
      const total = stored.reduce((sum, s) => sum + (s.puntos || 0), 0)
      return (total / stored.length).toFixed(1)
    } catch { return null }
  }

  function getMejoresFrasesLocal() {
    try {
      const stored = JSON.parse(localStorage.getItem(getPuntuacionesKey()) || '[]')
      return stored.sort((a, b) => b.puntos - a.puntos).slice(0, 5)
    } catch { return [] }
  }

  const promedio = getPromedioLocal()
  const mejoresFrases = getMejoresFrasesLocal()

  function generar() {
    setSituacion(situacionAleatoria())
  }

  function cambiarSituacion() {
    if (cambios >= 2) return
    setCambios(c => c + 1)
    setSituacion(situacionAleatoria())
  }

  async function enviarFrase() {
    if (!frase.trim()) return
    setEnviando(true)
    try { await crear({ situacion, frase: frase.trim(), idioma_usado: idiomaAprende }) }
    catch { alert('Error al enviar') }
    setFrase('')
    setEnviando(false)
  }

  async function enviarPuntuacion() {
    const pts = puntosPorPuntuacion(puntuacion)
    setEnviando(true)
    try {
      const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
      await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.FRASES_LIGAR, pts)
      setPuntosVal(pts)
      setShowPuntos(true)
      await actualizar(sesion.id, 'finalizado', { ...datos, puntuacion, comentario: comentario.trim(), puntos: pts })
      // Guardar en localStorage para la persona que recibe la puntuacion
      guardarPuntuacionLocal(puntuacion, datos.frase, datos.situacion)
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  // Pantalla "Mis mejores frases"
  if (verMejoresFrases) {
    return (
      <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px' }}>
        <button onClick={() => setVerMejoresFrases(false)} style={s.back}>← Volver</button>
        <h1 style={s.title}>MIS MEJORES FRASES</h1>
        {mejoresFrases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Aún no tienes frases puntuadas</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mejoresFrases.map((mf, i) => (
              <div key={i} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-hint)' }}>#{i + 1}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{mf.puntos}/10</span>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text-primary)', marginBottom: 8 }}>{mf.frase}</p>
                <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>{mf.situacion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}
      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>FRASES PARA LIGAR</h1>
      <PuntosAnimacion puntos={puntosVal} visible={showPuntos} />

      {/* Sin sesión */}
      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Escribe tu mejor frase de flirteo en <strong>{idiomaAprende === 'nl' ? 'holandés' : 'español'}</strong> para la situación que te toque.</p>

          {/* Stats */}
          {promedio && (
            <div style={{ ...s.card, background: 'rgba(48,105,155,0.1)', border: '1px solid #30699b', textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{promedio}/10</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Tu promedio de puntuación</p>
            </div>
          )}

          {!situacion ? (
            <button className="btn-primary" onClick={generar}>Ver mi situación</button>
          ) : (
            <>
              <div style={s.situacionCard}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Tu situación</p>
                <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: '#fff' }}>{situacion}</p>
              </div>

              <button
                onClick={cambiarSituacion}
                disabled={cambios >= 2}
                style={{ background: 'none', color: cambios >= 2 ? 'var(--text-hint)' : '#30699b', fontSize: 14, padding: 0, fontWeight: 600 }}
              >
                Dame otra situación ({2 - cambios} restantes)
              </button>

              <div>
                <p style={{ ...s.cardLabel, marginBottom: 8 }}>
                  Tu frase en <strong>{idiomaAprende === 'nl' ? 'holandés' : 'español'}</strong>
                </p>
                <textarea
                  className="input-field"
                  placeholder="Escribe tu frase de flirteo..."
                  value={frase}
                  onChange={e => e.target.value.length <= 200 && setFrase(e.target.value)}
                  style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 15 }}
                />
                <p style={{ fontSize: 12, color: frase.length > 180 ? '#ff6b6b' : 'var(--text-hint)', textAlign: 'right', marginTop: 4 }}>
                  {frase.length}/200
                </p>
              </div>

              <button className="btn-primary" onClick={enviarFrase} disabled={enviando || !frase.trim()}>
                {enviando ? <span className="loader" /> : 'ENVIAR FRASE'}
              </button>
            </>
          )}

          {/* Botón mejores frases */}
          {mejoresFrases.length > 0 && (
            <button
              onClick={() => setVerMejoresFrases(true)}
              style={{ background: 'none', color: '#30699b', fontSize: 14, padding: '8px 0', fontWeight: 600, textAlign: 'center' }}>
              Ver mis mejores frases ({mejoresFrases.length})
            </button>
          )}
        </div>
      )}

      {/* Iniciador espera */}
      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.situacionCard}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Situación</p>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: '#fff' }}>{datos.situacion}</p>
          </div>
          <div style={s.card}><p style={s.cardLabel}>Tu frase</p><p style={s.fraseText}>{datos.frase}</p></div>
          <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} la puntúe...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* Pareja puntúa */}
      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={s.situacionCard}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Situación</p>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: '#fff' }}>{datos.situacion}</p>
          </div>
          <div style={s.card}><p style={s.cardLabel}>Frase de {parejaProfile?.nombre || 'tu pareja'}</p><p style={s.fraseText}>{datos.frase}</p></div>

          {/* Slider de puntuación */}
          <div style={s.card}>
            <p style={s.cardLabel}>Puntuación</p>
            <p style={{ textAlign: 'center', fontSize: 48, fontWeight: 900, fontFamily: 'var(--font-title)', color: '#30699b', margin: '8px 0' }}>{puntuacion}</p>
            <input
              type="range"
              min={1}
              max={10}
              value={puntuacion}
              onChange={e => setPuntuacion(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#30699b' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-hint)', marginTop: 4 }}>
              <span>1 — Intenta más</span>
              <span>10 — Perfecto</span>
            </div>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#4caf50', marginTop: 8, fontWeight: 600 }}>
              +{puntosPorPuntuacion(puntuacion)}pts
            </p>
          </div>

          <textarea
            className="input-field"
            placeholder="Comentario opcional..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
          />

          <button className="btn-primary" onClick={enviarPuntuacion} disabled={enviando}>
            {enviando ? <span className="loader" /> : 'Enviar puntuación'}
          </button>
        </div>
      )}

      {/* Finalizado */}
      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <div style={s.situacionCard}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Situación</p>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: '#fff' }}>{datos.situacion}</p>
          </div>
          <div style={s.card}><p style={s.cardLabel}>La frase</p><p style={s.fraseText}>{datos.frase}</p></div>
          {datos.comentario && <div style={s.card}><p style={s.cardLabel}>Comentario</p><p style={{ fontSize: 15, lineHeight: 1.5 }}>{datos.comentario}</p></div>}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 72, fontWeight: 900, fontFamily: 'var(--font-title)', color: '#30699b', lineHeight: 1 }}>{datos.puntuacion}</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>/ 10</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#4caf50', marginTop: 8 }}>+{datos.puntos}pts</p>
          </div>
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
  fraseText: { fontSize: 17, lineHeight: 1.6, color: 'var(--text-primary)', fontStyle: 'italic' },
  situacionCard: { background: '#30699b', borderRadius: 14, padding: 18 },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
