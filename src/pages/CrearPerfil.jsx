import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CrearPerfil() {
  const navigate = useNavigate()
  const { session, profile, setProfile } = useAuth()
  const fileRef = useRef(null)
  const [nombre, setNombre] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [habla, setHabla] = useState('')
  const [aprende, setAprende] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const esEdicion = !!profile

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || '')
      setFotoUrl(profile.foto_url || '')
      setHabla(profile.idioma_habla || '')
      setAprende(profile.idioma_aprende || '')
    }
  }, [profile])

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!nombre.trim()) {
      setError('Ingresa tu nombre')
      return
    }
    if (!habla) {
      setError('Selecciona el idioma que hablas')
      return
    }
    if (!aprende) {
      setError('Selecciona el idioma que aprendes')
      return
    }
    if (habla === aprende) {
      setError('Los idiomas deben ser diferentes')
      return
    }

    setError('')
    setLoading(true)

    try {
      let foto_url = ''

      if (fotoFile) {
        try {
          const ext = fotoFile.name.split('.').pop()
          const path = `${session.user.id}.${ext}`
          const { error: uploadErr, data: uploadData } = await supabase.storage
            .from('avatars')
            .upload(path, fotoFile, { upsert: true })

          if (uploadErr) {
            alert(`Error al subir foto: ${uploadErr.message}`)
          } else {
            const { data } = supabase.storage.from('avatars').getPublicUrl(path)
            foto_url = data.publicUrl
          }
        } catch (e) {
          alert(`Error: ${e.message}`)
        }
      }

      const siglas = habla === 'nl' ? 'NL' : 'ES'
      let codigoBase = `Ll-${nombre.trim().toUpperCase()}-${siglas}`
      let codigo = codigoBase

      const { data: existing } = await supabase
        .from('users')
        .select('codigo_unico')
        .eq('codigo_unico', codigo)

      if (existing && existing.length > 0) {
        let i = 2
        while (true) {
          codigo = `${codigoBase}-${i}`
          const { data: check } = await supabase
            .from('users')
            .select('codigo_unico')
            .eq('codigo_unico', codigo)
          if (!check || check.length === 0) break
          i++
        }
      }

      const userData = {
        id: session.user.id,
        nombre: nombre.trim(),
        foto_url,
        idioma_habla: habla,
        idioma_aprende: aprende,
        codigo_unico: codigo,
      }

      const { data, error: insertErr } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'id' })
        .select()
        .single()

      if (insertErr) throw insertErr

      setProfile(data)
      navigate(esEdicion ? '/perfil' : '/inicio', { replace: true })
    } catch (err) {
      console.error(err)
      alert(`Error al guardar: ${err.message}`)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ overflow: 'auto', padding: '40px 24px' }}>
      {!esEdicion && <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24, padding: 0 }}>← Volver</button>}
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 26, marginBottom: 8 }}>
        {esEdicion ? 'Editar perfil' : 'Crear perfil'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
        {esEdicion ? 'Actualiza tu información' : 'Completa tu información para empezar'}
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
        <div style={styles.avatarWrap} onClick={() => fileRef.current?.click()}>
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto" style={styles.avatarImg} />
          ) : (
            <span style={{ color: 'var(--text-hint)', fontSize: 14 }}>+ Foto</span>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
        </div>

        <input
          className="input-field"
          placeholder="Tu nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
        />

        <div style={{ width: '100%' }}>
          <label style={styles.label}>Idioma que hablas</label>
          <div style={styles.toggleRow}>
            <button type="button" style={habla === 'nl' ? styles.toggleActive : styles.toggle} onClick={() => setHabla('nl')}>
              NL Holandés
            </button>
            <button type="button" style={habla === 'es' ? styles.toggleActive : styles.toggle} onClick={() => setHabla('es')}>
              ES Español
            </button>
          </div>
        </div>

        <div style={{ width: '100%' }}>
          <label style={styles.label}>Idioma que aprendes</label>
          <div style={styles.toggleRow}>
            <button type="button" style={aprende === 'nl' ? styles.toggleActive : styles.toggle} onClick={() => setAprende('nl')}>
              NL Holandés
            </button>
            <button type="button" style={aprende === 'es' ? styles.toggleActive : styles.toggle} onClick={() => setAprende('es')}>
              ES Español
            </button>
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? <span className="loader" /> : 'Guardar perfil'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: '2px dashed #30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  label: {
    display: 'block',
    color: 'var(--text-secondary)',
    fontSize: 14,
    marginBottom: 8,
  },
  toggleRow: {
    display: 'flex',
    gap: 10,
  },
  toggle: {
    flex: 1,
    padding: '12px',
    background: 'var(--bg-secondary)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-secondary)',
    fontSize: 15,
    minHeight: 48,
    transition: 'all 0.2s',
  },
  toggleActive: {
    flex: 1,
    padding: '12px',
    background: '#30699b',
    border: '1.5px solid #30699b',
    borderRadius: 10,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    minHeight: 48,
    transition: 'all 0.2s',
  },
  error: {
    background: 'rgba(255,80,80,0.15)',
    color: '#ff6b6b',
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 8,
    width: '100%',
  },
}
