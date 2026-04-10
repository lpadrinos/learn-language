import { useAuth } from '../context/AuthContext'
import CarruselJuegos from '../components/CarruselJuegos'

export default function Inicio() {
  const { profile, parejaProfile } = useAuth()

  const fotoSize = 36

  return (
    <div className="page-with-tabs" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerSide}>
          <div style={styles.avatar(profile?.foto_url)}>
            {!profile?.foto_url && (profile?.nombre?.[0] || '?')}
          </div>
          <span style={styles.headerName}>{profile?.nombre || 'Tú'}</span>
        </div>
        <div style={styles.separator} />
        <div style={{ ...styles.headerSide, justifyContent: 'flex-end' }}>
          <span style={styles.headerName}>{parejaProfile?.nombre || '?'}</span>
          <div style={styles.avatar(parejaProfile?.foto_url)}>
            {!parejaProfile?.foto_url && (parejaProfile?.nombre?.[0] || '?')}
          </div>
        </div>
      </div>

      {/* Carrusel */}
      <CarruselJuegos />
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    gap: 12,
    flexShrink: 0,
  },
  headerSide: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: (url) => ({
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: url ? `url(${url}) center/cover` : '#30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  }),
  headerName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  separator: {
    width: 1,
    height: 30,
    background: 'var(--border)',
    flexShrink: 0,
  },
}
