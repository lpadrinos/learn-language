import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export default function Bienvenida() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) {
      alert('Error al conectar con Google')
      setLoading(false)
    }
  }

  return (
    <div className="page" style={styles.container}>
      <div style={styles.imageArea}>
        <div style={styles.badge}>Ll</div>
      </div>

      <div style={styles.bottomArea}>
        <h1 style={styles.title}>Learn Language</h1>
        <p style={styles.subtitle}>Aprende idiomas con tu pareja de intercambio</p>

        <div style={styles.buttons}>
          <button className="btn-primary" onClick={() => navigate('/registro')}>
            Crear cuenta
          </button>
          <button className="btn-outline" onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>o continúa con</span>
          <span style={styles.dividerLine} />
        </div>

        <button className="btn-outline" onClick={handleGoogle} disabled={loading} style={styles.googleBtn}>
          {loading ? <span className="loader" /> : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    overflow: 'auto',
  },
  imageArea: {
    height: '50%',
    minHeight: 240,
    background: 'linear-gradient(180deg, #142e47 0%, #1a3854 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    background: '#30699b',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: 20,
    color: '#fff',
  },
  bottomArea: {
    flex: 1,
    padding: '28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: 15,
    marginBottom: 28,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  },
  dividerText: {
    color: 'var(--text-hint)',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
