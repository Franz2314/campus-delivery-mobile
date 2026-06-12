import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, useSegments } from 'expo-router';

import authService, {
  LoginPayload,
  RegistroPayload,
  Rol,
  Usuario,
} from '../services/auth.service';
import * as storage from '../services/storage';

interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  signIn: (data: LoginPayload) => Promise<void>;
  signUp: (data: RegistroPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const HOME_BY_ROL: Record<Rol, string> = {
  estudiante: '/(estudiante)/catalogo',
  repartidor: '/(repartidor)/dashboard',
  negocio: '/(negocio)/menu',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          storage.getToken(),
          storage.getUser<Usuario>(),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (err) {
        console.warn('[useAuth] Error restaurando sesión', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && user && inAuthGroup) {
      router.replace(HOME_BY_ROL[user.rol] as never);
    }
  }, [token, user, loading, segments, router]);

  const persistSession = useCallback(
    async (newToken: string, newUser: Usuario) => {
      await Promise.all([
        storage.setToken(newToken),
        storage.setUser(newUser),
      ]);
      setToken(newToken);
      setUser(newUser);
    },
    [],
  );

  const signIn = useCallback(
    async (data: LoginPayload) => {
      const res = await authService.login(data);
      await persistSession(res.token, res.usuario);
      router.replace(HOME_BY_ROL[res.usuario.rol] as never);
    },
    [persistSession, router],
  );

  const signUp = useCallback(
    async (data: RegistroPayload) => {
      const res = await authService.registro(data);
      await persistSession(res.token, res.usuario);
      router.replace(HOME_BY_ROL[res.usuario.rol] as never);
    },
    [persistSession, router],
  );

  const signOut = useCallback(async () => {
    await authService.logout();
    await storage.clearAll();
    setToken(null);
    setUser(null);
    router.replace('/(auth)/login' as never);
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signUp, signOut }),
    [user, token, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return ctx;
}
