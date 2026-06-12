/**
 * Servicio de autenticación.
 * Consume los endpoints del backend:
 *   POST /auth/registro
 *   POST /auth/login
 *   GET  /auth/perfil
 *
 * El backend se encarga de validar el dominio @utp.edu.pe
 * (vía Firebase Auth). El frontend solo guarda el JWT devuelto.
 */
import api from './api';
import * as storage from './storage';

export type Rol = 'estudiante' | 'repartidor' | 'negocio';

export interface Usuario {
  id: number | string;
  email: string;
  nombre: string;
  rol: Rol;
  telefono?: string;
}

export interface RegistroPayload {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  telefono?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

const authService = {
  /**
   * Registra un nuevo usuario. El backend valida que el email sea @utp.edu.pe.
   */
  async registro(data: RegistroPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/registro', data);
    return response.data;
  },

  /**
   * Login. Devuelve token JWT + datos del usuario.
   */
  async login(data: LoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Perfil del usuario autenticado (requiere Bearer token).
   */
  async perfil(): Promise<Usuario> {
    const response = await api.get<Usuario>('/auth/perfil');
    return response.data;
  },

  /**
   * Limpia las credenciales locales (SecureStore).
   */
  async logout(): Promise<void> {
    await storage.clearAll();
  },
};

export default authService;
