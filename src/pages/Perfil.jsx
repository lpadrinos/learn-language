import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useState, useRef } from 'react'

const idiomaLabel = (code) => code === 'nl' ? '🇳🇱 Holandés' : code === 'es' ? '🇪🇸 Español' : code

export default function Perfil() {
  const { profile, parejaProfile, pareja, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [desvinculando, setDesvinculando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const timeoutRef = useRef(null)

  async function handleDesvincular() {
    if (!confirm('¿Seguro que quieres desvincular a tu pareja?')) return
    setDesvinculando(true)
    await supabase.from('parejas').update({ activa: false }).eq('id', pareja.id)
    await refreshProfile()
    setDesvinculando(false)
  }

  function handleInvitar() {
    const text = encodeURIComponent(`¡Únete a Learn Language para practicar idiomas juntos! Mi código: ${profile?.codigo_unico}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  function handleCopiarCodigo() {
    navigator.clipboard.writeText(profile?.codigo_unico)
    setCopiado(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopiado(false), 2000)
  }

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', padding: '24px 16px' }}>
      {/* Avatar + Name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={styles.avatar}>
          {profile?.foto_url
            ? <img src={profile.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 32, fontWeight: 700 }}>{profile?.nombre?.[0] || '?'}</span>
          }
        </div>
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 22, marginTop: 12 }}>{profile?.nombre}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Habla {idiomaLabel(profile?.idioma_habla)} · Aprende {idiomaLabel(profile?.idioma_aprende)}
        </p>
      </div>

      {/* Código */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Código de invitación</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ color: '#30699b', fontWeight: 700, fontSize: 15 }}>{profile?.codigo_unico}</p>
              <button
                onClick={handleCopiarCodigo}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: 0,
                  color: copiado ? '#4caf50' : '#30699b',
                  transition: 'color 0.3s',
                }}
                title="Copiar código"
              >
                {copiado ? '✓' : '⊞'}
              </button>
            </div>
          </div>
          <button onClick={handleInvitar} style={styles.smallBtn}>Invitar</button>
        </div>
      </div>

      {/* Pareja */}
      {parejaProfile && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={styles.miniAvatar(parejaProfile.foto_url)}>
                {!parejaProfile.foto_url && (parejaProfile.nombre?.[0] || '?')}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 15 }}>{parejaProfile.nombre}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Habla {idiomaLabel(parejaProfile.idioma_habla)} · Aprende {idiomaLabel(parejaProfile.idioma_aprende)}
                </p>
              </div>
            </div>
            <button onClick={handleDesvincular} disabled={desvinculando} style={styles.deleteBtn}>
              ✕
            </button>
          </div>
        </div>
      )}

      {!parejaProfile && (
        <button className="btn-outline" onClick={() => navigate('/ingresar-codigo')} style={{ marginTop: 12 }}>
          Vincular pareja
        </button>
      )}

      {/* Editar perfil */}
      <div style={{ ...styles.card, marginTop: 12, cursor: 'pointer' }} onClick={() => navigate('/crear-perfil')}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Editar perfil</span>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={handleLogout}
        style={{ background: 'none', color: '#ff6b6b', fontSize: 15, fontWeight: 600, marginTop: 24, padding: 12, width: '100%' }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}

const styles = {
  avatar: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: '#30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    overflow: 'hidden',
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '16px',
  },
  smallBtn: {
    background: '#30699b',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    minHeight: 36,
  },
  miniAvatar: (url) => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: url ? `url(${url}) center/cover` : '#30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  }),
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(255,80,80,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
}
