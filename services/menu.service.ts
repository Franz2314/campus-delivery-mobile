/**
 * Servicio de catálogo (productos, negocios, pabellones, reseñas).
 *
 * Endpoints consumidos:
 *   GET    /productos          (filtros: categoria, negocio_id)
 *   GET    /productos/:id
 *   POST   /productos          (CRUD de productos para rol negocio)
 *   PUT    /productos/:id      (editar precio / disponibilidad)
 *   DELETE /productos/:id
 *   GET    /negocios
 *   GET    /pabellones
 *   POST   /resenas
 */
import api from './api';

export interface Producto {
  id: number | string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  categoria: string;
  disponible: boolean;
  negocio_id: number | string;
  negocio_nombre: string;
}

export interface Negocio {
  id: number | string;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  activo: boolean;
}

export interface Pabellon {
  id: number | string;
  nombre: string;
  descripcion?: string;
}

export interface ResenaPayload {
  pedido_id: number | string;
  calificacion: number; // 1..5
  comentario?: string;
}

export interface ProductosFiltros {
  categoria?: string;
  negocio_id?: number | string;
}

export interface CrearProductoPayload {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  categoria: string;
  disponible?: boolean;
  negocio_id: number | string;
}

export interface ActualizarProductoPayload {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  imagen_url?: string;
  categoria?: string;
  disponible?: boolean;
}

const menuService = {
  /** Lista productos del catálogo. Soporta filtros opcionales. */
  async listarProductos(filtros: ProductosFiltros = {}): Promise<Producto[]> {
    const params: Record<string, string> = {};
    if (filtros.categoria) params.categoria = filtros.categoria;
    if (filtros.negocio_id !== undefined) {
      params.negocio_id = String(filtros.negocio_id);
    }
    const res = await api.get<Producto[]>('/productos', { params });
    return res.data;
  },

  /** Detalle de un producto. */
  async detalleProducto(id: number | string): Promise<Producto> {
    const res = await api.get<Producto>(`/productos/${id}`);
    return res.data;
  },

  /** Lista de negocios activos. */
  async listarNegocios(): Promise<Negocio[]> {
    const res = await api.get<Negocio[]>('/negocios');
    return res.data;
  },

  /** Lista de pabellones disponibles para entrega. */
  async listarPabellones(): Promise<Pabellon[]> {
    const res = await api.get<Pabellon[]>('/pabellones');
    return res.data;
  },

  /** Crea un producto (rol negocio). */
  async crearProducto(payload: CrearProductoPayload): Promise<Producto> {
    const res = await api.post<Producto>('/productos', payload);
    return res.data;
  },

  /** Actualiza un producto (precio, disponibilidad, etc). */
  async actualizarProducto(
    id: number | string,
    payload: ActualizarProductoPayload,
  ): Promise<Producto> {
    const res = await api.put<Producto>(`/productos/${id}`, payload);
    return res.data;
  },

  /** Elimina un producto. */
  async eliminarProducto(id: number | string): Promise<void> {
    await api.delete(`/productos/${id}`);
  },

  /** Crea una reseña post-entrega. */
  async crearResena(payload: ResenaPayload): Promise<void> {
    await api.post('/resenas', payload);
  },
};

export default menuService;
