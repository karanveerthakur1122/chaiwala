import { create } from 'zustand'
import { supabase, withSupabaseTimeout } from '../lib/supabase'

/** Prevents duplicate onAuthStateChange subscriptions (e.g. React Strict Mode). */
let authSubscriptionRegistered = false

/** Deduplicates Strict Mode double-invoke of initialize(). */
let authInitPromise = null

const SESSION_TIMEOUT_MS = 10000

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,

  initialize: () => {
    if (authInitPromise) return authInitPromise

    authInitPromise = (async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await withSupabaseTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS)
        if (sessionError) throw sessionError
        const user = session?.user ?? null
        set({ user })

        if (user) {
          set({ profileLoading: true })
          get()
            .fetchProfile(user.id)
            .finally(() => set({ profileLoading: false }))
        } else {
          set({ profile: null })
        }
      } catch (err) {
        console.error('Auth initialization failed:', err)
        set({ user: null, profile: null })
      } finally {
        set({ loading: false })
      }

      if (authSubscriptionRegistered) return
      authSubscriptionRegistered = true

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') return

        if (event === 'TOKEN_REFRESHED') {
          const user = session?.user ?? null
          set({ user })
          if (user) {
            set({ profileLoading: true })
            try {
              await get().fetchProfile(user.id)
            } catch {
              /* fetchProfile already logs */
            } finally {
              set({ profileLoading: false })
            }
          }
          return
        }

        if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, profileLoading: false })
          return
        }

        const user = session?.user ?? null
        set({ user })

        if (user) {
          set({ profileLoading: true })
          try {
            await get().fetchProfile(user.id)
          } catch {
            /* fetchProfile already logs; avoid unhandled rejection */
          } finally {
            set({ profileLoading: false })
          }
        } else {
          set({ profile: null, profileLoading: false })
        }
      })
    })()

    return authInitPromise
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await withSupabaseTimeout(
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        45000
      )
      if (error && error.code === 'PGRST116') {
        const user = get().user
        const name = user?.user_metadata?.name || ''
        const { data: created, error: createErr } = await withSupabaseTimeout(
          supabase
            .from('profiles')
            .insert({
              user_id: userId,
              name,
              role: 'customer',
            })
            .select()
            .single(),
          15000
        )
        if (createErr) throw createErr
        set({ profile: created })
        return
      }
      if (error) throw error
      set({ profile: data })
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      const prev = get().profile
      if (prev && prev.user_id === userId) {
        return
      }
      set({ profile: null })
    }
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signOut: async () => {
    try {
      await withSupabaseTimeout(supabase.auth.signOut(), 15000)
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      set({ user: null, profile: null, profileLoading: false })
    }
  },
}))
