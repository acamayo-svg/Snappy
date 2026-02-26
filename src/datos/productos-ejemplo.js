/**
 * Datos de ejemplo para productos (carruseles).
 * Más adelante vendrán de la base de datos o API.
 */
export const productosEjemplo = [
  {
    id: 1,
    nombre: 'Combo familiar',
    descripcion: 'Pizza mediana + bebida + postre',
    precio: 24900,
    imagen: '/recursos/canasta-compras.png',
    establecimiento: 'Popsy',
    categoria: 'Comida',
  },
  {
    id: 2,
    nombre: 'Envío farmacia',
    descripcion: 'Medicamentos y cuidado personal',
    precio: 0,
    imagen: '/recursos/cruz-verde.png',
    establecimiento: 'Cruz Verde',
    categoria: 'Farmacia',
  },
  {
    id: 3,
    nombre: 'Café y repostería',
    descripcion: 'Café premium y pasteles',
    precio: 8900,
    imagen: '/recursos/juan-valdez.png',
    establecimiento: 'Juan Valdez',
    categoria: 'Café',
  },
  {
    id: 4,
    nombre: 'Supermercado',
    descripcion: 'Víveres y productos del hogar',
    precio: 0,
    imagen: '/recursos/canasta-compras.png',
    establecimiento: 'La Rebaja',
    categoria: 'Supermercado',
  },
  {
    id: 5,
    nombre: 'Helado gourmet',
    descripcion: 'Helados artesanales a domicilio',
    precio: 12900,
    imagen: '/recursos/popsy.png',
    establecimiento: 'Popsy',
    categoria: 'Postres',
  },
]

export const categoriasEjemplo = [
  { id: 'comida', nombre: 'Comida', icono: '🍔' },
  { id: 'farmacia', nombre: 'Farmacia', icono: '💊' },
  { id: 'supermercado', nombre: 'Supermercado', icono: '🛒' },
  { id: 'cafe', nombre: 'Café', icono: '☕' },
  { id: 'tiendas', nombre: 'Tiendas', icono: '🏪' },
]
