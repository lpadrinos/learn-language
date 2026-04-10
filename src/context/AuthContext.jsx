import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [pareja, setPareja] = useState(null)
  const [parejaProfile, setParejaProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else {
        setProfile(null)
        setPareja(null)
        setParejaProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        setProfile(null)
        setLoading(false)
        return
      }
      if (error) throw error

      setProfile(data)
      await loadPareja(userId)
    } catch (err) {
      console.error('Error cargando perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPareja(userId) {
    try {
      const { data, error } = await supabase
        .from('parejas')
        .select('*')
        .eq('activa', true)
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .single()

      if (error && error.code === 'PGRST116') {
        setPareja(null)
        setParejaProfile(null)
        return
      }
      if (error) throw error

      setPareja(data)

      const parejaUserId = data.user_id_1 === userId ? data.user_id_2 : data.user_id_1
      const { data: pProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', parejaUserId)
        .single()

      setParejaProfile(pProfile)
    } catch (err) {
      console.error('Error cargando pareja:', err)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setPareja(null)
    setParejaProfile(null)
  }

  async function refreshProfile() {
    if (session) {
      setLoading(true)
      await loadProfile(session.user.id)
    }
  }

  const value = {
    session,
    profile,
    pareja,
    parejaProfile,
    loading,
    signOut,
    refreshProfile,
    setProfile,
    setPareja,
    setParejaProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
