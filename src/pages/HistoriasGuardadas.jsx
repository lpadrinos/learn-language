import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function formatFecha(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function soloFecha(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HistoriasGuardadas() {
  const navigate = useNavigate()
  const { session, pareja, parejaProfile, profile } = useAuth()
  const [historias, setHistorias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pareja) { setLoading(false); return }
    cargar()
  }, [pareja])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('historias_guardadas')
      .select('*')
      .eq('pareja_id', pareja.id)
      .order('created_at', { ascending: false })
    setHistorias(data || [])
    setLoading(false)
  }

  function nombreAutor(autorId) {
    if (autorId === session?.user?.id) return profile?.nombre || 'Tú'
    return parejaProfile?.nombre || 'Pareja'
  }

  // Agrupar por fecha
  const grupos = {}
  historias.forEach(h => {
    const key = soloFecha(h.created_at)
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(h)
  })
  const fechas = Object.keys(grupos)

  return (
    <div style={{ minHeight: '100%', overflow: 'auto', padding: '20px 16px', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text-secondary)', fontSize: 15, padding: 0 }}>← Volver</button>
        <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 22, flex: 1 }}>HISTORIAS GUARDADAS</h1>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <span className="loader" />
        </div>
      )}

      {!loading && historias.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>◉</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Aún no hay historias guardadas</p>
          <p style={{ color: 'var(--text-hint)', fontSize: 13, marginTop: 8 }}>Guarda historias desde el juego Tres Palabras</p>
        </div>
      )}

      {!loading && fechas.map(fecha => (
        <div key={fecha} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, padding: '0 4px' }}>
            {formatFecha(fecha + 'T12:00:00')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {grupos[fecha].map((h, i) => (
              <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
                {/* Autor */}
                <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 8 }}>
                  por <strong style={{ color: 'var(--text-secondary)' }}>{nombreAutor(h.autor_id)}</strong>
                </p>
                {/* Palabras badge */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(h.palabras || []).map((p, j) => (
                    <span key={j} style={{ background: 'rgba(48,105,155,0.2)', color: '#30699b', padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      {p}
                    </span>
                  ))}
                </div>
                {/* Historia */}
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: 12, fontStyle: 'italic' }}>
                  {h.historia}
                </p>
                {/* Audio */}
                {h.audio_url && (
                  <audio src={h.audio_url} controls style={{ width: '100%', marginBottom: 12 }} />
                )}
                {/* Resultado */}
                <p style={{ fontSize: 13, fontWeight: 600, color: h.puntuacion ? '#4caf50' : '#ff8c42' }}>
                  {h.puntuacion ? 'Le encantó ♥' : 'Puede más'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
