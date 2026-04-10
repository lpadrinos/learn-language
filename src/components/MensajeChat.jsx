export default function MensajeChat({ mensaje, esMio }) {
  const hora = new Date(mensaje.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: esMio ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: esMio ? '#30699b' : '#142e47',
        border: esMio ? 'none' : '1px solid #1e4060',
      }}>
        {mensaje.texto && <p style={{ fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word' }}>{mensaje.texto}</p>}
        {mensaje.audio_url && (
          <audio
            src={mensaje.audio_url}
            controls
            style={{ width: '100%', marginTop: mensaje.texto ? 8 : 0 }}
          />
        )}
        <span style={{ fontSize: 11, color: esMio ? 'rgba(255,255,255,0.6)' : 'var(--text-hint)', display: 'block', marginTop: 4, textAlign: 'right' }}>
          {hora}
        </span>
      </div>
    </div>
  )
}
