import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseCliente.js'

export default function PaginaAuthCallback() {
  const navegar = useNavigate()

  useEffect(() => {
    if (!supabase) {
      navegar('/login', { replace: true })
      return
    }
    void supabase.auth.getSession().then(({ data: { session } }) => {
      navegar(session ? '/' : '/login', { replace: true })
    })
  }, [navegar])

  return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--snappy-gris-texto, #333)' }}>
      Completando inicio de sesión…
    </div>
  )
}
