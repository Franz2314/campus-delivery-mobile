/**
 * Dashboard del repartidor.
 *
 * - Lista pedidos con estado 'confirmado' (disponibles para aceptar)
 *   y 'en_camino' / 'en_preparacion' asignados a este repartidor.
 * - Para pedidos disponibles: botón "Aceptar" → cambia estado a 'en_camino'.
 * - Para pedidos ya aceptados por mí: botón "Ver entrega" → navega a /entrega.
 * - Pull-to-refresh + recarga al volver a la pantalla.
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import pedidosService, { Pedido } from '../../services/pedidos.service';
import OrderStatus from '../../components/OrderStatus';

export default function RepartidorDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const cargar = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        const data = await pedidosService.listar();
        // Mostrar:
        //  - Pedidos 'confirmado' (cualquiera puede aceptarlos)
        //  - Pedidos 'en_preparacion' o 'en_camino' asignados a mí
        const relevantes = data.filter((p) => {
          if (p.estado === 'confirmado') return true;
          if (
            (p.estado === 'en_preparacion' || p.estado === 'en_camino') &&
            p.repartidor_id !== null &&
            p.repartidor_id !== undefined &&
            String(p.repartidor_id) === String(user?.id)
          ) {
            return true;
          }
          return false;
        });
        // Orden: disponibles primero, luego los míos
        relevantes.sort((a, b) => {
          const aMio = String(a.repartidor_id) === String(user?.id);
          const bMio = String(b.repartidor_id) === String(user?.id);
          if (aMio === bMio) return 0;
          return aMio ? 1 : -1;
        });
        setPedidos(relevantes);
      } catch (err) {
        console.warn('[repartidor/dashboard] error cargando', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar(false);
    }, [cargar]),
  );

  const onAceptar = async (p: Pedido) => {
    setActingId(String(p.id));
    try {
      await pedidosService.actualizarEstado(p.id, 'en_camino');
      await cargar(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'No se pudo aceptar el pedido. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setActingId(null);
    }
  };

  const onVerEntrega = (p: Pedido) => {
    router.push({
      pathname: '/(repartidor)/entrega',
      params: { id: String(p.id) },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0] ?? 'repartidor'} 🛵</Text>
          <Text style={styles.subtitle}>Pedidos disponibles y en curso</Text>
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
          <Text style={styles.emptyEmoji}>🛵</Text>
          <Text style={styles.emptyTitle}>Sin pedidos por ahora</Text>
          <Text style={styles.emptySubtitle}>
            Te avisaremos cuando haya pedidos disponibles
          </Text>
        </View>
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const esMio =
              item.repartidor_id !== null &&
              item.repartidor_id !== undefined &&
              String(item.repartidor_id) === String(user?.id);
            const disponible = ['confirmado', 'en_preparacion'].includes(item.estado);
            const horaTxt = new Date(item.hora_programada).toLocaleTimeString(
              'es-PE',
              { hour: '2-digit', minute: '2-digit' },
            );
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardTitle}>
                      Pedido #{item.id}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {item.negocio_nombre}
                    </Text>
                  </View>
                  <Text style={styles.cardTotal}>
                    S/ {item.total.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>🕐 {horaTxt}</Text>
                  {item.pabellon_nombre && (
                    <Text style={styles.metaText}>
                      📍 {item.pabellon_nombre}
                      {item.piso ? ` · Piso ${item.piso}` : ''}
                    </Text>
                  )}
                </View>

                <View style={styles.statusRow}>
                  <OrderStatus estado={item.estado} />
                </View>

                {item.codigo_recogida && (
                  <View style={styles.pickupBox}>
                    <Text style={styles.pickupLabel}>🔑 Código de recogida</Text>
                    <Text style={styles.pickupCode}>{item.codigo_recogida}</Text>
                  </View>
                )}

                {disponible ? (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      actingId === String(item.id) && { opacity: 0.7 },
                    ]}
                    onPress={() => onAceptar(item)}
                    disabled={actingId === String(item.id)}
                    activeOpacity={0.85}
                  >
                    {actingId === String(item.id) ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Aceptar pedido</Text>
                    )}
                  </TouchableOpacity>
                ) : esMio ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => onVerEntrega(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.secondaryBtnText}>Ver entrega →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  greeting: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardTotal: { fontSize: 16, fontWeight: '800', color: '#C0392B' },

  metaRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  metaText: { fontSize: 12, color: '#374151', fontWeight: '500' },

  statusRow: { marginTop: 10 },

  primaryBtn: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: { color: '#C0392B', fontSize: 14, fontWeight: '700' },

  pickupBox: {
    marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10,
    alignItems: 'center',
  },
  pickupLabel: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  pickupCode: {
    fontSize: 22, fontWeight: '900', color: '#C0392B',
    letterSpacing: 4, marginTop: 2,
  },
  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
