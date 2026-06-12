import { Platform } from 'react-native';

let SecureStore: any = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const webStore: Record<string, string | null> = {};

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return webStore.token ?? null;
    return await SecureStore.getItemAsync('token');
  } catch { return null; }
}

export async function setToken(value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') { webStore.token = value; return; }
    await SecureStore.setItemAsync('token', value);
  } catch {}
}

export async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') { delete webStore.token; return; }
    await SecureStore.deleteItemAsync('token');
  } catch {}
}

export async function getUser<T = any>(): Promise<T | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web') raw = webStore.user ?? null;
    else raw = await SecureStore.getItemAsync('user');
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}

export async function setUser(value: any): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') { webStore.user = raw; return; }
    await SecureStore.setItemAsync('user', raw);
  } catch {}
}

export async function removeUser(): Promise<void> {
  try {
    if (Platform.OS === 'web') { delete webStore.user; return; }
    await SecureStore.deleteItemAsync('user');
  } catch {}
}

export async function clearAll(): Promise<void> {
  await removeToken();
  await removeUser();
}
