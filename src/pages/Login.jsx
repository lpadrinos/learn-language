import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div className="page" style={{ overflow: 'auto', padding: '40px 24px' }}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Volver</button>
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 26, marginBottom: 8 }}>Iniciar sesión</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
        Ingresa tus credenciales
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <input
          className="input-field"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div style={styles.passWrap}>
          <input
            className="input-field"
            type={showPass ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ paddingRight: 48 }}
          />
          <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            {showPass ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="loader" /> : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  back: {
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: 15,
    marginBottom: 24,
    padding: 0,
  },
  passWrap: {
    position: 'relative',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  error: {
    background: 'rgba(255,80,80,0.15)',
    color: '#ff6b6b',
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 16,
  },
}
