import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const BANCOS = {
  basico: {
    label: 'Básico',
    es: ['perro', 'casa', 'agua', 'libro', 'amor', 'cielo', 'flor', 'tiempo', 'ciudad', 'noche', 'amigo', 'camino', 'verde', 'grande', 'feliz'],
    nl: ['hond', 'huis', 'water', 'boek', 'liefde', 'lucht', 'bloem', 'tijd', 'stad', 'nacht', 'vriend', 'weg', 'groen', 'groot', 'blij'],
  },
  naturaleza: {
    label: 'Naturaleza',
    es: ['árbol', 'río', 'montaña', 'flor', 'mar', 'bosque', 'lluvia', 'sol', 'luna', 'estrella', 'piedra', 'nube', 'viento', 'tierra', 'hoja'],
    nl: ['boom', 'rivier', 'berg', 'bloem', 'zee', 'bos', 'regen', 'zon', 'maan', 'ster', 'steen', 'wolk', 'wind', 'aarde', 'blad'],
  },
  emociones: {
    label: 'Emociones',
    es: ['feliz', 'triste', 'enojado', 'nervioso', 'cansado', 'emocionado', 'asustado', 'sorprendido', 'orgulloso', 'celoso', 'tranquilo', 'confundido', 'aburrido', 'alegre', 'ansioso'],
    nl: ['blij', 'verdrietig', 'boos', 'zenuwachtig', 'moe', 'enthousiast', 'bang', 'verrast', 'trots', 'jaloers', 'rustig', 'verward', 'verveeld', 'vrolijk', 'angstig'],
  },
  casa: {
    label: 'Casa y objetos',
    es: ['mesa', 'silla', 'cama', 'cocina', 'ventana', 'puerta', 'espejo', 'lámpara', 'sofá', 'llave', 'libro', 'reloj', 'taza', 'plato', 'tenedor'],
    nl: ['tafel', 'stoel', 'bed', 'keuken', 'raam', 'deur', 'spiegel', 'lamp', 'bank', 'sleutel', 'boek', 'klok', 'mok', 'bord', 'vork'],
  },
  comida: {
    label: 'Comida',
    es: ['pan', 'leche', 'queso', 'manzana', 'pollo', 'arroz', 'tomate', 'zanahoria', 'naranja', 'huevo', 'mantequilla', 'yogur', 'fresa', 'uva', 'sandía'],
    nl: ['brood', 'melk', 'kaas', 'appel', 'kip', 'rijst', 'tomaat', 'wortel', 'sinaasappel', 'ei', 'boter', 'yoghurt', 'aardbei', 'druif', 'watermeloen'],
  },
}

const CATEGORIAS = Object.keys(BANCOS)
const TIEMPO_TOTAL = 45
const TIEMPO_BONUS = 25

function palabrasAleatorias(categoria, idioma) {
  const banco = [...(BANCOS[categoria]?.[idioma] || BANCOS.basico.es)]
  const res = []
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * banco.length)
    res.push(banco.splice(idx, 1)[0])
  }
  return res
}

function puntosSegunAciertos(n) {
  const tabla = PUNTOS_JUEGO.reto_velocidad
  return tabla[n] || 0
}

