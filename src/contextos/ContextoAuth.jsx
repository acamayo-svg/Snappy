import { createContext, useContext, useState, useCallback } from 'react'
import { crearUsuario } from '../logica/usuarios/UsuarioFactory'
import {
  iniciarSesionApi,
  registroApi,
  cerrarSesionApi,
  obtenerMiCuentaApi,
  registrarNegocioApi,
  serDomiciliarioApi,
} from '../servicios/servicioAuth'

const ContextoAuth = createContext(null)

export function ProveedorAuth({ children }) {
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

  const actualizarUsuario = useCallback((datosUsuario) => {
    const instancia = crearUsuario(datosUsuario)
    setUsuario(instancia)
    sessionStorage.setItem('snappy_usuario', JSON.stringify(datosUsuario))
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
      actualizarUsuario({
        ...data.usuario,
        establecimiento: data.establecimiento ?? null,
        domiciliario: data.domiciliario ?? null,
      })
    } catch {
      // Si falla (ej. token expirado), no forzamos cerrar sesión aquí
    }
  }, [actualizarUsuario])

  const registrarNegocio = useCallback(async (datos) => {
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
  }, [actualizarUsuario, refrescarCuenta])

  const serDomiciliario = useCallback(async () => {
    setError(null)
    setCargando(true)
    try {
      const { usuario: datosUsuario } = await serDomiciliarioApi()
      actualizarUsuario(datosUsuario)
      return datosUsuario
    } catch (e) {
      const mensaje = e?.message ?? 'Error al registrarte como domiciliario'
      setError(mensaje)
      throw e
    } finally {
      setCargando(false)
    }
  }, [actualizarUsuario])

  const cerrarSesion = useCallback(async () => {
    setCargando(true)
    try {
      await cerrarSesionApi()
    } finally {
      sessionStorage.removeItem('snappy_token')
      sessionStorage.removeItem('snappy_usuario')
      setUsuario(null)
      setError(null)
      setCargando(false)
    }
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
