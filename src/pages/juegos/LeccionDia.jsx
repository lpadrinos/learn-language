import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { otorgarPuntos, TIPOS_JUEGO, PUNTOS_JUEGO } from '../../lib/juegos'
import PuntosAnimacion from '../../components/PuntosAnimacion'

const TEMAS = [
  { titulo: 'Saludos y despedidas', palabras: [{ es: 'hola', nl: 'hallo' }, { es: 'adiós', nl: 'doei' }, { es: 'buenos días', nl: 'goedemorgen' }, { es: 'buenas noches', nl: 'goedenacht' }, { es: '¿cómo estás?', nl: 'hoe gaat het?' }] },
  { titulo: 'Números 1–10', palabras: [{ es: 'uno', nl: 'één' }, { es: 'dos', nl: 'twee' }, { es: 'tres', nl: 'drie' }, { es: 'cuatro', nl: 'vier' }, { es: 'cinco', nl: 'vijf' }, { es: 'seis', nl: 'zes' }, { es: 'siete', nl: 'zeven' }, { es: 'ocho', nl: 'acht' }, { es: 'nueve', nl: 'negen' }, { es: 'diez', nl: 'tien' }] },
  { titulo: 'Colores', palabras: [{ es: 'rojo', nl: 'rood' }, { es: 'azul', nl: 'blauw' }, { es: 'verde', nl: 'groen' }, { es: 'amarillo', nl: 'geel' }, { es: 'negro', nl: 'zwart' }, { es: 'blanco', nl: 'wit' }] },
  { titulo: 'Comida', palabras: [{ es: 'agua', nl: 'water' }, { es: 'pan', nl: 'brood' }, { es: 'leche', nl: 'melk' }, { es: 'café', nl: 'koffie' }, { es: 'cerveza', nl: 'bier' }, { es: 'delicioso', nl: 'lekker' }] },
  { titulo: 'Familia', palabras: [{ es: 'mamá', nl: 'mama' }, { es: 'papá', nl: 'papa' }, { es: 'hermano', nl: 'broer' }, { es: 'hermana', nl: 'zus' }, { es: 'abuelo', nl: 'opa' }, { es: 'abuela', nl: 'oma' }] },
  { titulo: 'Clima', palabras: [{ es: 'sol', nl: 'zon' }, { es: 'lluvia', nl: 'regen' }, { es: 'frío', nl: 'koud' }, { es: 'calor', nl: 'warm' }, { es: 'viento', nl: 'wind' }, { es: 'nieve', nl: 'sneeuw' }] },
  { titulo: 'Transportes', palabras: [{ es: 'coche', nl: 'auto' }, { es: 'tren', nl: 'trein' }, { es: 'bicicleta', nl: 'fiets' }, { es: 'avión', nl: 'vliegtuig' }, { es: 'barco', nl: 'boot' }] },
  { titulo: 'Emociones', palabras: [{ es: 'feliz', nl: 'blij' }, { es: 'triste', nl: 'verdrietig' }, { es: 'enamorado', nl: 'verliefd' }, { es: 'nervioso', nl: 'zenuwachtig' }, { es: 'cansado', nl: 'moe' }] },
  { titulo: 'Casa', palabras: [{ es: 'casa', nl: 'huis' }, { es: 'cocina', nl: 'keuken' }, { es: 'dormitorio', nl: 'slaapkamer' }, { es: 'baño', nl: 'badkamer' }, { es: 'jardín', nl: 'tuin' }] },
  { titulo: 'Ropa', palabras: [{ es: 'camisa', nl: 'shirt' }, { es: 'zapatos', nl: 'schoenen' }, { es: 'abrigo', nl: 'jas' }, { es: 'vestido', nl: 'jurk' }, { es: 'sombrero', nl: 'hoed' }] },
  { titulo: 'Naturaleza', palabras: [{ es: 'árbol', nl: 'boom' }, { es: 'flor', nl: 'bloem' }, { es: 'mar', nl: 'zee' }, { es: 'montaña', nl: 'berg' }, { es: 'río', nl: 'rivier' }] },
  { titulo: 'Trabajo', palabras: [{ es: 'trabajo', nl: 'werk' }, { es: 'reunión', nl: 'vergadering' }, { es: 'jefe', nl: 'baas' }, { es: 'proyecto', nl: 'project' }, { es: 'dinero', nl: 'geld' }] },
  { titulo: 'Tiempo', palabras: [{ es: 'hoy', nl: 'vandaag' }, { es: 'mañana', nl: 'morgen' }, { es: 'ayer', nl: 'gisteren' }, { es: 'semana', nl: 'week' }, { es: 'mes', nl: 'maand' }] },
  { titulo: 'Frases románticas', palabras: [{ es: 'te quiero', nl: 'ik hou van jou' }, { es: 'te extraño', nl: 'ik mis je' }, { es: 'eres bonita', nl: 'je bent mooi' }, { es: 'mi amor', nl: 'mijn liefde' }] },
  { titulo: 'Slang casual', palabras: [{ es: 'genial', nl: 'gaaf' }, { es: '¿en serio?', nl: 'echt waar?' }, { es: 'qué bien', nl: 'wat leuk' }, { es: 'no way', nl: 'no way' }] },
]