// ── Countdown overlay ──────────────────────────────────────────────────────────
function CountdownDuelo({ onDone }) {
  const steps = ['3', '2', '1', '¡YA!']
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (idx >= steps.length) {
      setVisible(false)
      onDone()
      return
    }
    const t = setTimeout(() => setIdx(i => i + 1), idx === steps.length - 1 ? 700 : 900)
    return () => clearTimeout(t)
  }, [idx])

  if (!visible) return null

  const isYa = idx === steps.length - 1
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10, 20, 35, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span
        key={idx}
        style={{
          fontSize: isYa ? 72 : 110,
          fontWeight: 900,
          fontFamily: 'var(--font-title)',
          color: isYa ? '#4caf50' : '#fff',
          animation: 'countPop 0.35s ease-out',
          letterSpacing: isYa ? 2 : 0,
          textShadow: isYa ? '0 0 40px #4caf5066' : '0 0 30px #fff3',
        }}
      >
        {steps[idx]}
      </span>
      <style>{`
        @keyframes countPop {
          0%  { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100%{ transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Puntos animados para duelo (muestra texto personalizado) ──────────────────
function DuelResult({ ganador, nombreGanador, puntosIniciador, puntosRespondedor, empate }) {
  return (
    <div style={{
      ...s.card,
      background: empate
        ? 'rgba(48,105,155,0.12)'
        : 'rgba(76,175,80,0.1)',
      border: `1px solid ${empate ? '#30699b' : '#4caf50'}`,
      textAlign: 'center',
      padding: '24px 18px',
    }}>
      {empate ? (
        <>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#30699b', marginBottom: 6 }}>Empate</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>¡Ambos ganan puntos!</p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Ganador del duelo</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: '#4caf50', marginBottom: 6 }}>{nombreGanador}</p>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 12 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 2 }}>Tú</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#30699b' }}>+{puntosIniciador}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 2 }}>Pareja</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#30699b' }}>+{puntosRespondedor}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RetoVelocidad() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.RETO_VELOCIDAD, pareja?.id, userId)

  // modo UI: 'normal' | 'duelo'
  const [modoUI, setModoUI] = useState('normal')
  const [categoria, setCategoria] = useState('basico')
  const [palabras, setPalabras] = useState([])

  // estado juego normal
  const [respuestas, setRespuestas] = useState(['', '', '', '', ''])
  const [correctas, setCorrectas] = useState([null, null, null, null, null])
  const [tiempo, setTiempo] = useState(TIEMPO_TOTAL)
  const [corriendo, setCorriendo] = useState(false)
  const [terminado, setTerminado] = useState(false)

  // estado duelo
  const [dueloCorriendo, setDueloCorriendo] = useState(false)
  const [dueloTerminado, setDueloTerminado] = useState(false)
  const [dueloRespuestas, setDueloRespuestas] = useState(['', '', '', '', ''])
  const [dueloTiempo, setDueloTiempo] = useState(TIEMPO_TOTAL)
  const [showCountdown, setShowCountdown] = useState(false)

  // evaluación duelo (iniciador)
  const [correctasIniciador, setCorrectasIniciador] = useState([null, null, null, null, null])
  const [correctasRespondedor, setCorrectasRespondedor] = useState([null, null, null, null, null])

  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [puntosVal, setPuntosVal] = useState(0)
  const [actualizado, setActualizado] = useState(false)
  const timerRef = useRef(null)
  const dueloTimerRef = useRef(null)
  // para evitar doble-envío en duelo
  const dueloEnviadoRef = useRef(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const idiomaNativo = profile?.idioma_habla || 'es'
  const esDuelo = datos.modo === 'duelo' || sesion?.estado?.startsWith('duelo')

  useEffect(() => { solicitarPermisoNotificaciones() }, [])
  useEffect(() => { return () => { clearInterval(timerRef.current); clearInterval(dueloTimerRef.current) } }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización!', { body: 'Reto de Velocidad: nueva acción' })
    }
  }, [sesion?.updated_at])

  // Detectar transición a duelo_activo → arrancar countdown en ambos lados
  const prevEstadoRef = useRef(null)
  useEffect(() => {
    if (sesion?.estado === 'duelo_activo' && prevEstadoRef.current !== 'duelo_activo') {
      dueloEnviadoRef.current = false
      setShowCountdown(true)
    }
    prevEstadoRef.current = sesion?.estado
  }, [sesion?.estado])

  function timerColor(t = tiempo) {
    if (t > 15) return '#4caf50'
    if (t > 5) return '#ffcc00'
    return '#ff4444'
  }

  // ── Modo Normal ──────────────────────────────────────────────────────────────

  function iniciarTimer() {
    setCorriendo(true)
    timerRef.current = setInterval(() => {
      setTiempo(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setCorriendo(false)
          setTerminado(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (terminado && sesion?.estado === 'pendiente' && !esIniciador) {
      enviarRespuestas()
    }
  }, [terminado])

  async function enviarReto() {
    if (!palabras.length) return
    setEnviando(true)
    try { await crear({ palabras, idioma: idiomaNativo, categoria }) }
    catch { alert('Error al enviar') }
    setEnviando(false)
  }

  async function enviarRespuestas() {
    const tiempoUsado = TIEMPO_TOTAL - tiempo
    setEnviando(true)
    try {
      await actualizar(sesion.id, 'respondido', { ...datos, respuestas, tiempo_usado: tiempoUsado })
    } catch { alert('Error al enviar') }
    setEnviando(false)
  }

  async function evaluarResultado() {
    const aciertos = correctas.filter(c => c === true).length
    const tiempoUsado = datos.tiempo_usado || TIEMPO_TOTAL
    const esRapido = tiempoUsado < TIEMPO_BONUS
    let pts = puntosSegunAciertos(aciertos)
    if (esRapido && aciertos > 0) pts = Math.round(pts * 1.5)
    setEnviando(true)
    try {
      if (aciertos > 0) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.RETO_VELOCIDAD, pts)
        setPuntosVal(pts)
        setShowPuntos(true)
        const recordKey = `velocidad_record_${userId}`
        const recordActual = parseInt(localStorage.getItem(recordKey) || '0')
        if (aciertos > recordActual) localStorage.setItem(recordKey, String(aciertos))
      }
      await actualizar(sesion.id, 'finalizado', { ...datos, correctas, aciertos, puntos: pts, rapido: esRapido })
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  // ── Modo Duelo ───────────────────────────────────────────────────────────────

  async function iniciarDuelo() {
    if (!palabras.length) return
    setEnviando(true)
    try {
      await crear({ palabras, idioma: idiomaNativo, categoria, modo: 'duelo' }, 'duelo_espera')
    } catch { alert('Error al iniciar duelo') }
    setEnviando(false)
  }

  async function unirseAlDuelo() {
    setEnviando(true)
    try {
      await actualizar(sesion.id, 'duelo_activo', { ...datos })
    } catch { alert('Error al unirse') }
    setEnviando(false)
  }

  function iniciarTimerDuelo() {
    setDueloCorriendo(true)
    dueloTimerRef.current = setInterval(() => {
      setDueloTiempo(t => {
        if (t <= 1) {
          clearInterval(dueloTimerRef.current)
          setDueloCorriendo(false)
          setDueloTerminado(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  // Cuando el timer duelo termina o el usuario pulsa Listo → guardar respuestas
  useEffect(() => {
    if (dueloTerminado && sesion?.estado && sesion.estado.startsWith('duelo') && !dueloEnviadoRef.current) {
      dueloEnviadoRef.current = true
      enviarRespuestasDuelo()
    }
  }, [dueloTerminado])

  async function enviarRespuestasDuelo() {
    const tiempoUsado = TIEMPO_TOTAL - dueloTiempo
    const estadoActual = sesion?.estado

    let nuevoEstado
    let nuevosDatos
    if (esIniciador) {
      nuevoEstado = estadoActual === 'duelo_respondedor_listo' ? 'duelo_evaluando' : 'duelo_iniciador_listo'
      nuevosDatos = { ...datos, respuestas_iniciador: dueloRespuestas, tiempo_iniciador: tiempoUsado }
    } else {
      nuevoEstado = estadoActual === 'duelo_iniciador_listo' ? 'duelo_evaluando' : 'duelo_respondedor_listo'
      nuevosDatos = { ...datos, respuestas_respondedor: dueloRespuestas, tiempo_respondedor: tiempoUsado }
    }
    setEnviando(true)
    try {
      await actualizar(sesion.id, nuevoEstado, nuevosDatos)
    } catch { alert('Error al enviar') }
    setEnviando(false)
  }

  async function evaluarDuelo() {
    const aciertosI = correctasIniciador.filter(c => c === true).length
    const aciertosR = correctasRespondedor.filter(c => c === true).length
    const empate = aciertosI === aciertosR

    const tiempoI = datos.tiempo_iniciador || TIEMPO_TOTAL
    const tiempoR = datos.tiempo_respondedor || TIEMPO_TOTAL

    let ptsI = 0, ptsR = 0
    const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1

    if (empate) {
      ptsI = puntosSegunAciertos(aciertosI)
      ptsR = puntosSegunAciertos(aciertosR)
    } else if (aciertosI > aciertosR) {
      // iniciador gana
      ptsI = puntosSegunAciertos(aciertosI)
      if (tiempoI < TIEMPO_BONUS) ptsI = Math.round(ptsI * 1.5)
    } else {
      // respondedor gana
      ptsR = puntosSegunAciertos(aciertosR)
      if (tiempoR < TIEMPO_BONUS) ptsR = Math.round(ptsR * 1.5)
    }

    setEnviando(true)
    try {
      if (ptsI > 0) await otorgarPuntos(userId, pareja.id, TIPOS_JUEGO.RETO_VELOCIDAD, ptsI)
      if (ptsR > 0) await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.RETO_VELOCIDAD, ptsR)
      if (ptsI > 0 || ptsR > 0) {
        setPuntosVal(Math.max(ptsI, ptsR))
        setShowPuntos(true)
      }
      // Récord
      const recordKey = `velocidad_record_${userId}`
      const recordActual = parseInt(localStorage.getItem(recordKey) || '0')
      if (aciertosI > recordActual) localStorage.setItem(recordKey, String(aciertosI))

      await actualizar(sesion.id, 'finalizado', {
        ...datos,
        correctas_iniciador: correctasIniciador,
        correctas_respondedor: correctasRespondedor,
        aciertos_iniciador: aciertosI,
        aciertos_respondedor: aciertosR,
        puntos_iniciador: ptsI,
        puntos_respondedor: ptsR,
        empate,
        modo: 'duelo',
      })
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  // Determinar si la sesión activa es un duelo
  const sesionEsDuelo = esDuelo

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {showCountdown && (
        <CountdownDuelo onDone={() => { setShowCountdown(false); iniciarTimerDuelo() }} />
      )}

      {actualizado && <div style={s.updateIcon}>↻</div>}
      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h1 style={{ ...s.title, margin: 0 }}>RETO DE VELOCIDAD</h1>
        {sesionEsDuelo && sesion?.estado !== 'finalizado' && (
          <span style={s.dueloBadge}>DUELO</span>
        )}
      </div>

      <PuntosAnimacion puntos={puntosVal} visible={showPuntos} />

      {/* ── Sin sesión: selector de modo ── */}
      {!sesion && (
        <div className="fade-in" style={s.content}>
          {/* Toggle modo */}
          <div style={s.modoToggle}>
            <button
              onClick={() => setModoUI('normal')}
              style={{ ...s.modoBtn, ...(modoUI === 'normal' ? s.modoBtnActive : {}) }}
            >
              Modo Normal
            </button>
            <button
              onClick={() => setModoUI('duelo')}
              style={{ ...s.modoBtn, ...(modoUI === 'duelo' ? s.modoBtnDueloActive : {}) }}
            >
              Modo Duelo
            </button>
          </div>

          {modoUI === 'normal' && (
            <p style={s.instruccion}>
              Genera 5 palabras en {idiomaNativo === 'es' ? 'español' : 'holandés'} para que tu pareja las traduzca en 45 segundos.
            </p>
          )}
          {modoUI === 'duelo' && (
            <p style={s.instruccion}>
              Ambos traducen las mismas 5 palabras al mismo tiempo. Quien acierte más gana los puntos.
            </p>
          )}

          {/* Selector categoría */}
          <div>
            <p style={{ ...s.cardLabel, marginBottom: 10 }}>Categoría</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategoria(cat); setPalabras([]) }}
                  style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36,
                    background: categoria === cat ? '#30699b' : 'var(--bg-secondary)',
                    color: categoria === cat ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${categoria === cat ? '#30699b' : 'var(--border)'}`,
                  }}
                >
                  {BANCOS[cat].label}
                </button>
              ))}
            </div>
          </div>

          {palabras.length === 0 ? (
            <button className="btn-primary" onClick={() => setPalabras(palabrasAleatorias(categoria, idiomaNativo))}>
              Generar 5 palabras
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {palabras.map((p, i) => (
                  <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-hint)', width: 20 }}>{i + 1}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{p}</span>
                  </div>
                ))}
              </div>
              <button className="btn-outline" onClick={() => setPalabras(palabrasAleatorias(categoria, idiomaNativo))}>
                Regenerar
              </button>
              {modoUI === 'normal' ? (
                <button className="btn-primary" onClick={enviarReto} disabled={enviando}>
                  {enviando ? <span className="loader" /> : 'MANDAR RETO'}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={iniciarDuelo}
                  disabled={enviando}
                  style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)', border: 'none' }}
                >
                  {enviando ? <span className="loader" /> : 'Iniciar Duelo'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modo Normal: Iniciador espera ── */}
      {sesion?.estado === 'pendiente' && esIniciador && !sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          {datos.categoria && (
            <p style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center' }}>
              Categoría: {BANCOS[datos.categoria]?.label || datos.categoria}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-hint)', width: 20 }}>{i + 1}</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{p}</span>
              </div>
            ))}
          </div>
          <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} las traduzca...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* ── Modo Normal: Pareja responde ── */}
      {sesion?.estado === 'pendiente' && !esIniciador && !sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          {!corriendo && !terminado ? (
            <>
              <p style={s.instruccion}>Traduce las 5 palabras lo más rápido posible. Tienes 45 segundos.</p>
              {datos.categoria && (
                <p style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center' }}>
                  Categoría: {BANCOS[datos.categoria]?.label || datos.categoria}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datos.palabras?.map((p, i) => (
                  <div key={i} style={{ ...s.card, opacity: 0.7 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#30699b' }}>{p}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ fontSize: 18, padding: '16px' }} onClick={iniciarTimer}>
                ¡Empezar!
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <p style={{ fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-title)', color: timerColor(), lineHeight: 1 }}>{tiempo}</p>
                <div style={s.barWrap}>
                  <div style={{ ...s.barFill, width: `${(tiempo / TIEMPO_TOTAL) * 100}%`, background: timerColor() }} />
                </div>
                {tiempo > 0 && tiempo <= TIEMPO_BONUS && (
                  <p style={{ fontSize: 12, color: '#ffcc00', marginTop: 6, fontWeight: 600 }}>¡Rápido! Bonus x1.5 si terminas ya</p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datos.palabras?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ ...s.card, flex: 1, padding: '10px 12px' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#30699b' }}>{p}</span>
                    </div>
                    <span style={{ color: 'var(--text-hint)' }}>→</span>
                    <input
                      className="input-field"
                      style={{ flex: 1, padding: '10px 12px', fontSize: 15 }}
                      placeholder="Traducción..."
                      value={respuestas[i]}
                      onChange={e => { const n = [...respuestas]; n[i] = e.target.value; setRespuestas(n) }}
                      disabled={terminado}
                    />
                  </div>
                ))}
              </div>
              {!terminado && (
                <button className="btn-primary" onClick={() => { clearInterval(timerRef.current); setCorriendo(false); setTerminado(true) }}>
                  ¡Listo! Enviar respuestas
                </button>
              )}
              {terminado && enviando && <div style={s.center}><span className="loader" /></div>}
            </>
          )}
        </div>
      )}

      {/* ── Modo Normal: Pareja respondido, espera ── */}
      {sesion?.estado === 'respondido' && !esIniciador && !sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          <p style={s.esperando}>¡Respuestas enviadas! Esperando evaluación de {parejaProfile?.nombre || 'tu pareja'}...</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#30699b' }}>{p}</span>
                <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{datos.respuestas?.[i] || '—'}</span>
              </div>
            ))}
          </div>
          {datos.tiempo_usado !== undefined && (
            <p style={{ color: 'var(--text-hint)', fontSize: 13, textAlign: 'center' }}>
              Tiempo: {datos.tiempo_usado}s{datos.tiempo_usado < TIEMPO_BONUS ? ' — ¡Muy rápido!' : ''}
            </p>
          )}
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* ── Modo Normal: Iniciador evalúa ── */}
      {sesion?.estado === 'respondido' && esIniciador && !sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Marca cuáles estuvieron correctas:</p>
          {datos.tiempo_usado !== undefined && (
            <p style={{ color: datos.tiempo_usado < TIEMPO_BONUS ? '#ffcc00' : 'var(--text-hint)', fontSize: 13, textAlign: 'center', fontWeight: datos.tiempo_usado < TIEMPO_BONUS ? 600 : 400 }}>
              {datos.tiempo_usado < TIEMPO_BONUS ? `¡Rápido! x1.5 — Tiempo: ${datos.tiempo_usado}s` : `Tiempo usado: ${datos.tiempo_usado}s`}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 2 }}>{p}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#30699b' }}>{datos.respuestas?.[i] || '—'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { const n = [...correctas]; n[i] = true; setCorrectas(n) }} style={{ padding: '8px 14px', borderRadius: 8, background: correctas[i] === true ? '#4caf50' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 16, minHeight: 44 }}>✓</button>
                  <button onClick={() => { const n = [...correctas]; n[i] = false; setCorrectas(n) }} style={{ padding: '8px 14px', borderRadius: 8, background: correctas[i] === false ? '#ff4444' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 16, minHeight: 44 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#30699b', fontWeight: 600 }}>
            Aciertos: {correctas.filter(c => c === true).length}/5
            {datos.tiempo_usado < TIEMPO_BONUS
              ? ` → +${Math.round(puntosSegunAciertos(correctas.filter(c => c === true).length) * 1.5)}pts (x1.5)`
              : ` → +${puntosSegunAciertos(correctas.filter(c => c === true).length)}pts`
            }
          </p>
          <button className="btn-primary" onClick={evaluarResultado} disabled={enviando || correctas.some(c => c === null)}>
            {enviando ? <span className="loader" /> : 'Enviar resultado'}
          </button>
        </div>
      )}

      {/* ══════════ MODO DUELO ══════════ */}

      {/* Duelo: Iniciador espera que pareja se una */}
      {sesion?.estado === 'duelo_espera' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-hint)', marginBottom: 8 }}>Duelo enviado</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              Esperando que {parejaProfile?.nombre || 'tu pareja'} se una al duelo
            </p>
            <DotsAnim />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center' }}>
            Categoría: {BANCOS[datos.categoria]?.label || datos.categoria}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-hint)', width: 20 }}>{i + 1}</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{p}</span>
              </div>
            ))}
          </div>
          <button className="btn-outline" onClick={() => navigate('/inicio')}>← Volver al inicio</button>
        </div>
      )}

      {/* Duelo: Pareja ve la invitación y se une */}
      {sesion?.estado === 'duelo_espera' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={{ ...s.card, background: 'rgba(192,57,43,0.08)', border: '1px solid #c0392b', textAlign: 'center', padding: '24px 20px' }}>
            <p style={{ fontSize: 13, color: '#e74c3c', fontWeight: 600, marginBottom: 6 }}>DUELO</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {parejaProfile?.nombre || 'Tu pareja'} te reta a un duelo
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Categoría: {BANCOS[datos.categoria]?.label || datos.categoria}
            </p>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
            Traduce estas 5 palabras al mismo tiempo que tu pareja:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-hint)', width: 20 }}>{i + 1}</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{p}</span>
              </div>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={unirseAlDuelo}
            disabled={enviando}
            style={{ fontSize: 18, padding: '16px', background: 'linear-gradient(135deg, #c0392b, #e74c3c)', border: 'none' }}
          >
            {enviando ? <span className="loader" /> : '¡Unirme al duelo!'}
          </button>
        </div>
      )}

      {/* Duelo activo: juego en curso (ambos) */}
      {(sesion?.estado === 'duelo_activo' || sesion?.estado === 'duelo_iniciador_listo' || sesion?.estado === 'duelo_respondedor_listo') && (
        (() => {
          // Determinar si este usuario ya terminó
          const yoTermine = (esIniciador && sesion.estado === 'duelo_iniciador_listo') ||
                            (!esIniciador && sesion.estado === 'duelo_respondedor_listo')
          const parejaTermino = (esIniciador && sesion.estado === 'duelo_respondedor_listo') ||
                                (!esIniciador && sesion.estado === 'duelo_iniciador_listo')

          if (yoTermine) {
            // Ya terminé, espero a la pareja
            return (
              <div className="fade-in" style={s.content}>
                <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                    ¡Respuestas enviadas!
                  </p>
                  <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 16 }}>
                    Esperando que {parejaProfile?.nombre || 'tu pareja'} termine...
                  </p>
                  <DotsAnim />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {datos.palabras?.map((p, i) => (
                    <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#30699b' }}>{p}</span>
                      <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
                        {(esIniciador ? datos.respuestas_iniciador : datos.respuestas_respondedor)?.[i] || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          // Aún jugando
          return (
            <div className="fade-in" style={s.content}>
              {/* Badge duelo + timer */}
              <div style={{ textAlign: 'center', margin: '0 0 8px' }}>
                <span style={s.dueloBadge}>DUELO EN CURSO</span>
                <p style={{ fontSize: 64, fontWeight: 900, fontFamily: 'var(--font-title)', color: timerColor(dueloTiempo), lineHeight: 1, marginTop: 8 }}>
                  {dueloTiempo}
                </p>
                <div style={s.barWrap}>
                  <div style={{ ...s.barFill, width: `${(dueloTiempo / TIEMPO_TOTAL) * 100}%`, background: timerColor(dueloTiempo) }} />
                </div>
                {dueloTiempo > 0 && dueloTiempo <= TIEMPO_BONUS && (
                  <p style={{ fontSize: 12, color: '#ffcc00', marginTop: 6, fontWeight: 600 }}>¡Rápido! Bonus x1.5 si terminas ya</p>
                )}
                {parejaTermino && (
                  <p style={{ fontSize: 12, color: '#4caf50', marginTop: 6, fontWeight: 600 }}>
                    {parejaProfile?.nombre || 'Tu pareja'} ya terminó
                  </p>
                )}
              </div>

              {/* Palabras + inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {datos.palabras?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ ...s.card, flex: 1, padding: '10px 12px' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#30699b' }}>{p}</span>
                    </div>
                    <span style={{ color: 'var(--text-hint)' }}>→</span>
                    <input
                      className="input-field"
                      style={{ flex: 1, padding: '10px 12px', fontSize: 15 }}
                      placeholder="Traducción..."
                      value={dueloRespuestas[i]}
                      onChange={e => { const n = [...dueloRespuestas]; n[i] = e.target.value; setDueloRespuestas(n) }}
                      disabled={dueloTerminado}
                    />
                  </div>
                ))}
              </div>

              {!dueloTerminado && (
                <button className="btn-primary" onClick={() => {
                  clearInterval(dueloTimerRef.current)
                  setDueloCorriendo(false)
                  setDueloTerminado(true)
                }}>
                  ¡Listo! Enviar respuestas
                </button>
              )}
              {dueloTerminado && enviando && <div style={s.center}><span className="loader" /></div>}
            </div>
          )
        })()
      )}

      {/* Duelo evaluando: solo el iniciador evalúa */}
      {sesion?.estado === 'duelo_evaluando' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Marca las respuestas correctas de cada uno:</p>

          {/* Tiempos */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...s.card, flex: 1, textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 4 }}>Tú</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: datos.tiempo_iniciador < TIEMPO_BONUS ? '#ffcc00' : 'var(--text-primary)' }}>
                {datos.tiempo_iniciador || '—'}s
                {datos.tiempo_iniciador < TIEMPO_BONUS ? ' x1.5' : ''}
              </p>
            </div>
            <div style={{ ...s.card, flex: 1, textAlign: 'center', padding: '12px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 4 }}>{parejaProfile?.nombre || 'Pareja'}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: datos.tiempo_respondedor < TIEMPO_BONUS ? '#ffcc00' : 'var(--text-primary)' }}>
                {datos.tiempo_respondedor || '—'}s
                {datos.tiempo_respondedor < TIEMPO_BONUS ? ' x1.5' : ''}
              </p>
            </div>
          </div>

          {/* Tabla comparativa */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={s.th}>Palabra</th>
                  <th style={s.th}>Tú</th>
                  <th style={s.th}>{parejaProfile?.nombre || 'Pareja'}</th>
                </tr>
              </thead>
              <tbody>
                {datos.palabras?.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 700, color: '#30699b' }}>{p}</td>
                    <td style={s.td}>
                      <p style={{ fontSize: 14, marginBottom: 6 }}>{datos.respuestas_iniciador?.[i] || '—'}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const n = [...correctasIniciador]; n[i] = true; setCorrectasIniciador(n) }}
                          style={{ ...s.evalBtn, background: correctasIniciador[i] === true ? '#4caf50' : 'var(--border)' }}>✓</button>
                        <button onClick={() => { const n = [...correctasIniciador]; n[i] = false; setCorrectasIniciador(n) }}
                          style={{ ...s.evalBtn, background: correctasIniciador[i] === false ? '#ff4444' : 'var(--border)' }}>✕</button>
                      </div>
                    </td>
                    <td style={s.td}>
                      <p style={{ fontSize: 14, marginBottom: 6 }}>{datos.respuestas_respondedor?.[i] || '—'}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const n = [...correctasRespondedor]; n[i] = true; setCorrectasRespondedor(n) }}
                          style={{ ...s.evalBtn, background: correctasRespondedor[i] === true ? '#4caf50' : 'var(--border)' }}>✓</button>
                        <button onClick={() => { const n = [...correctasRespondedor]; n[i] = false; setCorrectasRespondedor(n) }}
                          style={{ ...s.evalBtn, background: correctasRespondedor[i] === false ? '#ff4444' : 'var(--border)' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview puntaje */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Tú', aciertos: correctasIniciador.filter(c => c === true).length, tiempo: datos.tiempo_iniciador },
              { label: parejaProfile?.nombre || 'Pareja', aciertos: correctasRespondedor.filter(c => c === true).length, tiempo: datos.tiempo_respondedor },
            ].map(({ label, aciertos, tiempo: t }) => (
              <div key={label} style={{ ...s.card, flex: 1, textAlign: 'center', padding: '12px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-hint)', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#30699b' }}>{aciertos}/5</p>
                <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>
                  +{t < TIEMPO_BONUS ? Math.round(puntosSegunAciertos(aciertos) * 1.5) : puntosSegunAciertos(aciertos)}pts
                </p>
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={evaluarDuelo}
            disabled={enviando || correctasIniciador.some(c => c === null) || correctasRespondedor.some(c => c === null)}
          >
            {enviando ? <span className="loader" /> : 'Enviar resultado'}
          </button>
        </div>
      )}

      {/* Duelo evaluando: respondedor espera */}
      {sesion?.estado === 'duelo_evaluando' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <div style={{ ...s.card, textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>¡Ambos han terminado!</p>
            <p style={{ color: 'var(--text-hint)', fontSize: 14, marginBottom: 16 }}>
              {parejaProfile?.nombre || 'Tu pareja'} está evaluando las respuestas...
            </p>
            <DotsAnim />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#30699b' }}>{p}</span>
                <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{datos.respuestas_respondedor?.[i] || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Finalizado: Modo Normal ── */}
      {sesion?.estado === 'finalizado' && !sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {datos.palabras?.map((p, i) => (
              <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#30699b' }}>{datos.respuestas?.[i] || '—'}</p>
                </div>
                <span style={{ fontSize: 20 }}>{datos.correctas?.[i] ? '✓' : '✕'}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, background: 'rgba(48,105,155,0.1)', border: '1px solid #30699b' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>Resultado</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {datos.tiempo_usado !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Tiempo</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: datos.rapido ? '#ffcc00' : 'var(--text-primary)' }}>
                    {datos.tiempo_usado}s {datos.rapido ? '— Rapido! x1.5' : ''}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Aciertos</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{datos.aciertos}/{datos.palabras?.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Porcentaje</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(((datos.aciertos || 0) / (datos.palabras?.length || 1)) * 100)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Puntos</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#30699b' }}>+{datos.puntos}</span>
              </div>
              {(() => {
                const recordKey = `velocidad_record_${userId}`
                const record = parseInt(localStorage.getItem(recordKey) || '0')
                return record > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Récord personal</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#ffcc00' }}>{record}/5 aciertos</span>
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate('/inicio')}>Volver al inicio</button>
        </div>
      )}

      {/* ── Finalizado: Modo Duelo ── */}
      {sesion?.estado === 'finalizado' && sesionEsDuelo && (
        <div className="fade-in" style={s.content}>
          {/* Banner ganador */}
          <DuelResult
            empate={datos.empate}
            nombreGanador={
              datos.aciertos_iniciador > datos.aciertos_respondedor
                ? (esIniciador ? 'Tú' : parejaProfile?.nombre || 'Tu pareja')
                : (esIniciador ? parejaProfile?.nombre || 'Tu pareja' : 'Tú')
            }
            puntosIniciador={esIniciador ? datos.puntos_iniciador : datos.puntos_respondedor}
            puntosRespondedor={esIniciador ? datos.puntos_respondedor : datos.puntos_iniciador}
          />

          {/* Tabla comparativa final */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <thead>
                <tr>
                  <th style={s.th}>Palabra</th>
                  <th style={s.th}>Tú</th>
                  <th style={s.th}>{parejaProfile?.nombre || 'Pareja'}</th>
                </tr>
              </thead>
              <tbody>
                {datos.palabras?.map((p, i) => {
                  const ciI = esIniciador ? datos.correctas_iniciador?.[i] : datos.correctas_respondedor?.[i]
                  const ciR = esIniciador ? datos.correctas_respondedor?.[i] : datos.correctas_iniciador?.[i]
                  const respI = esIniciador ? datos.respuestas_iniciador?.[i] : datos.respuestas_respondedor?.[i]
                  const respR = esIniciador ? datos.respuestas_respondedor?.[i] : datos.respuestas_iniciador?.[i]
                  return (
                    <tr key={i}>
                      <td style={{ ...s.td, fontWeight: 700, color: '#30699b' }}>{p}</td>
                      <td style={s.td}>
                        <span style={{ fontSize: 14 }}>{respI || '—'}</span>
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{ciI === true ? '✓' : ciI === false ? '✕' : ''}</span>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 14 }}>{respR || '—'}</span>
                        <span style={{ marginLeft: 6, fontSize: 16 }}>{ciR === true ? '✓' : ciR === false ? '✕' : ''}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Estadísticas */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              {
                label: 'Tú',
                aciertos: esIniciador ? datos.aciertos_iniciador : datos.aciertos_respondedor,
                tiempo: esIniciador ? datos.tiempo_iniciador : datos.tiempo_respondedor,
                pts: esIniciador ? datos.puntos_iniciador : datos.puntos_respondedor,
              },
              {
                label: parejaProfile?.nombre || 'Pareja',
                aciertos: esIniciador ? datos.aciertos_respondedor : datos.aciertos_iniciador,
                tiempo: esIniciador ? datos.tiempo_respondedor : datos.tiempo_iniciador,
                pts: esIniciador ? datos.puntos_respondedor : datos.puntos_iniciador,
              },
            ].map(({ label, aciertos, tiempo: t, pts }) => (
              <div key={label} style={{ ...s.card, flex: 1, textAlign: 'center', padding: '14px' }}>
                <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#30699b' }}>{aciertos}/5</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t}s</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#30699b', marginTop: 4 }}>+{pts}pts</p>
              </div>
            ))}
          </div>

          {/* Récord personal */}
          {(() => {
            const recordKey = `velocidad_record_${userId}`
            const record = parseInt(localStorage.getItem(recordKey) || '0')
            return record > 0 ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: '#ffcc00' }}>Récord personal: {record}/5 aciertos</p>
            ) : null
          })()}

          <button className="btn-primary" onClick={() => navigate('/inicio')}>Volver al inicio</button>
        </div>
      )}
    </div>
  )
}

// ── Animación de puntos suspensivos ──────────────────────────────────────────
function DotsAnim() {
  const [dots, setDots] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontSize: 24, color: '#30699b', letterSpacing: 4 }}>
      {'.'.repeat(dots)}
    </span>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  back: { background: 'none', color: 'var(--text-secondary)', fontSize: 15, padding: 0, marginBottom: 16 },
  title: { fontFamily: 'var(--font-title)', fontSize: 24, marginBottom: 20 },
  content: { display: 'flex', flexDirection: 'column', gap: 16 },
  instruccion: { color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5 },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
  barWrap: { height: 8, borderRadius: 4, background: 'var(--border)', margin: '12px auto 0', maxWidth: 300 },
  barFill: { height: '100%', borderRadius: 4, transition: 'width 1s linear, background 1s' },
  dueloBadge: {
    background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
    color: '#fff', fontSize: 11, fontWeight: 800,
    padding: '3px 10px', borderRadius: 20, letterSpacing: 1,
  },
  modoToggle: {
    display: 'flex', background: 'var(--bg-secondary)',
    border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
  },
  modoBtn: {
    flex: 1, padding: '12px 8px', fontSize: 14, fontWeight: 600,
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
  },
  modoBtnActive: {
    background: '#30699b', color: '#fff',
  },
  modoBtnDueloActive: {
    background: 'linear-gradient(135deg, #c0392b, #e74c3c)', color: '#fff',
  },
  th: {
    fontSize: 12, color: 'var(--text-hint)', fontWeight: 600,
    textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)',
  },
  td: {
    background: 'var(--bg-secondary)', padding: '10px 8px',
    fontSize: 14, color: 'var(--text-primary)', borderRadius: 8,
    verticalAlign: 'top',
  },
  evalBtn: {
    padding: '6px 10px', borderRadius: 6, color: '#fff',
    fontWeight: 700, fontSize: 14, minHeight: 36, cursor: 'pointer', border: 'none',
  },
}
