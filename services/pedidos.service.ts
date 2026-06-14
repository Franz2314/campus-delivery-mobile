import api from './api';

export type EstadoPedido =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'
  | 'rechazado';

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
  estudiante_id?: number | string;
  repartidor_id?: number | string | null;
  negocio_id: number | string;
  negocio_nombre: string;
  pabellon_id: number | string;
  pabellon_nombre?: string;
  piso?: number;
  estado: EstadoPedido;
  total: number;
  hora_programada: string;
  comprobante_url?: string;
  comprobante_verificado?: boolean;
  comprobante_rechazado?: boolean;
  motivo_cancelacion?: string;
  codigo_recogida?: string;
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
  piso?: number;
  hora_programada: string;
  items: ItemPedido[];
  comprobante_url?: string;
}

const pedidosService = {
  async crear(payload: CrearPedidoPayload): Promise<Pedido> {
    const res = await api.post<Pedido>('/pedidos', payload);
    return res.data;
  },

  async listar(): Promise<Pedido[]> {
    const res = await api.get<Pedido[]>('/pedidos');
    return res.data;
  },

  async detalle(id: number | string): Promise<Pedido> {
    const res = await api.get<Pedido>(`/pedidos/${id}`);
    return res.data;
  },

  async actualizarEstado(id: number | string, estado: EstadoPedido): Promise<Pedido> {
    const res = await api.put<Pedido>(`/pedidos/${id}/estado`, { estado });
    return res.data;
  },

  async cancelar(id: number | string, motivo?: string): Promise<Pedido> {
    const res = await api.put<Pedido>(`/pedidos/${id}/cancelar`, { motivo });
    return res.data;
  },

  async rechazarComprobante(id: number | string, motivo: string): Promise<Pedido> {
    const res = await api.put<Pedido>(`/pedidos/${id}/rechazar-comprobante`, { motivo });
    return res.data;
  },
};

export default pedidosService;