const EMOJI_MAP = {
  hola: '👋', adiós: '✌', 'buenos días': '🌅', 'buenas noches': '🌙', '¿cómo estás?': '🙂',
  uno: '1️⃣', dos: '2️⃣', tres: '3️⃣', cuatro: '4️⃣', cinco: '5️⃣', seis: '6️⃣', siete: '7️⃣', ocho: '8️⃣', nueve: '9️⃣', diez: '🔟',
  rojo: '🔴', azul: '🔵', verde: '🟢', amarillo: '🟡', negro: '⬛', blanco: '⬜',
  agua: '💧', pan: '🍞', leche: '🥛', café: '☕', cerveza: '🍺', delicioso: '😋',
  mamá: '👩', papá: '👨', hermano: '👦', hermana: '👧', abuelo: '👴', abuela: '👵',
  sol: '☀️', lluvia: '🌧', frío: '🥶', calor: '🥵', viento: '💨', nieve: '❄️',
  coche: '🚗', tren: '🚂', bicicleta: '🚲', avión: '✈️', barco: '⛵',
  feliz: '😊', triste: '😢', enamorado: '😍', nervioso: '😰', cansado: '😴',
  casa: '🏠', cocina: '🍳', dormitorio: '🛏', baño: '🚿', jardín: '🌿',
  camisa: '👕', zapatos: '👟', abrigo: '🧥', vestido: '👗', sombrero: '🎩',
  árbol: '🌳', flor: '🌸', mar: '🌊', montaña: '⛰', río: '🏞',
  trabajo: '💼', reunión: '🤝', jefe: '👔', proyecto: '📋', dinero: '💰',
  hoy: '📅', mañana: '⏭', ayer: '⏮', semana: '🗓', mes: '📆',
  'te quiero': '❤️', 'te extraño': '💔', 'eres bonita': '🌹', 'mi amor': '💕',
  genial: '🔥', '¿en serio?': '😲', 'qué bien': '🎉', 'no way': '😱',
}

function getEmoji(palabra) {
  return EMOJI_MAP[palabra.toLowerCase()] || '◉'
}

function getDayIndex() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const dayOfYear = Math.ceil((now - start) / 86400000)
  return dayOfYear % 15
}

function getTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getYesterdayKey() {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function generarQuiz(palabras) {
  const banco = [...palabras]
  const preguntas = []
  const indices = []
  while (indices.length < Math.min(3, banco.length)) {
    const idx = Math.floor(Math.random() * banco.length)
    if (!indices.includes(idx)) indices.push(idx)
  }
  for (const idx of indices) {
    const correcta = banco[idx]
    const otras = banco.filter((_, i) => i !== idx)
    const distractores = []
    while (distractores.length < 2 && otras.length > 0) {
      const rIdx = Math.floor(Math.random() * otras.length)
      distractores.push(otras.splice(rIdx, 1)[0])
    }
    const opciones = [correcta, ...distractores].sort(() => Math.random() - 0.5)
    preguntas.push({ pregunta: correcta.es, correcta: correcta.nl, opciones: opciones.map(o => o.nl) })
  }
  return preguntas
}

export default function LeccionDia() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile } = useAuth()
  const userId = session?.user?.id
  const tema = TEMAS[getDayIndex()]
  const hoy = getTodayKey()
  const ayer = getYesterdayKey()

  const [sesion, setSesion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vistas, setVistas] = useState(new Set())
  const [flipped, setFlipped] = useState(new Set())
  const [enviando, setEnviando] = useState(false)
  const [showPuntos, setShowPuntos] = useState(false)
  const [puntosVal, setPuntosVal] = useState(10)

  // Quiz state
  const [modoQuiz, setModoQuiz] = useState(false)
  const [preguntas, setPreguntas] = useState([])
  const [preguntaActual, setPreguntaActual] = useState(0)
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null)
  const [quizAprobado, setQuizAprobado] = useState(false)
  const [quizError, setQuizError] = useState(false)

  // Racha
  const [racha, setRacha] = useState(0)

  useEffect(() => {
    if (!pareja) { setLoading(false); return }
    cargar()

    const channel = supabase
      .channel(`leccion-${pareja.id}-${hoy}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'juegos_sesiones', filter: `pareja_id=eq.${pareja.id}` }, (payload) => {
        if (payload.new?.tipo_juego === TIPOS_JUEGO.LECCION_DIA && payload.new?.datos?.fecha === hoy) {
          setSesion(payload.new)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [pareja])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('juegos_sesiones')
      .select('*')
      .eq('pareja_id', pareja.id)
      .eq('tipo_juego', TIPOS_JUEGO.LECCION_DIA)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data?.datos?.fecha === hoy) {
      setSesion(data)
    } else {
      setSesion(null)
    }

    // Calcular racha
    calcularRacha()
    setLoading(false)
  }

  async function calcularRacha() {
    try {
      // Obtener sesiones de lección finalizadas, ordenadas desc
      const { data: sesiones } = await supabase
        .from('juegos_sesiones')
        .select('datos, estado, created_at')
        .eq('pareja_id', pareja.id)
        .eq('tipo_juego', TIPOS_JUEGO.LECCION_DIA)
        .eq('estado', 'finalizado')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!sesiones || sesiones.length === 0) { setRacha(0); return }

      // Contar días consecutivos donde ambos completaron
      let count = 0
      const today = new Date(hoy)
      let checkDate = new Date(today)

      for (let d = 0; d < 30; d++) {
        const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
        const sesionDia = sesiones.find(s => s.datos?.fecha === dateKey)
        const ambosCompleto = sesionDia && sesionDia.datos?.completados?.length >= 2
        if (ambosCompleto) {
          count++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
      setRacha(count)
    } catch { setRacha(0) }
  }

  function toggleFlip(i) {
    setFlipped(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
    setVistas(prev => new Set([...prev, i]))
  }

  function iniciarQuiz() {
    const qs = generarQuiz(tema.palabras)
    setPreguntas(qs)
    setPreguntaActual(0)
    setRespuestaSeleccionada(null)
    setQuizError(false)
    setModoQuiz(true)
  }

  function responderQuiz(opcion) {
    if (respuestaSeleccionada !== null) return
    setRespuestaSeleccionada(opcion)
    const correcta = preguntas[preguntaActual].correcta
    if (opcion === correcta) {
      setTimeout(() => {
        if (preguntaActual + 1 >= preguntas.length) {
          setQuizAprobado(true)
          setModoQuiz(false)
        } else {
          setPreguntaActual(p => p + 1)
          setRespuestaSeleccionada(null)
        }
      }, 800)
    } else {
      // Fallo — reiniciar quiz
      setTimeout(() => {
        setQuizError(true)
        setRespuestaSeleccionada(null)
        setPreguntaActual(0)
        const qs = generarQuiz(tema.palabras)
        setPreguntas(qs)
        setTimeout(() => setQuizError(false), 2000)
      }, 800)
    }
  }

  const yaComplete = sesion?.datos?.completados?.includes(userId)
  const parejaCompleto = sesion?.datos?.completados?.includes(
    pareja?.user_id_1 === userId ? pareja?.user_id_2 : pareja?.user_id_1
  )

  async function completar() {
    setEnviando(true)
    try {
      const completados = sesion?.datos?.completados || []
      const nuevos = [...new Set([...completados, userId])]
      const ambos = nuevos.length >= 2

      if (!sesion) {
        const { data } = await supabase.from('juegos_sesiones').insert({
          pareja_id: pareja.id,
          tipo_juego: TIPOS_JUEGO.LECCION_DIA,
          iniciador_id: userId,
          estado: ambos ? 'finalizado' : 'pendiente',
          datos: { fecha: hoy, tema_index: getDayIndex(), completados: nuevos },
        }).select().single()
        setSesion(data)
      } else {
        const { data } = await supabase.from('juegos_sesiones')
          .update({ estado: ambos ? 'finalizado' : 'respondido', datos: { ...sesion.datos, completados: nuevos }, updated_at: new Date().toISOString() })
          .eq('id', sesion.id).select().single()
        setSesion(data)
        if (ambos) {
          await otorgarPuntos(userId, pareja.id, TIPOS_JUEGO.LECCION_DIA, PUNTOS_JUEGO.leccion_dia_bonus)
        }
      }

      await otorgarPuntos(userId, pareja.id, TIPOS_JUEGO.LECCION_DIA, PUNTOS_JUEGO.leccion_dia)
      const pts = ambos ? PUNTOS_JUEGO.leccion_dia + PUNTOS_JUEGO.leccion_dia_bonus : PUNTOS_JUEGO.leccion_dia
      setPuntosVal(pts)
      setShowPuntos(true)
    } catch { alert('Error al completar') }
    setEnviando(false)
  }

  const todasVistas = vistas.size >= tema.palabras.length

  if (loading) return <div className="page-with-tabs" style={s.center}><span className="loader" /></div>
  if (!pareja) return <div className="page-with-tabs" style={s.center}><p style={s.hint}>Vincula una pareja para jugar</p></div>

  // MODO QUIZ
  if (modoQuiz && preguntas.length > 0) {
    const q = preguntas[preguntaActual]
    return (
      <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px' }}>
        <h1 style={s.title}>QUIZ RÁPIDO</h1>
        {quizError && (
          <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid #ff4444', borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'center', color: '#ff4444', fontWeight: 600 }}>
            ✕ Incorrecto — volvemos a empezar
          </div>
        )}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 8 }}>Pregunta {preguntaActual + 1} de {preguntas.length}</p>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: '#30699b', width: `${((preguntaActual + 1) / preguntas.length) * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>¿Cómo se dice en holandés?</p>
          <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b', textAlign: 'center', padding: '12px 0' }}>
            {getEmoji(q.pregunta)} {q.pregunta}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.opciones.map((op, i) => {
            let bg = 'var(--bg-secondary)'
            let color = 'var(--text-primary)'
            let border = '1px solid var(--border)'
            if (respuestaSeleccionada === op) {
              if (op === q.correcta) { bg = 'rgba(76,175,80,0.2)'; border = '1px solid #4caf50'; color = '#4caf50' }
              else { bg = 'rgba(255,80,80,0.2)'; border = '1px solid #ff4444'; color = '#ff4444' }
            }
            return (
              <button key={i} onClick={() => responderQuiz(op)}
                style={{ background: bg, border, borderRadius: 14, padding: '16px 18px', textAlign: 'left', fontSize: 18, fontWeight: 600, color, fontFamily: 'var(--font-title)', minHeight: 56, cursor: 'pointer', transition: 'all 0.2s' }}>
                {op}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '20px 16px' }}>
      <button onClick={() => navigate('/inicio')} style={s.back}>← Volver</button>
      <h1 style={s.title}>LECCIÓN DEL DÍA</h1>
      <PuntosAnimacion puntos={puntosVal} visible={showPuntos} />

      <div style={s.card}>
        <p style={s.cardLabel}>Tema de hoy</p>
        <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>{tema.titulo}</p>
        <p style={{ fontSize: 13, color: 'var(--text-hint)', marginTop: 4 }}>{tema.palabras.length} palabras</p>
      </div>

      {/* Racha conjunta */}
      {racha > 0 && (
        <div style={{ ...s.card, marginTop: 12, background: 'rgba(48,105,155,0.15)', border: '1px solid #30699b', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-title)', color: '#30699b' }}>▲ {racha} días</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Llevan {racha} día{racha !== 1 ? 's' : ''} completando juntos</p>
        </div>
      )}

      {(yaComplete || parejaCompleto) && (
        <div style={{ ...s.card, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Tú: {yaComplete ? '✓ Completado' : '— Pendiente'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {parejaProfile?.nombre || 'Pareja'}: {parejaCompleto ? '✓ Completado' : '— Pendiente'}
          </span>
        </div>
      )}

      {/* Barra de progreso */}
      <div style={{ ...s.card, marginTop: 12 }}>
        <p style={s.cardLabel}>Progreso — {vistas.size}/{tema.palabras.length} palabras</p>
        <div style={s.barWrap}>
          <div style={{ ...s.barFill, width: `${(vistas.size / tema.palabras.length) * 100}%` }} />
        </div>
      </div>

      {/* Tarjetas flip */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {tema.palabras.map((p, i) => (
          <div key={i} onClick={() => toggleFlip(i)} style={{ ...s.flipCard, background: flipped.has(i) ? '#30699b' : 'var(--bg-secondary)', cursor: 'pointer', transition: 'background 0.3s' }}>
            <p style={{ fontSize: 13, color: flipped.has(i) ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', marginBottom: 4 }}>
              {flipped.has(i) ? 'Holandés' : 'Español'}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-title)', color: flipped.has(i) ? '#fff' : '#30699b' }}>
              {getEmoji(p.es)} {flipped.has(i) ? p.nl : p.es}
            </p>
            <p style={{ fontSize: 12, color: flipped.has(i) ? 'rgba(255,255,255,0.5)' : 'var(--text-hint)', marginTop: 4 }}>
              {flipped.has(i) ? `← ${p.es}` : 'Toca para ver traducción'}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        {yaComplete ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#4caf50', fontWeight: 700, fontSize: 16 }}>✓ Lección completada hoy</p>
            {parejaCompleto
              ? <p style={{ color: 'var(--text-hint)', fontSize: 13, marginTop: 8 }}>¡{parejaProfile?.nombre} también la completó! +{PUNTOS_JUEGO.leccion_dia_bonus}pts extra</p>
              : <p style={{ color: 'var(--text-hint)', fontSize: 13, marginTop: 8 }}>Esperando que {parejaProfile?.nombre || 'tu pareja'} complete...</p>
            }
          </div>
        ) : !todasVistas ? (
          <button className="btn-primary" disabled>
            Ve todas las palabras ({vistas.size}/{tema.palabras.length})
          </button>
        ) : !quizAprobado ? (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>¡Viste todas las palabras! Ahora responde el mini-quiz para completar.</p>
            <button className="btn-primary" onClick={iniciarQuiz}>
              Hacer quiz rápido (3 preguntas)
            </button>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p style={{ color: '#4caf50', fontWeight: 700, fontSize: 15 }}>✓ Quiz aprobado</p>
            </div>
            <button className="btn-primary" onClick={completar} disabled={enviando}>
              {enviando ? <span className="loader" /> : '¡Completé la lección! +10pts'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  back: { background: 'none', color: 'var(--text-secondary)', fontSize: 15, padding: 0, marginBottom: 16 },
  title: { fontFamily: 'var(--font-title)', fontSize: 24, marginBottom: 20 },
  card: { background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 },
  cardLabel: { fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 },
  hint: { color: 'var(--text-secondary)', textAlign: 'center' },
  barWrap: { height: 6, borderRadius: 3, background: 'var(--border)', marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', background: '#30699b', borderRadius: 3, transition: 'width 0.4s ease' },
  flipCard: { border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', textAlign: 'center', minHeight: 80 },
}
