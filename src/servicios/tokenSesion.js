import { supabase } from '../lib/supabaseCliente.js'

/** Prioriza sesión Supabase; si no hay, JWT local legado en sessionStorage. */
export async function obtenerBearer() {
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
  }
  return sessionStorage.getItem('snappy_token')
}
