import api from './api';

export interface Recompensa {
  id: number | string;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  puntos_requeridos: number;
  activo: boolean;
}

export interface Canje {
  id: number | string;
  recompensa_id: number | string;
  puntos_gastados: number;
  estado: string;
  created_at: string;
  nombre?: string;
  descripcion?: string;
}

const puntosService = {
  async getSaldo(): Promise<{ saldo: number }> {
    const res = await api.get('/puntos/saldo');
    return res.data;
  },

  async getHistorial(): Promise<any[]> {
    const res = await api.get('/puntos/historial');
    return res.data;
  },

  async getRecompensas(): Promise<Recompensa[]> {
    const res = await api.get('/puntos/recompensas');
    return res.data;
  },

  async canjear(recompensa_id: number | string): Promise<Canje> {
    const res = await api.post('/puntos/canjear', { recompensa_id });
    return res.data;
  },

  async getMisCanjes(): Promise<Canje[]> {
    const res = await api.get('/puntos/canjes');
    return res.data;
  },
};

export default puntosService;
