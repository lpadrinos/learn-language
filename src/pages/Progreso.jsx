import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { obtenerPuntos } from '../lib/juegos'
import { supabase } from '../lib/supabase'
import { LOGROS, verificarLogros } from '../lib/logros'

const NOMBRES_JUEGO = {
  imita_acento: 'Imita el Acento',
  castigo_linguistico: 'Castigo Lingüístico',
  palabra_prohibida: 'Palabra Prohibida',
  reto_beso: 'Reto Beso',
  completa_frase: 'Completa la Frase',
  leccion_dia: 'Lección del Día',
  tres_palabras: 'Tres Palabras',
  dibuja_traduce: 'Dibuja y Traduce',
  reto_velocidad: 'Reto de Velocidad',
  frases_ligar: 'Frases para Ligar',
}

export default function Progreso() {
  const { profile, parejaProfile, session, pareja } = useAuth()
  const userId = session?.user?.id
  const [misPuntos, setMisPuntos] = useState(0)
  const [puntosPar, setPuntosPar] = useState(0)
  const [puntosPorJuego, setPuntosPorJuego] = useState([])
  const [logrosDesbloqueados, setLogrosDesbloqueados] = useState([])
  const [nuevosLogros, setNuevosLogros] = useState([])
  const [showToastLogro, setShowToastLogro] = useState(null)

  useEffect(() => {
    if (!session) return
    obtenerPuntos(userId).then(p => {
      setMisPuntos(p)
      verificarYActualizarLogros(p)
    })
    if (parejaProfile) {
      obtenerPuntos(parejaProfile.id).then(setPuntosPar)
    }
    cargarPuntosPorJuego()
  }, [session, parejaProfile])

  useEffect(() => {
    if (!session?.user?.id || !parejaProfile?.id) return

    const channelMisPuntos = supabase
      .channel(`puntos:usuario_id=eq.${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puntos', filter: `usuario_id=eq.${userId}` }, () => {
        obtenerPuntos(userId).then(p => {
          setMisPuntos(p)
          verificarYActualizarLogros(p)
        })
        cargarPuntosPorJuego()
      })
      .subscribe()

    const channelPuntosPar = supabase
      .channel(`puntos:usuario_id=eq.${parejaProfile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'puntos', filter: `usuario_id=eq.${parejaProfile.id}` }, () => {
        obtenerPuntos(parejaProfile.id).then(setPuntosPar)
      })
      .subscribe()

    return () => {
      channelMisPuntos.unsubscribe()
      channelPuntosPar.unsubscribe()
    }
  }, [session?.user?.id, parejaProfile?.id])

  async function cargarPuntosPorJuego() {
    if (!userId) return
    const { data } = await supabase
      .from('puntos')
      .select('tipo_juego, puntos')
      .eq('user_id', userId)

    if (!data) return
    const agrupado = {}
    data.forEach(r => {
      agrupado[r.tipo_juego] = (agrupado[r.tipo_juego] || 0) + r.puntos
    })
    const lista = Object.entries(agrupado)
      .map(([tipo_juego, total]) => ({ tipo_juego, total }))
      .sort((a, b) => b.total - a.total)
    setPuntosPorJuego(lista)
  }

  function verificarYActualizarLogros(puntosTotales) {
    const key = `logros_${userId}`
    let logrosActuales = []
    try { logrosActuales = JSON.parse(localStorage.getItem(key) || '[]') } catch {}
    setLogrosDesbloqueados(logrosActuales)

    const nuevos = verificarLogros(puntosTotales, logrosActuales)
    if (nuevos.length > 0) {
      const actualizados = [...logrosActuales, ...nuevos.map(l => l.id)]
      localStorage.setItem(key, JSON.stringify(actualizados))
      setLogrosDesbloqueados(actualizados)
      setNuevosLogros(nuevos)
      // Mostrar toast del primer logro nuevo
      setShowToastLogro(nuevos[0])
      setTimeout(() => setShowToastLogro(null), 4000)
    }
  }

  function getLogrosActuales() {
    try { return JSON.parse(localStorage.getItem(`logros_${userId}`) || '[]') } catch { return [] }
  }

  const logrosActuales = getLogrosActuales()
  const total = misPuntos + puntosPar || 1
  const miPct = Math.round((misPuntos / total) * 100)

  return (
    <div className="page-with-tabs" style={{ overflow: 'auto', paddingLeft: 16, paddingRight: 16, paddingBottom: 24 }}>
      <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 24, marginBottom: 20 }}>Tu progreso</h1>

      {/* Toast logro nuevo */}
      {showToastLogro && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#30699b', borderRadius: 14, padding: '14px 20px', zIndex: 999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxWidth: 320, width: '90%', textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>¡Nuevo logro!</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>▲ {showToastLogro.titulo}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{showToastLogro.desc}</p>
        </div>
      )}

      {/* Racha */}
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 40, fontFamily: 'var(--font-title)', fontWeight: 700, color: '#fff' }}>0</span>
          <span style={{ fontSize: 32 }}>▲</span>
        </div>
        <p style={{ color: '#30699b', fontSize: 14, fontWeight: 600, marginTop: 4 }}>¡Sigue así!</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Días de racha</p>
      </div>

      {/* Versus */}
      <div style={{ ...styles.card, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={styles.vsPlayer}>
            <div style={styles.vsAvatar(profile?.foto_url)}>
              {!profile?.foto_url && (profile?.nombre?.[0] || '?')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{profile?.nombre || 'Tú'}</span>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-title)' }}>{misPuntos}</span>
          </div>
          <span style={{ color: 'var(--text-hint)', fontWeight: 700, fontSize: 16 }}>VS</span>
          <div style={styles.vsPlayer}>
            <div style={styles.vsAvatar(parejaProfile?.foto_url)}>
              {!parejaProfile?.foto_url && (parejaProfile?.nombre?.[0] || '?')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{parejaProfile?.nombre || 'Pareja'}</span>
            <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-title)' }}>{puntosPar}</span>
          </div>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${miPct}%` }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.grid}>
        {[
          { label: 'Puntos totales', value: misPuntos },
          { label: 'Juegos jugados', value: '0' },
          { label: 'Mejor racha', value: '0' },
          { label: 'Días activos', value: '0' },
        ].map((stat, i) => (
          <div key={i} style={styles.statCard}>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-title)' }}>{stat.value}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Puntos por juego */}
      {puntosPorJuego.length > 0 && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Por juego</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {puntosPorJuego.map((j, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {NOMBRES_JUEGO[j.tipo_juego] || j.tipo_juego}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#30699b', fontFamily: 'var(--font-title)' }}>
                  +{j.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logros */}
      <div style={{ ...styles.card, marginTop: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Mis logros</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LOGROS.map(logro => {
            const ganado = logrosActuales.includes(logro.id)
            return (
              <div key={logro.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: ganado ? 1 : 0.4 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: ganado ? '#30699b' : 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, color: ganado ? '#fff' : 'var(--text-hint)' }}>▲</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ganado ? 'var(--text-primary)' : 'var(--text-hint)' }}>{logro.titulo}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 1 }}>{logro.desc}</p>
                </div>
                {ganado && <span style={{ color: '#4caf50', fontSize: 16 }}>✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '18px',
  },
  vsPlayer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  vsAvatar: (url) => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: url ? `url(${url}) center/cover` : '#30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
  }),
  progressBar: {
    height: 6,
    borderRadius: 3,
    background: 'var(--border)',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#30699b',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginTop: 12,
  },
  statCard: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
}
