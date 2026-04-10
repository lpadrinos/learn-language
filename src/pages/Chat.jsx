import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MensajeChat from '../components/MensajeChat'

const AUDIO_MIME = 'audio/webm'

export default function Chat() {
  const { session, pareja, parejaProfile } = useAuth()
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const [tiempoRestante, setTiempoRestante] = useState('')

  // Audio recording
  const [grabando, setGrabando] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [segundos, setSegundos] = useState(0)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timer = useRef(null)

  useEffect(() => { return () => { clearInterval(timer.current) } }, [])

  useEffect(() => {
    if (!pareja) return
    loadMensajes()
    const channel = supabase
      .channel(`chat-${pareja.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes_chat',
        filter: `pareja_id=eq.${pareja.id}`,
      }, (payload) => {
        setMensajes(prev => [...prev, payload.new])
        setTimeout(scrollToBottom, 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pareja])

  useEffect(() => {
    if (!mensajes.length) return
    const interval = setInterval(updateTiempo, 60000)
    updateTiempo()
    return () => clearInterval(interval)
  }, [mensajes])

  function updateTiempo() {
    if (!mensajes.length) return
    const oldest = new Date(mensajes[0].created_at)
    const expires = new Date(oldest.getTime() + 24 * 60 * 60 * 1000)
    const diff = expires - new Date()
    if (diff <= 0) {
      setTiempoRestante('Expirando...')
      return
    }
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    setTiempoRestante(`Se borra en ${h}h ${m}m`)
  }

  async function startGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunks.current = []
      recorder.ondataavailable = e => chunks.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: AUDIO_MIME })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current = recorder
      recorder.start()
      setGrabando(true)
      setSegundos(0)
      timer.current = setInterval(() => {
        setSegundos(s => {
          if (s >= 59) { stopGrabacion(); return 60 }
          return s + 1
        })
      }, 1000)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  function stopGrabacion() {
    clearInterval(timer.current)
    setGrabando(false)
    mediaRecorder.current?.stop()
  }

  async function handleSendAudio(e) {
    e?.preventDefault()
    if (!audioBlob) return
    setSending(true)

    try {
      const path = `chat/${pareja.id}/${Date.now()}.webm`
      const { error: upErr } = await supabase.storage.from('audios').upload(path, audioBlob, { upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('audios').getPublicUrl(path)

      const { error } = await supabase.from('mensajes_chat').insert({
        pareja_id: pareja.id,
        user_id: session.user.id,
        audio_url: urlData.publicUrl,
      })

      if (!error) {
        setAudioBlob(null)
        setAudioUrl(null)
      }
    } catch (e) {
      alert(`Error al subir audio: ${e.message}`)
    }
    setSending(false)
  }

  async function loadMensajes() {
    setLoading(true)
    // Delete messages older than 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('mensajes_chat')
      .delete()
      .eq('pareja_id', pareja.id)
      .lt('created_at', cutoff)

    const { data } = await supabase
      .from('mensajes_chat')
      .select('*')
      .eq('pareja_id', pareja.id)
      .order('created_at', { ascending: true })

    setMensajes(data || [])
    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }

  function scrollToBottom() {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!texto.trim() || sending) return
    setSending(true)

    const { error } = await supabase.from('mensajes_chat').insert({
      pareja_id: pareja.id,
      user_id: session.user.id,
      texto: texto.trim(),
    })

    if (!error) setTexto('')
    setSending(false)
  }

  if (!pareja) {
    return (
      <div className="page-with-tabs" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: 24, paddingRight: 24, paddingBottom: 24, gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>◆</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Sin pareja aún</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Ve a tu perfil y vincula una pareja para empezar a chatear
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.location.href = '/perfil'} style={{ maxWidth: 200 }}>
          Ir a Perfil
        </button>
      </div>
    )
  }

  return (
    <div className="page-with-tabs" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.avatar(parejaProfile?.foto_url)}>
          {!parejaProfile?.foto_url && (parejaProfile?.nombre?.[0] || '?')}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{parejaProfile?.nombre || 'Pareja'}</div>
          {tiempoRestante && <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>{tiempoRestante}</div>}
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} style={styles.messageList}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="loader" /></div>
        ) : mensajes.length === 0 ? (
          <p style={{ color: 'var(--text-hint)', textAlign: 'center', padding: 40, fontSize: 14 }}>
            ¡Envía el primer mensaje!
          </p>
        ) : (
          mensajes.map(m => (
            <MensajeChat key={m.id} mensaje={m} esMio={m.user_id === session.user.id} />
          ))
        )}
      </div>

      {/* Audio Preview */}
      {audioUrl && (
        <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <audio src={audioUrl} controls style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }} style={{ flex: 1, padding: '8px 12px', background: 'var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
              Descartar
            </button>
            <button onClick={handleSendAudio} disabled={sending} style={{ flex: 1, padding: '8px 12px', background: '#30699b', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {sending ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} style={styles.inputBar}>
        <input
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          disabled={grabando}
        />
        <button
          type="button"
          onClick={grabando ? stopGrabacion : startGrabacion}
          style={{
            ...styles.audioBtn,
            background: grabando ? '#ff6b6b' : 'transparent',
            color: grabando ? '#fff' : '#30699b',
          }}
          title={grabando ? 'Parar' : 'Grabar'}
        >
          {grabando ? '■' : '◉'}
        </button>
        <button type="submit" disabled={sending || !texto.trim()} style={styles.sendBtn}>
          {sending ? <span className="loader" style={{ width: 16, height: 16 }} /> : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>

      {/* Recording timer */}
      {grabando && (
        <div style={{ padding: '8px 16px', background: '#ff6b6b', color: '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center', flexShrink: 0 }}>
          Grabando: {segundos}s / 60s
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  avatar: (url) => ({
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
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    fontSize: 15,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#30699b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  audioBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
    transition: 'all 0.2s',
  },
}
