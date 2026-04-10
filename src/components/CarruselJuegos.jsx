import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { contarRetosPendientes } from '../lib/juegos'

const JUEGOS = [
  { nombre: 'LECCIÓN DEL DÍA', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775742626/hf_20260408_184808_535883b0-eb7e-43f3-b50c-26c820c86a3b_bxj29a.jpg', ruta: '/juego/leccion-dia', tipo: 'leccion_dia' },
  { nombre: 'TRES PALABRAS', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775742626/hf_20260409_084959_62c57495-4e29-4f23-873f-5a271b72ecb8_qxjdof.jpg', ruta: '/juego/tres-palabras', tipo: 'tres_palabras' },
  { nombre: 'DIBUJA Y TRADUCE', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775742626/hf_20260409_084504_4e622107-982b-469f-9d67-dff0e898aa7b_h1stxx.jpg', ruta: '/juego/dibuja-traduce', tipo: 'dibuja_traduce' },
  { nombre: 'RETO DE VELOCIDAD', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775742626/hf_20260409_085740_c87e5822-4eff-4f8d-9a34-243adcebf1ad_spsayq.jpg', ruta: '/juego/reto-velocidad', tipo: 'reto_velocidad' },
  { nombre: 'FRASES PARA LIGAR', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775742626/hf_20260409_081256_7a9bad8c-60af-4db8-b2eb-7bfe0f68170d_bu5rsx.jpg', ruta: '/juego/frases-para-ligar', tipo: 'frases_ligar' },
  { nombre: 'IMITA EL ACENTO', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775646528/hf_20260408_103208_3a1d6680-f6bc-423f-846c-795d911d81bd_cwgojz.jpg', ruta: '/juego/imita-acento', tipo: 'imita_acento' },
  { nombre: 'CASTIGO LINGÜÍSTICO', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775568561/hf_20260407_130044_20c6ed70-0f35-4cef-91ab-c3871e768db5_1_1_kjb9fj.jpg', ruta: '/juego/castigo-linguistico', tipo: 'castigo_linguistico' },
  { nombre: 'LA PALABRA PROHIBIDA', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775646527/hf_20260408_102018_d84a6d97-2e9e-4404-bd62-53b26c7ec24a_v0gggm.jpg', ruta: '/juego/palabra-prohibida', tipo: 'palabra_prohibida' },
  { nombre: 'EL RETO DEL BESO', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775646530/hf_20260408_105814_4d074817-dd0b-4ced-96f7-04179d1556bf_cgfodk.jpg', ruta: '/juego/reto-beso', tipo: 'reto_beso' },
  { nombre: 'COMPLETA LA FRASE PÍCARA', imagen: 'https://res.cloudinary.com/dh2ib3cbe/image/upload/v1775646528/hf_20260408_104938_f7a068cd-5adc-4d78-b4cb-01a6890223ed_nev9oi.jpg', ruta: '/juego/completa-frase', tipo: 'completa_frase' },
]

export default function CarruselJuegos() {
  const navigate = useNavigate()
  const { session, pareja } = useAuth()
  const [current, setCurrent] = useState(0)
  const touchStart = useRef(0)
  const touchDelta = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState(0)
  const [badges, setBadges] = useState({})

  useEffect(() => {
    if (!pareja || !session) return
    contarRetosPendientes(pareja.id, session.user.id).then(setBadges)
  }, [pareja, session])

  function next() { setCurrent(c => (c + 1) % JUEGOS.length) }
  function prev() { setCurrent(c => (c - 1 + JUEGOS.length) % JUEGOS.length) }

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX
    touchDelta.current = 0
    setDragging(true)
  }

  function onTouchMove(e) {
    if (!dragging) return
    touchDelta.current = e.touches[0].clientX - touchStart.current
    setOffset(touchDelta.current)
  }

  function onTouchEnd() {
    setDragging(false)
    if (touchDelta.current < -50) next()
    else if (touchDelta.current > 50) prev()
    setOffset(0)
  }

  function getIndex(i) {
    const diff = ((i - current) % JUEGOS.length + JUEGOS.length) % JUEGOS.length
    if (diff === 0) return 0
    if (diff === 1) return 1
    if (diff === JUEGOS.length - 1) return -1
    if (diff === 2) return 2
    if (diff === JUEGOS.length - 2) return -2
    return null
  }

  function handleJugar(juego) {
    if (juego.ruta) navigate(juego.ruta)
  }

  return (
    <div
      style={styles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div style={styles.track}>
        {JUEGOS.map((juego, i) => {
          const pos = getIndex(i)
          if (pos === null) return null

          const isCenter = pos === 0
          const translateX = pos * 75 + (dragging ? offset * 0.3 : 0)
          const scale = isCenter ? 1 : 0.87
          const opacity = isCenter ? 1 : 0.4
          const zIndex = isCenter ? 10 : 5 - Math.abs(pos)
          const badgeCount = juego.tipo ? (badges[juego.tipo] || 0) : 0

          return (
            <div
              key={i}
              style={{
                ...styles.card,
                background: juego.imagen ? `url(${juego.imagen}) center/cover` : juego.gradient,
                transform: `translateX(${translateX}%) scale(${scale})`,
                opacity,
                zIndex,
                transition: dragging ? 'none' : 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
            >
              {/* Badge */}
              {badgeCount > 0 && (
                <div style={styles.badge}>Tu turno</div>
              )}

              {/* Dots */}
              <div style={styles.dots}>
                {JUEGOS.map((_, di) => {
                  const dotBadge = JUEGOS[di].tipo ? (badges[JUEGOS[di].tipo] || 0) : 0
                  const isActive = di === current
                  return (
                    <div key={di} style={{
                      ...styles.dot,
                      background: dotBadge > 0 ? '#ff4444' : isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                      transform: dotBadge > 0 ? 'scale(1.3)' : 'scale(1)',
                    }} />
                  )
                })}
              </div>

              {/* Overlay */}
              <div style={styles.overlay}>
                <span style={styles.cardName}>{juego.nombre}</span>
                <button
                  style={{ ...styles.playBtn, opacity: juego.ruta ? 1 : 0.5 }}
                  onClick={isCenter ? () => handleJugar(juego) : undefined}
                >
                  {juego.ruta ? 'Jugar' : 'Pronto'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'pan-y',
    userSelect: 'none',
  },
  track: {
    position: 'relative',
    width: '78%',
    height: '85%',
  },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    background: '#ff4444',
    color: '#fff',
    borderRadius: 20,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    zIndex: 5,
    letterSpacing: 0.3,
    boxShadow: '0 2px 8px rgba(255,68,68,0.5)',
  },
  dots: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
  },
  overlay: {
    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
    padding: '40px 18px 18px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardName: {
    fontFamily: 'var(--font-title)',
    fontSize: 17,
    fontWeight: 600,
    color: '#fff',
  },
  playBtn: {
    background: '#30699b',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    minHeight: 44,
  },
  btnNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(48, 105, 155, 0.8)',
    border: 'none',
    borderRadius: 10,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
    transition: 'all 0.2s',
    padding: 0,
  },
}
