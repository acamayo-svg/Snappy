# Snappy

Plataforma de entregas a domicilio: comida, farmacia, supermercado y más. Tres roles: **cliente**, **establecimiento** y **domiciliario**.

## Requisitos

- **Frontend y backend:** Node.js 18+, npm
- **Base de datos:** PostgreSQL

## Cómo ejecutar el proyecto

### 1. Base de datos PostgreSQL

Crea la base de datos en pgAdmin (o `psql`):

```sql
CREATE DATABASE snappy;
```

### 2. Backend (Node.js)

En la carpeta **servidor**:

```bash
cd servidor
copy .env.example .env
```

Edita **.env** y pon la contraseña de PostgreSQL en `DB_PASSWORD`. Luego:

```bash
npm install
npm run iniciar
```

El API quedará en **http://localhost:3000**. Ver `servidor/LEEME.md` para más detalle.

### 3. Frontend (React)

En la raíz del proyecto:

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). La app llama al backend en `http://localhost:3000` por defecto (configurable con `VITE_API_URL` en un archivo `.env`).

### Primer uso

No hay usuarios por defecto. Entra en **Regístrate** en la app, crea una cuenta (elige rol: cliente, establecimiento o domiciliario) y luego inicia sesión.

## Estructura del proyecto

- **src/** — Frontend React (componentes, páginas, estilos, lógica, contextos, servicios).
- **servidor/** — Backend Node.js (Express) con PostgreSQL. Ver `servidor/LEEME.md` para detalles.

Variables, archivos y carpetas en **español**. Patrones de diseño (factory, singleton, strategy) integrados donde aplica (p. ej. Factory para usuarios por rol).

## Rutas (frontend)

| Ruta | Página |
|------|--------|
| `/` | Inicio (carruseles) |
| `/login` | Iniciar sesión |
| `/registro` | Crear cuenta |
| `/cliente` | Área cliente (protegida) |
| `/establecimiento` | Área establecimiento (protegida) |
| `/domiciliario` | Área domiciliario (protegida) |

## Tecnologías

- **Frontend:** React 18, React Router 6, Vite 5, CSS Modules
- **Backend:** Node.js, Express, PostgreSQL (pg), bcryptjs, JWT
