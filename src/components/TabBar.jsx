import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/inicio', label: 'Inicio', icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { path: '/chat', label: 'Chat', icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { path: '/progreso', label: 'Progreso', icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { path: '/perfil', label: 'Perfil', icon: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={styles.bar}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        const color = active ? '#30699b' : '#3a6080'
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} style={styles.tab}>
            {tab.icon(color)}
            <span style={{ fontSize: 11, color, fontWeight: active ? 600 : 400, marginTop: 2 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  bar: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 430,
    minHeight: 70,
    background: '#142e47',
    borderTop: '1px solid #1e4060',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 100,
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    paddingTop: 8,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    minWidth: 60,
    minHeight: 44,
    padding: '6px 0',
  },
}
