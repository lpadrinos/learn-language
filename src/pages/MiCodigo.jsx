import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function MiCodigo() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const codigo = profile?.codigo_unico || 'Ll-...'

  function handleWhatsApp() {
    const text = encodeURIComponent(`¡Únete a Learn Language para practicar idiomas juntos! Mi código: ${codigo}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="page fade-in" style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 24, textAlign: 'center' }}>Tu código único</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, textAlign: 'center' }}>
        Comparte este código con tu pareja de intercambio
      </p>

      <div style={styles.codeBox}>
        <span style={styles.code}>{codigo}</span>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={handleWhatsApp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          ◇ Invitar por WhatsApp
        </button>
        <button className="btn-outline" onClick={() => navigate('/ingresar-codigo')}>
          Ingresar código de mi pareja
        </button>
      </div>
    </div>
  )
}

const styles = {
  codeBox: {
    background: 'var(--bg-secondary)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    padding: '20px 28px',
    width: '100%',
    textAlign: 'center',
  },
  code: {
    color: '#30699b',
    fontFamily: 'var(--font-title)',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 1,
  },
}
