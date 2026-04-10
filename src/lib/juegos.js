import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export const TIPOS_JUEGO = {
  IMITA_ACENTO: 'imita_acento',
  CASTIGO_LINGUISTICO: 'castigo_linguistico',
  PALABRA_PROHIBIDA: 'palabra_prohibida',
  RETO_BESO: 'reto_beso',
  COMPLETA_FRASE: 'completa_frase',
  LECCION_DIA: 'leccion_dia',
  TRES_PALABRAS: 'tres_palabras',
  DIBUJA_TRADUCE: 'dibuja_traduce',
  RETO_VELOCIDAD: 'reto_velocidad',
  FRASES_LIGAR: 'frases_ligar',
}

export const PUNTOS_JUEGO = {
  imita_acento: 10,
  castigo_linguistico: 15,
  palabra_prohibida: 20,
  reto_beso: 20,
  completa_frase: 15,
  leccion_dia: 10,
  leccion_dia_bonus: 5,
  tres_palabras: 15,
  dibuja_traduce: 15,
  reto_velocidad: { 1: 5, 2: 8, 3: 12, 4: 16, 5: 20 },
  frases_ligar: { bajo: 5, medio: 10, alto: 15, perfecto: 20 },
}

export function useJuego(tipo, parejaId, userId) {
  const [sesion, setSesion] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!parejaId) { setLoading(false); return }
    const { data } = await supabase
      .from('juegos_sesiones')
      .select('*')
      .eq('pareja_id', parejaId)
      .eq('tipo_juego', tipo)
      .neq('estado', 'finalizado')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setSesion(data)
    setLoading(false)
  }, [parejaId, tipo])

  useEffect(() => {
    cargar()
    if (!parejaId) return
    const channel = supabase
      .channel(`juego-${tipo}-${parejaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'juegos_sesiones',
        filter: `pareja_id=eq.${parejaId}`,
      }, (payload) => {
        if (payload.new?.tipo_juego === tipo) {
          setSesion(payload.new)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [parejaId, tipo, cargar])

  async function crear(datos, estado = 'pendiente') {
    const { data, error } = await supabase
      .from('juegos_sesiones')
      .insert({
        pareja_id: parejaId,
        tipo_juego: tipo,
        iniciador_id: userId,
        estado,
        datos,
      })
      .select()
      .single()
    if (error) throw error
    setSesion(data)
    return data
  }

  async function actualizar(id, estado, datos) {
    const { data, error } = await supabase
      .from('juegos_sesiones')
      .update({ estado, datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setSesion(data)
    return data
  }

  return { sesion, loading, crear, actualizar, recargar: cargar }
}

export async function otorgarPuntos(userId, parejaId, juegoTipo, puntos) {
  const { error } = await supabase
    .from('puntos')
    .insert({ user_id: userId, pareja_id: parejaId, tipo_juego: juegoTipo, puntos })
  if (error) console.error('Error otorgando puntos:', error)
}

export async function obtenerPuntos(userId) {
  const { data } = await supabase
    .from('puntos')
    .select('puntos')
    .eq('user_id', userId)
  return data?.reduce((sum, r) => sum + r.puntos, 0) || 0
}

export async function contarRetosPendientes(parejaId, userId) {
  if (!parejaId) return {}
  const { data } = await supabase
    .from('juegos_sesiones')
    .select('tipo_juego, iniciador_id')
    .eq('pareja_id', parejaId)
    .neq('estado', 'finalizado')
  const counts = {}
  data?.forEach(s => {
    if (s.iniciador_id !== userId) {
      counts[s.tipo_juego] = (counts[s.tipo_juego] || 0) + 1
    }
  })
  return counts
}
