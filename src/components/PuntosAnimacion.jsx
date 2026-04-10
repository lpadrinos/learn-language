import { useState, useEffect } from 'react'

export default function PuntosAnimacion({ puntos, visible }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      top: '40%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: 48,
      fontFamily: 'var(--font-title)',
      fontWeight: 700,
      color: '#30699b',
      textShadow: '0 2px 20px rgba(48,105,155,0.5)',
      animation: 'floatUp 2s ease-out forwards',
      zIndex: 1000,
      pointerEvents: 'none',
    }}>
      +{puntos} pts
      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1); }
        }
      `}</style>
    </div>
  )
}
