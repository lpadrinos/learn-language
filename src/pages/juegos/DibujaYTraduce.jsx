import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useJuego, otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import { supabase } from '../../lib/supabase'
import { enviarNotificacion, solicitarPermisoNotificaciones } from '../../lib/notificaciones'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const COLORES = [
  { color: '#ffffff', label: 'Blanco' },
  { color: '#1a3854', label: 'Azul oscuro' },
  { color: '#30699b', label: 'Azul' },
  { color: '#ff4444', label: 'Rojo' },
  { color: '#44cc44', label: 'Verde' },
  { color: '#ffcc00', label: 'Amarillo' },
  { color: '#000000', label: 'Negro' },
  { color: '#ff8c00', label: 'Naranja' },
  { color: '#ff69b4', label: 'Rosa' },
  { color: '#9b30ff', label: 'Morado' },
  { color: '#8B4513', label: 'Café' },
]
const PINCELES = [2, 5, 10, 20]
const HERRAMIENTAS = ['pincel', 'borrador', 'linea', 'circulo']
const FONDO = '#1a3854'
const TIEMPO_DIBUJAR = 60
const TIEMPO_ADIVINAR = 60

export default function DibujaYTraduce() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const userId = session?.user?.id
  const { sesion, loading, crear, actualizar } = useJuego(TIPOS_JUEGO.DIBUJA_TRADUCE, pareja?.id, userId)

  const canvasRef = useRef(null)
  const [dibujando, setDibujando] = useState(false)
  const [colorActual, setColorActual] = useState('#000000')
  const [pincelActual, setPincelActual] = useState(1)
  const [herramienta, setHerramienta] = useState('pincel')
  const [strokes, setStrokes] = useState([])
  const [strokeActual, setStrokeActual] = useState([])
  const [puntoInicio, setPuntoInicio] = useState(null)
  const [modoCanvas, setModoCanvas] = useState(false)
  const [respuesta, setRespuesta] = useState('')
  const [queEra, setQueEra] = useState('')
  const [pista, setPista] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [actualizado, setActualizado] = useState(false)

  // Timers
  const [timerDibujo, setTimerDibujo] = useState(TIEMPO_DIBUJAR)
  const [timerAdivinar, setTimerAdivinar] = useState(TIEMPO_ADIVINAR)
  const [canvasBloqueado, setCanvasBloqueado] = useState(false)
  const timerDibujoRef = useRef(null)
  const timerAdivinarRef = useRef(null)
  const respuestaAutoRef = useRef('')

  // Pistas
  const [mostrarPreguntaPista, setMostrarPreguntaPista] = useState(false)

  // Guardar dibujo
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const esIniciador = sesion?.iniciador_id === userId
  const datos = sesion?.datos || {}
  const idiomaAprende = profile?.idioma_aprende || 'nl'

  useEffect(() => { solicitarPermisoNotificaciones() }, [])
  useEffect(() => { return () => { clearInterval(timerDibujoRef.current); clearInterval(timerAdivinarRef.current) } }, [])

  useEffect(() => {
    if (sesion?.updated_at) {
      setActualizado(true)
      setTimeout(() => setActualizado(false), 3000)
      enviarNotificacion('¡Actualización!', { body: 'Dibuja y Traduce: nueva acción' })
    }
  }, [sesion?.updated_at])

  // Iniciar timer para adivinar cuando sesion llega a pendiente para la pareja
  useEffect(() => {
    if (sesion?.estado === 'pendiente' && !esIniciador) {
      iniciarTimerAdivinar()
    }
    return () => clearInterval(timerAdivinarRef.current)
  }, [sesion?.estado, sesion?.datos?.pistas_dadas])

  // Redibujar canvas cuando cambien strokes
  useEffect(() => {
    if (!modoCanvas) return
    redibujar()
  }, [strokes, modoCanvas])

  // Timer dibujo
  function iniciarTimerDibujo() {
    setTimerDibujo(TIEMPO_DIBUJAR)
    setCanvasBloqueado(false)
    timerDibujoRef.current = setInterval(() => {
      setTimerDibujo(t => {
        if (t <= 1) {
          clearInterval(timerDibujoRef.current)
          setCanvasBloqueado(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function iniciarTimerAdivinar() {
    setTimerAdivinar(TIEMPO_ADIVINAR)
    clearInterval(timerAdivinarRef.current)
    timerAdivinarRef.current = setInterval(() => {
      setTimerAdivinar(t => {
        if (t <= 1) {
          clearInterval(timerAdivinarRef.current)
          // Enviar lo que haya aunque sea vacío
          const resp = respuestaAutoRef.current.trim() || '—'
          enviarRespuestaAuto(resp)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  async function enviarRespuestaAuto(resp) {
    try { await actualizar(sesion.id, 'respondido', { ...datos, respuesta: resp }) } catch {}
  }

  function timerColor(t, max) {
    const pct = t / max
    if (pct > 0.33) return '#4caf50'
    if (pct > 0.08) return '#ffcc00'
    return '#ff4444'
  }

  function redibujar(extraStrokes) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = FONDO
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const todosStrokes = extraStrokes || strokes
    todosStrokes.forEach(stroke => {
      if (!stroke || stroke.length < 1) return
      if (stroke.tipo === 'linea' && stroke.length >= 2) {
        ctx.beginPath()
        ctx.strokeStyle = stroke[0].color
        ctx.lineWidth = stroke[0].size
        ctx.lineCap = 'round'
        ctx.moveTo(stroke[0].x, stroke[0].y)
        ctx.lineTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y)
        ctx.stroke()
      } else if (stroke.tipo === 'circulo' && stroke.length >= 2) {
        const dx = stroke[stroke.length - 1].x - stroke[0].x
        const dy = stroke[stroke.length - 1].y - stroke[0].y
        const rx = Math.abs(dx) / 2
        const ry = Math.abs(dy) / 2
        const cx = stroke[0].x + dx / 2
        const cy = stroke[0].y + dy / 2
        ctx.beginPath()
        ctx.strokeStyle = stroke[0].color
        ctx.lineWidth = stroke[0].size
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        if (stroke.length < 2) return
        ctx.beginPath()
        ctx.strokeStyle = stroke[0].color
        ctx.lineWidth = stroke[0].size
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.moveTo(stroke[0].x, stroke[0].y)
        stroke.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.stroke()
      }
    })
  }

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function colorEfectivo() {
    return herramienta === 'borrador' ? FONDO : colorActual
  }

  function onStart(e) {
    if (canvasBloqueado) return
    e.preventDefault()
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    setDibujando(true)
    setPuntoInicio(pos)
    const punto = { ...pos, color: colorEfectivo(), size: PINCELES[pincelActual] }
    setStrokeActual([punto])

    if (herramienta === 'pincel' || herramienta === 'borrador') {
      const ctx = canvas.getContext('2d')
      ctx.beginPath()
      ctx.strokeStyle = colorEfectivo()
      ctx.lineWidth = PINCELES[pincelActual]
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(pos.x, pos.y)
    }
  }

  function onMove(e) {
    if (canvasBloqueado) return
    e.preventDefault()
    if (!dibujando) return
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    const punto = { ...pos, color: colorEfectivo(), size: PINCELES[pincelActual] }
    setStrokeActual(prev => [...prev, punto])

    if (herramienta === 'pincel' || herramienta === 'borrador') {
      const ctx = canvas.getContext('2d')
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else {
      // Preview linea/circulo
      const preview = [...strokes, Object.assign([{ ...puntoInicio, color: colorEfectivo(), size: PINCELES[pincelActual] }, punto], { tipo: herramienta })]
      redibujar(preview)
    }
  }

  function onEnd(e) {
    if (canvasBloqueado) return
    e.preventDefault()
    if (!dibujando) return
    setDibujando(false)
    const finalStroke = Object.assign([...strokeActual], { tipo: herramienta })
    setStrokes(prev => [...prev, finalStroke])
    setStrokeActual([])
    setPuntoInicio(null)
  }

  function deshacer() {
    setStrokes(prev => prev.slice(0, -1))
  }

  function limpiar() {
    setStrokes([])
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = FONDO
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  async function enviarDibujo() {
    const canvas = canvasRef.current
    if (!canvas || strokes.length === 0) return
    setEnviando(true)
    try {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8))
      const path = `dibujos/${pareja.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('dibujos').upload(path, blob, { upsert: false, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('dibujos').getPublicUrl(path)
      clearInterval(timerDibujoRef.current)
      await crear({ dibujo_url: urlData.publicUrl, pistas_dadas: 0 })
      setModoCanvas(false)
    } catch (e) {
      alert(`Error al enviar dibujo: ${e.message}`)
    }
    setEnviando(false)
  }

  async function enviarRespuesta() {
    if (!respuesta.trim()) return
    clearInterval(timerAdivinarRef.current)
    setEnviando(true)
    try {
      await actualizar(sesion.id, 'respondido', { ...datos, respuesta: respuesta.trim() })
    } catch { alert('Error al enviar') }
    setRespuesta('')
    setEnviando(false)
  }

  async function evaluar(correcto) {
    setEnviando(true)
    try {
      if (correcto) {
        const respondedorId = pareja.user_id_1 === userId ? pareja.user_id_2 : pareja.user_id_1
        await otorgarPuntos(respondedorId, pareja.id, TIPOS_JUEGO.DIBUJA_TRADUCE, PUNTOS_JUEGO.dibuja_traduce)
        setShowPuntos(true)
        await actualizar(sesion.id, 'finalizado', { ...datos, correcto: true })
      } else {
        // Si ya se dieron 2 pistas o no quiere dar más — ir a castigo directo
        const pistasYaDadas = datos.pistas_dadas || 0
        if (pistasYaDadas >= 2) {
          await actualizar(sesion.id, 'castigo', { ...datos, correcto: false })
        } else {
          setMostrarPreguntaPista(true)
        }
      }
    } catch { alert('Error al evaluar') }
    setEnviando(false)
  }

  async function darPista() {
    setMostrarPreguntaPista(false)
    setEnviando(true)
    try {
      await actualizar(sesion.id, 'pista', { ...datos, pistas_dadas: (datos.pistas_dadas || 0) + 1 })
    } catch { alert('Error') }
    setEnviando(false)
  }

  async function noDarPista() {
    setMostrarPreguntaPista(false)
    setEnviando(true)
    try { await actualizar(sesion.id, 'castigo', { ...datos, correcto: false }) }
    catch { alert('Error') }
    setEnviando(false)
  }

  async function enviarIntentoPista() {
    if (!respuesta.trim()) return
    clearInterval(timerAdivinarRef.current)
    setEnviando(true)
    try { await actualizar(sesion.id, 'respondido', { ...datos, respuesta: respuesta.trim() }) }
    catch { alert('Error') }
    setRespuesta('')
    setEnviando(false)
  }

  async function revelarQueEra() {
    if (!queEra.trim()) return
    setEnviando(true)
    try { await actualizar(sesion.id, 'finalizado', { ...datos, que_era: queEra.trim() }) }
    catch { alert('Error al revelar') }
    setQueEra('')
    setEnviando(false)
  }

  async function guardarDibujo() {
    if (guardado) return
    setGuardando(true)
    try {
      await supabase.from('dibujos_guardados').insert({
        pareja_id: pareja.id,
        autor_id: userId,
        dibujo_url: datos.dibujo_url,
        respuesta: datos.respuesta || datos.que_era || '',
        correcto: datos.correcto || false,
      })
      setGuardado(true)
    } catch { /* silencioso */ }
    setGuardando(false)
  }

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  // MODO CANVAS
  if (modoCanvas) {
    const tColor = timerColor(timerDibujo, TIEMPO_DIBUJAR)
    return (
      <div style={{ position: 'fixed', inset: 0, background: FONDO, display: 'flex', flexDirection: 'column', zIndex: 200 }}>
        {/* Fila 1 toolbar */}
        <div style={{ padding: '8px 12px', background: '#142e47', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => { clearInterval(timerDibujoRef.current); setModoCanvas(false) }}
            style={{ color: 'var(--text-secondary)', background: 'none', fontSize: 13, padding: '6px 0', minHeight: 44 }}>← Cancelar</button>

          {/* Timer dibujo */}
          <div style={{ marginLeft: 'auto', textAlign: 'center', minWidth: 44 }}>
            <span style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-title)', color: tColor }}>{timerDibujo}</span>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 0 }}>seg</p>
          </div>

          {/* Herramientas */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ id: 'pincel', label: '✏' }, { id: 'borrador', label: '◻' }, { id: 'linea', label: '/' }, { id: 'circulo', label: '○' }].map(h => (
              <button key={h.id} onClick={() => setHerramienta(h.id)}
                style={{ width: 36, height: 36, borderRadius: 8, background: herramienta === h.id ? '#30699b' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {h.label}
              </button>
            ))}
          </div>

          <button onClick={deshacer} style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, minHeight: 44 }}>↩</button>
          <button onClick={limpiar} style={{ color: '#ff6b6b', background: 'rgba(255,80,80,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, minHeight: 44 }}>✕</button>
        </div>

        {/* Fila 2 toolbar — colores y pinceles */}
        <div style={{ padding: '6px 12px', background: '#142e47', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {COLORES.map((c) => (
              <button key={c.color} onClick={() => { setColorActual(c.color); setHerramienta('pincel') }}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c.color, border: colorActual === c.color && herramienta !== 'borrador' ? '3px solid #fff' : '2px solid transparent', flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, marginLeft: 4 }}>
            {PINCELES.map((size, i) => (
              <button key={i} onClick={() => setPincelActual(i)}
                style={{ width: 34, height: 34, borderRadius: 8, background: pincelActual === i ? '#30699b' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: size > 10 ? 12 : size, height: size > 10 ? 12 : size, background: '#fff', borderRadius: '50%' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={390}
            height={600}
            style={{ display: 'block', touchAction: 'none', cursor: canvasBloqueado ? 'not-allowed' : 'crosshair', width: '100%', height: '100%', opacity: canvasBloqueado ? 0.7 : 1 }}
            onMouseDown={onStart}
            onMouseMove={onMove}
            onMouseUp={onEnd}
            onTouchStart={onStart}
            onTouchMove={onMove}
            onTouchEnd={onEnd}
          />
          {canvasBloqueado && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,46,71,0.85)', borderRadius: 12, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ color: '#ffcc00', fontWeight: 700, fontSize: 15 }}>¡Tiempo terminado!</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', background: '#142e47', flexShrink: 0 }}>
          <button className="btn-primary" onClick={enviarDibujo} disabled={enviando || strokes.length === 0}>
            {enviando ? <span className="loader" /> : 'Listo — Mandar dibujo'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px', position: 'relative' }}>
      {actualizado && <div style={s.updateIcon}>↻</div>}
      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>DIBUJA Y TRADUCE</h1>
      <PuntosAnimacion puntos={PUNTOS_JUEGO.dibuja_traduce} visible={showPuntos} />

      {/* Inicio */}
      {!sesion && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>Dibuja algo sin escribir palabras. Tu pareja adivinará qué es en {idiomaAprende === 'nl' ? 'holandés' : 'español'}.</p>
          <button className="btn-primary" onClick={() => { setModoCanvas(true); setTimeout(iniciarTimerDibujo, 100) }}>Empezar a dibujar</button>
        </div>
      )}

      {/* Iniciador espera */}
      {sesion?.estado === 'pendiente' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.cardLabel}>Tu dibujo</p>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <p style={s.esperando}>Esperando que {parejaProfile?.nombre || 'tu pareja'} adivine...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* Estado pista — iniciador espera nuevo intento */}
      {sesion?.estado === 'pista' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={{ ...s.card, background: 'rgba(255,204,0,0.1)', border: '1px solid #ffcc00' }}>
            <p style={{ color: '#ffcc00', fontWeight: 600, fontSize: 14 }}>Pista dada ({datos.pistas_dadas || 1}/2)</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Esperando nuevo intento de {parejaProfile?.nombre}...</p>
          </div>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* Pareja — estado pista, intenta de nuevo */}
      {sesion?.estado === 'pista' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¡Tienes una pista! Intenta de nuevo.</p>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={{ ...s.card, background: 'rgba(255,204,0,0.1)', border: '1px solid #ffcc00' }}>
            <p style={{ fontSize: 12, color: '#ffcc00', marginBottom: 4 }}>Pista {datos.pistas_dadas}/2 usada</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Pistas disponibles: {2 - (datos.pistas_dadas || 0)}
            </p>
          </div>

          {/* Timer adivinar */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--font-title)', color: timerColor(timerAdivinar, TIEMPO_ADIVINAR) }}>{timerAdivinar}</span>
            <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>segundos</p>
          </div>

          <input
            className="input-field"
            placeholder={`Escribe en ${idiomaAprende === 'nl' ? 'holandés' : 'español'}...`}
            value={respuesta}
            onChange={e => { setRespuesta(e.target.value); respuestaAutoRef.current = e.target.value }}
          />
          <button className="btn-primary" onClick={enviarIntentoPista} disabled={enviando || !respuesta.trim()}>
            {enviando ? <span className="loader" /> : 'CONTINUAR'}
          </button>
        </div>
      )}

      {/* Pareja adivina */}
      {sesion?.estado === 'pendiente' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <p style={s.instruccion}>¿Qué ves? Escribe tu respuesta en <strong>{idiomaAprende === 'nl' ? 'holandés' : 'español'}</strong></p>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />

          {/* Pistas disponibles */}
          <p style={{ fontSize: 13, color: 'var(--text-hint)', textAlign: 'center' }}>
            Pistas disponibles: {2 - (datos.pistas_dadas || 0)}
          </p>

          {/* Timer adivinar */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--font-title)', color: timerColor(timerAdivinar, TIEMPO_ADIVINAR) }}>{timerAdivinar}</span>
            <p style={{ fontSize: 12, color: 'var(--text-hint)' }}>segundos</p>
          </div>

          <input
            className="input-field"
            placeholder={`Escribe en ${idiomaAprende === 'nl' ? 'holandés' : 'español'}...`}
            value={respuesta}
            onChange={e => { setRespuesta(e.target.value); respuestaAutoRef.current = e.target.value }}
          />
          <button className="btn-primary" onClick={enviarRespuesta} disabled={enviando || !respuesta.trim()}>
            {enviando ? <span className="loader" /> : 'CONTINUAR'}
          </button>
        </div>
      )}

      {/* Iniciador evalúa — pregunta pista */}
      {sesion?.estado === 'respondido' && esIniciador && mostrarPreguntaPista && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={s.card}><p style={s.cardLabel}>Respuesta de {parejaProfile?.nombre}</p><p style={s.cardValue}>{datos.respuesta}</p></div>
          <div style={{ ...s.card, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16 }}>¿Dar una pista?</p>
            <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 16 }}>Pistas usadas: {datos.pistas_dadas || 0}/2</p>
            <div style={s.btnRow}>
              <button className="btn-primary" onClick={darPista} disabled={enviando} style={{ flex: 1 }}>Sí, dar pista</button>
              <button className="btn-outline" onClick={noDarPista} disabled={enviando} style={{ flex: 1 }}>No, revelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Iniciador evalúa */}
      {sesion?.estado === 'respondido' && esIniciador && !mostrarPreguntaPista && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={s.card}><p style={s.cardLabel}>Respuesta de {parejaProfile?.nombre}</p><p style={s.cardValue}>{datos.respuesta}</p></div>
          <div style={s.btnRow}>
            <button className="btn-primary" onClick={() => evaluar(true)} disabled={enviando} style={{ flex: 1 }}>¡Correcto! ✓</button>
            <button className="btn-outline" onClick={() => evaluar(false)} disabled={enviando} style={{ flex: 1 }}>No era eso ✕</button>
          </div>
        </div>
      )}

      {/* Pareja espera evaluación */}
      {sesion?.estado === 'respondido' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={s.card}><p style={s.cardLabel}>Tu respuesta</p><p style={s.cardValue}>{datos.respuesta}</p></div>
          <p style={s.esperando}>Esperando evaluación...</p>
          <button className="btn-outline" onClick={() => navigate('/inicio')} style={{ marginTop: 8 }}>← Volver al inicio</button>
        </div>
      )}

      {/* Revelar qué era (si incorrecta) */}
      {sesion?.estado === 'castigo' && esIniciador && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={s.card}><p style={s.cardLabel}>Respuesta de {parejaProfile?.nombre}</p><p style={s.cardValue}>{datos.respuesta}</p></div>
          <p style={s.instruccion}>¿Qué era realmente?</p>
          <input className="input-field" placeholder="Era un/una..." value={queEra} onChange={e => setQueEra(e.target.value)} />
          <button className="btn-primary" onClick={revelarQueEra} disabled={enviando || !queEra.trim()}>
            {enviando ? <span className="loader" /> : 'Revelar'}
          </button>
        </div>
      )}

      {sesion?.estado === 'castigo' && !esIniciador && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div style={s.card}><p style={s.cardLabel}>Tu respuesta</p><p style={s.cardValue}>{datos.respuesta}</p></div>
          <p style={s.esperando}>Esperando revelación...</p>
        </div>
      )}

      {/* Finalizado */}
      {sesion?.estado === 'finalizado' && (
        <div className="fade-in" style={s.content}>
          <img src={datos.dibujo_url} alt="dibujo" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }} />
          {datos.respuesta && <div style={s.card}><p style={s.cardLabel}>Respuesta</p><p style={s.cardValue}>{datos.respuesta}</p></div>}
          {datos.que_era && <div style={s.card}><p style={s.cardLabel}>Era...</p><p style={s.cardValue}>{datos.que_era}</p></div>}
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: datos.correcto ? '#4caf50' : '#ff6b6b' }}>
            {datos.correcto ? `¡Correcto! +${PUNTOS_JUEGO.dibuja_traduce}pts` : '¡Casi! Siguiente vez será'}
          </p>
          <button
            onClick={guardarDibujo}
            disabled={guardando || guardado}
            style={{ background: guardado ? 'rgba(76,175,80,0.15)' : 'rgba(48,105,155,0.15)', border: `1px solid ${guardado ? '#4caf50' : '#30699b'}`, borderRadius: 12, padding: '14px', color: guardado ? '#4caf50' : '#30699b', fontWeight: 600, fontSize: 15, cursor: guardado ? 'default' : 'pointer' }}>
            {guardado ? '✓ Dibujo guardado' : guardando ? <span className="loader" /> : 'Guardar dibujo'}
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
  cardValue: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' },
  esperando: { textAlign: 'center', color: 'var(--text-hint)', fontSize: 15, padding: 20 },
  btnRow: { display: 'flex', gap: 12 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  updateIcon: { position: 'absolute', top: 20, left: 20, fontSize: 24, animation: 'spin 1s linear infinite' },
}
