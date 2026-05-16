import { createClient } from '@supabase/supabase-js'

let memo

/** Cliente sin sesión persistente; solo para validar JWT con getUser. */
export function obtenerClienteSupabaseServidor() {
  if (memo !== undefined) return memo
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    memo = null
    return null
  }
  memo = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return memo
}
