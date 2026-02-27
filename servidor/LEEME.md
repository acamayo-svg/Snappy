# Servidor Snappy (Node.js + PostgreSQL)

El backend está en **JavaScript (Node.js)** con **Express** y la base de datos **PostgreSQL**. Usas el mismo lenguaje que en el frontend y no necesitas Java ni Maven.

## Qué necesitas

1. **Node.js 18+** (el mismo que usas para el frontend).
2. **PostgreSQL** (ya lo tienes, puerto 5433).

---

## Cómo se conecta todo

```
Tu computadora
│
├── PostgreSQL (puerto 5433)
│   └── Base de datos "snappy"
│       └── Tablas: usuarios, tipos_establecimiento, establecimientos, productos, domiciliarios
│
├── Servidor Node (puerto 3000)
│   └── Lee el archivo .env (contraseña de la BD, etc.)
│   └── Al arrancar, se conecta a PostgreSQL y crea la tabla si no existe
│
└── React (puerto 5173)
    └── Llama a http://localhost:3000/api/auth/login y /registro
```

---

## Pasos para ejecutar

### 1. Crear la base de datos

En pgAdmin (o `psql`), ejecuta una vez:

```sql
CREATE DATABASE snappy;
```

### 2. Configurar la contraseña de PostgreSQL

En la carpeta **servidor**, copia el archivo de ejemplo y edita la contraseña:

```bash
cd servidor
copy .env.example .env
```

Abre **.env** y cambia `DB_PASSWORD=tu_contraseña_de_postgresql` por la contraseña real de tu servidor PostgreSQL. El puerto ya está en 5433.

### 3. Instalar dependencias y arrancar

En la carpeta **servidor**:

```bash
npm install
npm run iniciar
```

Cuando veas `Servidor Snappy en http://localhost:3000` y `Tabla usuarios lista.`, el backend está listo.

### 4. Usar la app

En otra terminal, en la **raíz** del proyecto (frontend):

```bash
npm run dev
```

Abre http://localhost:5173, ve a **Regístrate**, crea una cuenta y luego **Iniciar sesión**.

---

## Estructura del servidor

| Archivo / carpeta     | Para qué sirve |
|-----------------------|----------------|
| **.env**              | Configuración: puerto, conexión a PostgreSQL (host, puerto, usuario, contraseña), clave JWT. |
| **index.js**           | Punto de entrada: Express, CORS, rutas y arranque. |
| **config/basedatos.js** | Conexión a PostgreSQL (pool) y creación de tablas: `usuarios`, `tipos_establecimiento`, `establecimientos`, `domiciliarios`. |
| **rutas/auth.js**      | Rutas POST `/api/auth/login` y POST `/api/auth/registro`. |

---

## Variables en .env

| Variable      | Descripción              | Ejemplo |
|---------------|--------------------------|---------|
| PUERTO        | Puerto del servidor      | 3000    |
| DB_HOST       | Host de PostgreSQL       | localhost |
| DB_PORT       | Puerto de PostgreSQL     | 5433    |
| DB_NAME       | Nombre de la base        | snappy  |
| DB_USER       | Usuario                  | postgres |
| DB_PASSWORD   | Contraseña               | (tu contraseña) |
| JWT_CLAVE     | Clave para el token      | (cualquier texto largo) |

---

## Modo desarrollo (recarga al guardar)

```bash
npm run iniciar:dev
```

Con `--watch` el servidor se reinicia solo cuando cambias archivos.

---

## Base de datos: tipos de establecimiento

Para diferenciar **negocios de comida** (restaurantes) de **tiendas** (otros productos) se usa:

- **Tabla `tipos_establecimiento`**: catálogo con `id`, `clave`, `nombre`. Valores iniciales: `comida` (Comida / Restaurante) y `tienda` (Tienda (otros productos)).
- **Tabla `establecimientos`**: tiene `tipo_id` (FK a `tipos_establecimiento`), además de `usuario_id`, `nombre_negocio`, `direccion`, `telefono`.

No se usan tablas separadas por tipo (restaurantes vs tiendas); un solo catálogo y una columna en `establecimientos` permiten filtrar y ampliar tipos más adelante (ej. farmacia, supermercado).

---

## Base de datos: productos

Cada establecimiento puede dar de alta sus productos:

- **Tabla `productos`**: `id`, `establecimiento_id` (FK a `establecimientos`), `nombre`, `descripcion` (TEXT), `precio` (NUMERIC(10,2), ≥ 0), `creado_en`.

Los productos se listan con **GET /api/productos** (público). Opcional: `?establecimiento_id=UUID` para filtrar por tienda. La respuesta incluye el nombre del establecimiento y el tipo (comida/tienda). Esos productos se muestran en la **página principal** (con o sin sesión) y en el **área Cliente**; el establecimiento los gestiona desde el dashboard en **Establecimiento** (agregar, editar, eliminar).

**Imagen del producto:** la tabla `productos` tiene columna `imagen` (URL). El establecimiento puede **subir una imagen** desde su dispositivo: **POST /api/productos/subir-imagen** (multipart, campo `imagen`). Formatos: JPEG, PNG, GIF, WebP; máximo 4 MB.  
Si en el `.env` (o en Vercel) defines **CLOUDINARY_CLOUD_NAME**, **CLOUDINARY_API_KEY** y **CLOUDINARY_API_SECRET**, las imágenes se suben a [Cloudinary](https://cloudinary.com) y la URL guardada es la de Cloudinary (recomendado en producción). Si no, se guardan en `servidor/public/uploads/` y se sirven en **GET /uploads/nombre-archivo**.
