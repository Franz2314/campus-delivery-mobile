/**
 * Pantalla de pedidos entrantes para el negocio.
 *
 * - Lista los pedidos del negocio, filtrados por estado:
 *     • pendiente    → "Confirmar pedido" (→ 'confirmado')
 *     • confirmado   → "Iniciar preparación" (→ 'en_preparacion')
 *     • en_preparacion → "Listo para entregar" (→ 'en_camino', normalmente
 *       esto lo hace el repartidor, pero permitimos que el negocio lo marque
 *       listo si no hay repartidor aún)
 * - Estados terminales (entregado, cancelado) se muestran como histórico.
 * - Polling cada 10s para refrescar automáticamente.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import pedidosService, { EstadoPedido, Pedido } from '../../services/pedidos.service';
import OrderStatus from '../../components/OrderStatus';

const POLL_INTERVAL_MS = 10_000;

const ACCIONES_POR_ESTADO: Partial<
  Record<EstadoPedido, { label: string; next: EstadoPedido }[]>
> = {
  pendiente: [{ label: 'Confirmar pedido', next: 'confirmado' }],
  confirmado: [{ label: 'Iniciar preparación', next: 'en_preparacion' }],
  en_preparacion: [{ label: 'Listo para entregar', next: 'en_camino' }],
};

export default function NegocioPedidosScreen() {
  const { user, signOut } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) setLoading(true);
        const data = await pedidosService.listar();
        // Ordenar: más recientes primero
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setPedidos(sorted);
      } catch (err) {
        console.warn('[negocio/pedidos] error cargando', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    cargar(true);
    intervalRef.current = setInterval(() => cargar(false), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar(false);
    }, [cargar]),
  );

  const cambiarEstado = async (p: Pedido, next: EstadoPedido) => {
    setActingId(String(p.id));
    try {
      await pedidosService.actualizarEstado(p.id, next);
      cargar(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'No se pudo actualizar el estado del pedido.';
      Alert.alert('Error', msg);
    } finally {
      setActingId(null);
    }
  };

  const renderCard = (p: Pedido) => {
    const acciones = ACCIONES_POR_ESTADO[p.estado] ?? [];
    const horaTxt = new Date(p.hora_programada).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Pedido #{p.id}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(p.created_at).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {p.pabellon_nombre ? `  ·  ${p.pabellon_nombre}` : ''}
            </Text>
          </View>
          <Text style={styles.cardTotal}>S/ {p.total.toFixed(2)}</Text>
        </View>

        <View style={styles.statusRow}>
          <OrderStatus estado={p.estado} />
          <Text style={styles.horaProgramada}>🕐 {horaTxt}</Text>
        </View>

        {acciones.length > 0 ? (
          <View style={styles.actionsRow}>
            {acciones.map((a) => (
              <TouchableOpacity
                key={a.next}
                style={[
                  styles.actionBtn,
                  actingId === String(p.id) && { opacity: 0.7 },
                ]}
                onPress={() => cambiarEstado(p, a.next)}
                disabled={actingId === String(p.id)}
                activeOpacity={0.85}
              >
                {actingId === String(p.id) ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionBtnText}>{a.label}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.terminalRow}>
            <Text style={styles.terminalText}>
              {p.estado === 'entregado' ? '✅ Pedido completado' : '❌ Pedido cancelado'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            Hola, {user?.nombre?.split(' ')[0] ?? 'negocio'} 🏪
          </Text>
          <Text style={styles.subtitle}>Pedidos entrantes</Text>
        </View>
        <TouchableOpacity onPress={signOut} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={styles.emptyTitle}>Sin pedidos por ahora</Text>
          <Text style={styles.emptySubtitle}>
            Aquí verás los pedidos que recibas
          </Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => renderCard(item)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                cargar(false);
              }}
              tintColor="#C0392B"
              colors={['#C0392B']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  greeting: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: '800', color: '#C0392B' },

  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 10,
  },
  horaProgramada: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  actionsRow: { marginTop: 12, gap: 8 },
  actionBtn: {
    backgroundColor: '#C0392B', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  terminalRow: {
    marginTop: 12, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  terminalText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },

  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
