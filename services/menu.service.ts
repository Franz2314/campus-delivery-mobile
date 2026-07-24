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
  codigo?: string;
  descripcion?: string;
  max_pisos?: number;
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

export interface MenuItem {
  id: number | string;
  tipo: 'entrada' | 'sopa' | 'plato_fuerte' | 'postre' | 'bebida';
  nombre: string;
  descripcion?: string;
}

export interface Menu {
  id: number | string;
  negocio_id: number | string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  disponible: boolean;
  items: MenuItem[];
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

  // ── Menús del Día ───────────────────────────────────────────────────

  /** Lista los menús del día (filtro opcional por negocio). */
  async listarMenus(negocio_id?: string): Promise<Menu[]> {
    const params: Record<string, string> = {};
    if (negocio_id) params.negocio_id = negocio_id;
    const res = await api.get<Menu[]>('/menus', { params });
    return res.data;
  },

  /** Detalle de un menú con sus items. */
  async detalleMenu(id: number | string): Promise<Menu> {
    const res = await api.get<Menu>(`/menus/${id}`);
    return res.data;
  },

  /** Crea un menú (rol negocio). */
  async crearMenu(payload: {
    nombre: string;
    descripcion?: string;
    precio: number;
    imagen_url?: string;
  }): Promise<Menu> {
    const res = await api.post<Menu>('/menus', payload);
    return res.data;
  },

  /** Actualiza un menú. */
  async actualizarMenu(
    id: number | string,
    payload: {
      nombre?: string;
      descripcion?: string;
      precio?: number;
      imagen_url?: string;
      disponible?: boolean;
    },
  ): Promise<Menu> {
    const res = await api.put<Menu>(`/menus/${id}`, payload);
    return res.data;
  },

  /** Elimina un menú. */
  async eliminarMenu(id: number | string): Promise<void> {
    await api.delete(`/menus/${id}`);
  },

  /** Agrega un item a un menú. */
  async agregarMenuItem(menuId: number | string, payload: {
    tipo: string;
    nombre: string;
    descripcion?: string;
  }): Promise<MenuItem> {
    const res = await api.post<MenuItem>(`/menus/${menuId}/items`, payload);
    return res.data;
  },

  /** Actualiza un item del menú. */
  async actualizarMenuItem(id: number | string, payload: {
    tipo?: string;
    nombre?: string;
    descripcion?: string;
  }): Promise<MenuItem> {
    const res = await api.put<MenuItem>(`/menu-items/${id}`, payload);
    return res.data;
  },

  /** Elimina un item del menú. */
  async eliminarMenuItem(id: number | string): Promise<void> {
    await api.delete(`/menu-items/${id}`);
  },
};

export default menuService;
