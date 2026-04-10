import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function IngresarCodigo() {
  const navigate = useNavigate()
  const { session, profile, refreshProfile } = useAuth()
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!codigo.trim()) {
      setError('Ingresa un código')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { data: pareja, error: findErr } = await supabase
        .from('users')
        .select('*')
        .eq('codigo_unico', codigo.trim())
        .single()

      if (findErr || !pareja) {
        setError('No encontramos ese código. Verifica e intenta de nuevo.')
        setLoading(false)
        return
      }

      if (pareja.id === session.user.id) {
        setError('No puedes usar tu propio código')
        setLoading(false)
        return
      }

      const { data: existingPair } = await supabase
        .from('parejas')
        .select('*')
        .eq('activa', true)
        .or(`user_id_1.eq.${pareja.id},user_id_2.eq.${pareja.id}`)

      if (existingPair && existingPair.length > 0) {
        setError('Esta persona ya tiene una pareja activa')
        setLoading(false)
        return
      }

      const { data: myPair } = await supabase
        .from('parejas')
        .select('*')
        .eq('activa', true)
        .or(`user_id_1.eq.${session.user.id},user_id_2.eq.${session.user.id}`)

      if (myPair && myPair.length > 0) {
        setError('Ya tienes una pareja activa')
        setLoading(false)
        return
      }

      const idioma = profile.idioma_aprende

      const { error: insertErr } = await supabase
        .from('parejas')
        .insert({
          user_id_1: session.user.id,
          user_id_2: pareja.id,
          idioma,
          activa: true,
        })

      if (insertErr) throw insertErr

      await refreshProfile()
      navigate('/inicio', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Error al vincular. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page fade-in" style={{ padding: '40px 24px' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24, padding: 0 }}>
        ← Volver
      </button>
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 26, marginBottom: 8 }}>Ingresar código</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
        Escribe el código de tu pareja de intercambio
      </p>

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.15)', color: '#ff6b6b', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          className="input-field"
          placeholder="Ej: Ll-CARLOS-NL"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, letterSpacing: 1 }}
          required
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="loader" /> : 'Vincular pareja'}
        </button>
      </form>
    </div>
  )
}
