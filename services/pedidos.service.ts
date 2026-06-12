/**
 * Servicio de pedidos.
 *
 * Endpoints consumidos:
 *   POST /pedidos                  Crear pedido (con hora_programada)
 *   GET  /pedidos                  Listar pedidos del usuario/rol actual
 *   GET  /pedidos/:id              Detalle de pedido
 *   PUT  /pedidos/:id/estado       Actualizar estado (repartidor/negocio)
 *   PUT  /pedidos/:id/cancelar     Cancelar pedido (estudiante)
 */
import api from './api';

export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

export interface DetallePedido {
  producto_id: number | string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Pedido {
  id: number | string;
  usuario_id: number | string;
  repartidor_id?: number | string | null;
  negocio_id: number | string;
  negocio_nombre: string;
  pabellon_id: number | string;
  pabellon_nombre?: string;
  estado: EstadoPedido;
  total: number;
  hora_programada: string; // ISO 8601
  comprobante_url?: string;
  created_at: string;
  updated_at: string;
  detalles?: DetallePedido[];
}

export interface ItemPedido {
  producto_id: number | string;
  cantidad: number;
}

export interface CrearPedidoPayload {
  pabellon_id: number | string;
  hora_programada: string;
  items: ItemPedido[];
  comprobante_url?: string;
}

const pedidosService = {
  /** Crea un pedido. */
  async crear(payload: CrearPedidoPayload): Promise<Pedido> {
    const res = await api.post<Pedido>('/pedidos', payload);
    return res.data;
  },

  /** Lista pedidos del usuario/rol actual. */
  async listar(): Promise<Pedido[]> {
    const res = await api.get<Pedido[]>('/pedidos');
    return res.data;
  },

  /** Detalle de un pedido. */
  async detalle(id: number | string): Promise<Pedido> {
    const res = await api.get<Pedido>(`/pedidos/${id}`);
    return res.data;
  },

  /** Actualiza el estado (repartidor/negocio). */
  async actualizarEstado(
    id: number | string,
    estado: EstadoPedido,
  ): Promise<Pedido> {
    const res = await api.put<Pedido>(`/pedidos/${id}/estado`, { estado });
    return res.data;
  },

  /** Cancela un pedido (estudiante). */
  async cancelar(id: number | string): Promise<Pedido> {
    const res = await api.put<Pedido>(`/pedidos/${id}/cancelar`);
    return res.data;
  },
};

export default pedidosService;
