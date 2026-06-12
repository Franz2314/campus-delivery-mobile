/**
 * Pantalla de entrega activa para el repartidor.
 *
 * - Recibe el id del pedido por search params.
 * - Muestra datos del cliente, destino (pabellón) y total.
 * - Botón principal "Confirmar entrega" → PUT /pedidos/:id/estado { estado: 'entregado' }.
 * - Polling cada 10s para mantener info actualizada.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import pedidosService, { Pedido } from '../../services/pedidos.service';
import menuService, { Pabellon } from '../../services/menu.service';
import OrderStatus from '../../components/OrderStatus';

const POLL_INTERVAL_MS = 10_000;

export default function EntregaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [pabellones, setPabellones] = useState<Pabellon[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await menuService.listarPabellones();
        setPabellones(data);
      } catch (err) {
        console.warn('[entrega] error pabellones', err);
      }
    })();
  }, []);

  const cargar = useCallback(
    async (showSpinner = false) => {
      if (!id) return;
      try {
        if (showSpinner) setLoading(true);
        const data = await pedidosService.detalle(id);
        setPedido(data);
      } catch (err) {
        console.warn('[entrega] error cargando pedido', err);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    cargar(true);
    intervalRef.current = setInterval(() => cargar(false), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cargar]);

  const pabellonNombre = useCallback(() => {
    if (!pedido) return '—';
    if (pedido.pabellon_nombre) return pedido.pabellon_nombre;
    const found = pabellones.find(
      (p) => String(p.id) === String(pedido.pabellon_id),
    );
    return found?.nombre || `Pabellón ${pedido.pabellon_id}`;
  }, [pedido, pabellones]);

  const onConfirmar = () => {
    if (!id) return;
    Alert.alert(
      'Confirmar entrega',
      '¿Ya entregaste el pedido al cliente?',
      [
        { text: 'Aún no', style: 'cancel' },
        {
          text: 'Sí, confirmar',
          onPress: async () => {
            setConfirming(true);
            try {
              await pedidosService.actualizarEstado(id, 'entregado');
              await cargar(false);
              Alert.alert('¡Listo!', 'Entrega registrada correctamente.', [
                { text: 'OK', onPress: () => router.replace('/(repartidor)/dashboard') },
              ]);
            } catch (err: any) {
              const msg =
                err?.response?.data?.error ||
                'No se pudo confirmar la entrega.';
              Alert.alert('Error', msg);
            } finally {
              setConfirming(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C0392B" size="large" />
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorTitle}>No se encontró el pedido</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(repartidor)/dashboard')}
        >
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const horaFormateada = new Date(pedido.hora_programada).toLocaleTimeString(
    'es-PE',
    { hour: '2-digit', minute: '2-digit' },
  );
  const yaEntregado = pedido.estado === 'entregado';
  const cancelado = pedido.estado === 'cancelado';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text style={styles.h1}>Entrega #{pedido.id}</Text>
      <Text style={styles.sub}>{pedido.negocio_nombre}</Text>
      <OrderStatus estado={pedido.estado} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>📍 Pabellón de entrega</Text>
        <Text style={styles.cardValue}>{pabellonNombre()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>🕐 Hora programada</Text>
        <Text style={styles.cardValue}>{horaFormateada}</Text>
      </View>

      {pedido.detalles && pedido.detalles.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🛒 Productos</Text>
          {pedido.detalles.map((d) => (
            <View key={String(d.producto_id)} style={styles.detRow}>
              <Text style={styles.detQty}>{d.cantidad}×</Text>
              <Text style={styles.detName}>{d.nombre}</Text>
              <Text style={styles.detSubtotal}>
                S/ {d.subtotal.toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              S/ {pedido.total.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {yaEntregado ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            🎉 Entrega registrada. ¡Buen trabajo!
          </Text>
        </View>
      ) : cancelado ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelText}>Este pedido fue cancelado.</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.btn, confirming && { opacity: 0.7 }]}
          onPress={onConfirmar}
          disabled={confirming}
          activeOpacity={0.85}
        >
          {confirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>Confirmar entrega</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.replace('/(repartidor)/dashboard')}
      >
        <Text style={styles.secondaryBtnText}>Volver al dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },

  h1: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: { fontSize: 16, color: '#1F2937', fontWeight: '600' },

  detRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  detQty: { width: 30, color: '#6B7280', fontWeight: '700' },
  detName: { flex: 1, color: '#1F2937' },
  detSubtotal: { color: '#1F2937', fontWeight: '700' },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#C0392B' },

  btn: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600' },

  successBox: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
  },
  successText: { color: '#14532D', fontWeight: '700', textAlign: 'center' },

  cancelBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
  },
  cancelText: { color: '#7F1D1D', fontWeight: '600', textAlign: 'center' },

  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
});
