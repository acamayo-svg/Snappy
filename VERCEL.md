# Despliegue en Vercel (Snappy)

En Vercel se configuran **dos proyectos**: uno para el **frontend** (React/Vite) y otro para la **API** (Express). Así tienes una URL pública para el front y otra para la API (y para el webhook de Mercado Pago).

---

## 1. Proyecto 1: Frontend (React + Vite)

1. Entra en [vercel.com](https://vercel.com) e inicia sesión.
2. **Add New… → Project** y conecta el repositorio de Snappy (o sube la carpeta).
3. **Configuración:**
   - **Root Directory:** deja el raíz del repo (donde está `package.json` del front y la carpeta `src`).
   - **Framework Preset:** Vite (Vercel lo suele detectar).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Variables de entorno:**
   - `VITE_API_URL` = `https://tu-api.vercel.app`  
     (sustituye por la URL que te dé Vercel para el **proyecto 2** cuando lo crees).
5. **Deploy.**  
   Tu front quedará en una URL tipo: `https://snappy-xxx.vercel.app`.

---

## 2. Proyecto 2: API (Express, carpeta `servidor`)

1. **Add New… → Project** y vuelve a conectar **el mismo** repositorio.
2. **Configuración:**
   - **Root Directory:** `servidor`  
     (importante: así Vercel usa solo la carpeta del backend).
   - **Build Command:** puede quedar vacío o `npm install`.
   - **Output Directory:** vacío.
   - **Install Command:** `npm install`
3. **Variables de entorno** (en el proyecto de la API en Vercel):
   - `DB_HOST` – host de tu PostgreSQL (ej. de Neon, Supabase o Railway).
   - `DB_PORT` – normalmente `5432`.
   - `DB_NAME` – nombre de la base de datos.
   - `DB_USER` – usuario de la base.
   - `DB_PASSWORD` – contraseña.
   - `JWT_CLAVE` – la misma que usas en local.
   - `MP_ACCESS_TOKEN` – tu Access Token de Mercado Pago (prueba o producción).
   - `FRONTEND_URL` – URL del front en Vercel, ej. `https://snappy-xxx.vercel.app` (sin barra final)  
     (para CORS y `back_urls` de Mercado Pago).
   - **Cloudinary** (recomendado para que las imágenes de productos se vean siempre en producción):
     - `CLOUDINARY_CLOUD_NAME` – nombre de tu nube (panel de [Cloudinary](https://cloudinary.com)).
     - `CLOUDINARY_API_KEY` – API Key.
     - `CLOUDINARY_API_SECRET` – API Secret.  
     Si estas tres variables están definidas, las imágenes de productos se suben a Cloudinary y la URL que se guarda es la de Cloudinary (persistente). Si no, se usa disco local/`/tmp` (en Vercel las imágenes pueden no verse entre peticiones).
4. **Deploy.**  
   La API quedará en una URL tipo: `https://snappy-servidor-xxx.vercel.app`.

---

## 3. Ajustar la URL del frontend

En el **Proyecto 1 (frontend)** edita la variable de entorno:

- `VITE_API_URL` = `https://snappy-servidor-xxx.vercel.app`  
  (la URL real del Proyecto 2).

Vuelve a desplegar el frontend para que el build use la nueva variable.

---

## 4. Webhook de Mercado Pago

En el panel de Mercado Pago → **Webhooks**, configura la URL de notificaciones con la URL pública de tu API:

- `https://snappy-servidor-xxx.vercel.app/api/pagos/webhook`

(Usa la misma URL base que pusiste en `VITE_API_URL`.)

---

## 5. Base de datos

Vercel **no** ofrece PostgreSQL. Necesitas una base accesible por internet, por ejemplo:

- [Neon](https://neon.tech) (PostgreSQL en la nube, plan gratis).
- [Supabase](https://supabase.com) (PostgreSQL).
- [Railway](https://railway.app) (PostgreSQL u otros).

Creas el proyecto y la base, copias la cadena de conexión o host/puerto/nombre/usuario/contraseña y los configuras en las variables de entorno del **Proyecto 2 (API)** como en el paso 2.

---

## Resumen

| Qué              | Dónde                         | URL ejemplo                          |
|------------------|-------------------------------|--------------------------------------|
| Frontend         | Proyecto 1, raíz del repo      | `https://snappy-xxx.vercel.app`      |
| API + webhook    | Proyecto 2, Root = `servidor`  | `https://snappy-servidor-xxx.vercel.app` |
| Webhook MP       | En panel MP                   | `https://snappy-servidor-xxx.vercel.app/api/pagos/webhook` |

Con esto ya tienes la configuración para usar Vercel con una URL pública para el front y otra para la API (y para el webhook).

---

## Si la API devuelve 500 (FUNCTION_INVOCATION_FAILED)

1. **Probar ruta de diagnóstico**  
   Abre en el navegador: `https://tu-api.vercel.app/api/health`  
   - Si responde `{"ok":true,"mensaje":"API Snappy"}`: la función arranca bien; el fallo suele ser la base de datos (credenciales, SSL o red).  
   - Si también da 500: el error suele estar al cargar el código (imports, dependencias). Revisa los logs en Vercel.

2. **Revisar logs en Vercel**  
   En el proyecto de la API: **Deployments** → último despliegue → **Logs** o **Runtime Logs**. Ahí verás el mensaje o stack trace del error (conexión a PostgreSQL, timeout, variable de entorno faltante, etc.).

3. **Base de datos en la nube (Supabase, Neon, etc.)**  
   - La API ya usa **SSL** para la conexión cuando no es localhost (necesario para Supabase desde Vercel).  
   - Comprueba que en Vercel tengas bien definidas `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (mismas que en el panel de tu proveedor, por ejemplo Session Pooler en Supabase).
