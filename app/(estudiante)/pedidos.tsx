import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import pedidosService, { Pedido } from '../../services/pedidos.service';
import OrderStatus from '../../components/OrderStatus';

export const title = 'Mis pedidos';
export default function MisPedidosScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await pedidosService.listar();
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setPedidos(sorted);
    } catch (err) {
      console.warn('[estudiante/pedidos] error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { cargar(false); }, [cargar]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Mis Pedidos 🧾</Text>
          <Text style={styles.subtitle}>Historial de tus pedidos</Text>
        </View>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => router.push('/(estudiante)/catalogo')}>
            <Text style={styles.headerLink}>Catálogo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.headerLink}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : pedidos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Sin pedidos</Text>
          <Text style={styles.emptySubtitle}>Tus pedidos aparecerán aquí</Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const fecha = new Date(item.created_at).toLocaleDateString('es-PE', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            const activo = !['entregado', 'cancelado', 'rechazado'].includes(item.estado);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/(estudiante)/seguimiento?id=${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {item.negocio_nombre}
                    </Text>
                    <Text style={styles.cardSubtitle}>{fecha}</Text>
                  </View>
                  <Text style={styles.cardTotal}>S/ {item.total.toFixed(2)}</Text>
                </View>
                <View style={styles.cardBottom}>
                  <OrderStatus estado={item.estado} />
                  {activo && (
                    <TouchableOpacity
                      style={styles.trackBtn}
                      onPress={() => router.push(`/(estudiante)/seguimiento?id=${item.id}`)}
                    >
                      <Text style={styles.trackBtnText}>Seguir →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); cargar(false); }}
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
  headerLinks: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headerLink: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardTotal: { fontSize: 15, fontWeight: '800', color: '#C0392B' },
  cardBottom: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 10,
  },
  trackBtn: {
    backgroundColor: '#C0392B', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  trackBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
