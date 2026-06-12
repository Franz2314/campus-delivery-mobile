import { Platform } from 'react-native';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as storage from './storage';

const apiUrlConfig = Constants.expoConfig?.extra as Record<string, string> | undefined;

const API_BASE_URL: string =
  Platform.OS === 'android'
    ? (apiUrlConfig?.apiUrlPhone || apiUrlConfig?.apiUrlAndroid || 'http://10.0.2.2:3000/api')
    : (apiUrlConfig?.apiUrl || 'http://localhost:3000/api');

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await storage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[api] No se pudo leer el token', err);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await storage.clearAll();
      } catch {}
    }
    return Promise.reject(error);
  },
);

export default api;
