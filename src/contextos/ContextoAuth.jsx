import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { crearUsuario } from '../logica/usuarios/UsuarioFactory'
import {
  iniciarSesionApi,
  registroApi,
  cerrarSesionApi,
  obtenerMiCuentaApi,
  registrarNegocioApi,
  serDomiciliarioApi,
} from '../servicios/servicioAuth'
import { supabase } from '../lib/supabaseCliente.js'

const ContextoAuth = createContext(null)

/** Quita #access_token=… de la URL tras procesar la sesión (OAuth / magic link). */
function useLimpiezaHashSesion() {
  useEffect(() => {
    if (!supabase) return undefined
    void supabase.auth.getSession().finally(() => {
      queueMicrotask(() => {
        const h = window.location.hash
        if (
          h &&
          (h.includes('access_token') || h.includes('refresh_token') || h.includes('error='))
        ) {
          window.history.replaceState(
            null,
            document.title,
            `${window.location.pathname}${window.location.search}`
          )
        }
      })
    })
  }, [])
}

export function ProveedorAuth({ children }) {
  useLimpiezaHashSesion()
  const [usuario, setUsuario] = useState(() => {
    const guardado = sessionStorage.getItem('snappy_usuario')
    if (!guardado) return null
    try {
      const datos = JSON.parse(guardado)
      return crearUsuario(datos)
    } catch {
      return null
    }
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const actualizarUsuario = useCallback((datosUsuario) => {
    const instancia = crearUsuario(datosUsuario)
    setUsuario(instancia)
    sessionStorage.setItem('snappy_usuario', JSON.stringify(datosUsuario))
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('snappy_token')
        sessionStorage.removeItem('snappy_usuario')
        setUsuario(null)
        return
      }
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        sessionStorage.removeItem('snappy_token')
        /** No usar await dentro del listener: bloquea el canal interno de Auth y congela verifyOtp/signOut. */
        queueMicrotask(() => {
          void (async () => {
            try {
              const data = await obtenerMiCuentaApi()
              const merged = {
                ...data.usuario,
                establecimiento: data.establecimiento ?? null,
                domiciliario: data.domiciliario ?? null,
                envio: data.envio ?? { direccion: '', telefono: '', nota: '' },
              }
              actualizarUsuario(merged)
              setError(null)
            } catch {
              setError(
                'No se pudo cargar tu cuenta en el servidor. Comprueba VITE_API_URL y que Render tenga SUPABASE_URL y SUPABASE_ANON_KEY.'
              )
            }
          })()
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [actualizarUsuario])

  const iniciarSesion = useCallback(async (credenciales) => {
    setError(null)
    setCargando(true)
    try {
      const { token, usuario: datosUsuario } = await iniciarSesionApi(credenciales)
      const instanciaUsuario = crearUsuario(datosUsuario)
      sessionStorage.setItem('snappy_token', token)
      sessionStorage.setItem('snappy_usuario', JSON.stringify(datosUsuario))
      setUsuario(instanciaUsuario)
      return instanciaUsuario
    } catch (e) {
      const mensaje = e?.message ?? 'Error al iniciar sesión'
      setError(mensaje)
      throw e
    } finally {
      setCargando(false)
    }
  }, [])

  const registrar = useCallback(async (datos) => {
    setError(null)
    setCargando(true)
    try {
      const { token, usuario: datosUsuario } = await registroApi(datos)
      const instanciaUsuario = crearUsuario(datosUsuario)
      sessionStorage.setItem('snappy_token', token)
      sessionStorage.setItem('snappy_usuario', JSON.stringify(datosUsuario))
      setUsuario(instanciaUsuario)
      return instanciaUsuario
    } catch (e) {
      const mensaje = e?.message ?? 'Error al registrarse'
      setError(mensaje)
      throw e
    } finally {
      setCargando(false)
    }
  }, [])

  const cambiarRolActivo = useCallback((rol) => {
    setUsuario((prev) => {
      if (!prev || !prev.roles.includes(rol)) return prev
      return crearUsuario({
        id: prev.id,
        email: prev.email,
        nombre: prev.nombre,
        roles: prev.roles,
        rolActivo: rol,
      })
    })
  }, [])

  const refrescarCuenta = useCallback(async () => {
    try {
      const data = await obtenerMiCuentaApi()
      const merged = {
        ...data.usuario,
        establecimiento: data.establecimiento ?? null,
        domiciliario: data.domiciliario ?? null,
        envio: data.envio ?? { direccion: '', telefono: '', nota: '' },
      }
      actualizarUsuario(merged)
      return crearUsuario(merged)
    } catch {
      return null
    }
  }, [actualizarUsuario])

  const registrarNegocio = useCallback(
    async (datos) => {
      setError(null)
      setCargando(true)
      try {
        const { usuario: datosUsuario } = await registrarNegocioApi(datos)
        actualizarUsuario(datosUsuario)
        await refrescarCuenta()
        return datosUsuario
      } catch (e) {
        const mensaje = e?.message ?? 'Error al registrar el negocio'
        setError(mensaje)
        throw e
      } finally {
        setCargando(false)
      }
    },
    [actualizarUsuario, refrescarCuenta]
  )

  const serDomiciliario = useCallback(async () => {
    setError(null)
    setCargando(true)
    try {
      const { usuario: datosUsuario } = await serDomiciliarioApi()
      actualizarUsuario(datosUsuario)
      await refrescarCuenta()
      return datosUsuario
    } catch (e) {
      const mensaje = e?.message ?? 'Error al registrarte como domiciliario'
      setError(mensaje)
      throw e
    } finally {
      setCargando(false)
    }
  }, [actualizarUsuario, refrescarCuenta])

  const cerrarSesion = useCallback(() => {
    sessionStorage.removeItem('snappy_token')
    sessionStorage.removeItem('snappy_usuario')
    setUsuario(null)
    setError(null)
    void cerrarSesionApi()
    /** Evitar await: signOut puede quedar bloqueado si el listener de Auth estaba en deadlock. */
    if (supabase) void supabase.auth.signOut().catch(() => {})
  }, [])

  const valor = {
    usuario,
    cargando,
    error,
    iniciarSesion,
    registrar,
    registrarNegocio,
    serDomiciliario,
    refrescarCuenta,
    actualizarUsuario,
    cambiarRolActivo,
    cerrarSesion,
    estaAutenticado: !!usuario,
  }

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}

export function useAuth() {
  const ctx = useContext(ContextoAuth)
  if (!ctx) throw new Error('useAuth debe usarse dentro de ProveedorAuth')
  return ctx
}
