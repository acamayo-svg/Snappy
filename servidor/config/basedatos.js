import pg from 'pg'

const { Pool } = pg

const isLocal = !process.env.VERCEL && (!process.env.DB_HOST || process.env.DB_HOST === 'localhost')
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_NAME || 'snappy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
})

export async function obtenerConexion() {
  return pool
}

export async function inicializarTabla() {
  const cliente = await pool.connect()
  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        correo VARCHAR(255) NOT NULL UNIQUE,
        contrasena_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        roles TEXT[] DEFAULT '{"cliente"}'
      )
    `)

    const tieneRol = await cliente.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name = 'rol'
    `)
    if (tieneRol.rows.length > 0) {
      await cliente.query(`ALTER TABLE usuarios ADD COLUMN roles TEXT[] DEFAULT '{"cliente"}';`)
      await cliente.query(`UPDATE usuarios SET roles = ARRAY[rol] WHERE rol IS NOT NULL;`)
      await cliente.query(`ALTER TABLE usuarios DROP COLUMN rol;`)
    }

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS tipos_establecimiento (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clave VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL
      )
    `)

    const hayTipos = await cliente.query('SELECT 1 FROM tipos_establecimiento LIMIT 1')
    if (hayTipos.rows.length === 0) {
      await cliente.query(`
        INSERT INTO tipos_establecimiento (clave, nombre) VALUES
        ('comida', 'Comida / Restaurante'),
        ('tienda', 'Tienda (otros productos)')
      `)
    }

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS establecimientos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo_id UUID NOT NULL REFERENCES tipos_establecimiento(id),
        nombre_negocio VARCHAR(255) NOT NULL,
        direccion TEXT,
        telefono VARCHAR(50),
        creado_en TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(usuario_id)
      )
    `)

    const tieneTipoId = await cliente.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'establecimientos' AND column_name = 'tipo_id'
    `)
    if (tieneTipoId.rows.length === 0) {
      const primerTipo = await cliente.query(`SELECT id FROM tipos_establecimiento LIMIT 1`)
      const tipoId = primerTipo.rows[0]?.id
      if (tipoId) {
        await cliente.query(`ALTER TABLE establecimientos ADD COLUMN tipo_id UUID REFERENCES tipos_establecimiento(id)`)
        await cliente.query(`UPDATE establecimientos SET tipo_id = $1 WHERE tipo_id IS NULL`, [tipoId])
        await cliente.query(`ALTER TABLE establecimientos ALTER COLUMN tipo_id SET NOT NULL`)
      }
    }

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS domiciliarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        estado VARCHAR(20) DEFAULT 'activo',
        creado_en TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(usuario_id)
      )
    `)

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        establecimiento_id UUID NOT NULL REFERENCES establecimientos(id) ON DELETE CASCADE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
        imagen VARCHAR(500),
        creado_en TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await cliente.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_establecimiento
      ON productos(establecimiento_id)
    `)
    const tieneImagen = await cliente.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'productos' AND column_name = 'imagen'
    `)
    if (tieneImagen.rows.length === 0) {
      await cliente.query(`ALTER TABLE productos ADD COLUMN imagen VARCHAR(500)`)
    }
  } finally {
    cliente.release()
  }
}
