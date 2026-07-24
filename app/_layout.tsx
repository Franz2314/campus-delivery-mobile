/**
 * Root layout de la app.
 *
 * - Envuelve todo en <AuthProvider> (gestiona token, usuario y navegación).
 * - Define un Stack con las 4 route groups: (auth), (estudiante), (repartidor), (negocio).
 * - Muestra un spinner mientras se restaura la sesión.
 */
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../hooks/useAuth';
import { CartProvider } from '../hooks/useCart';

function Loading() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <ActivityIndicator size="large" color="#C0392B" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />
      </CartProvider>
    </AuthProvider>
  );
}

// Indicamos a TypeScript que existe un componente cargando
export { Loading };
