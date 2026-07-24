/**
 * Pantalla de seguimiento de pedido.
 *
 * - Recibe el id del pedido por search params.
 * - Hace polling a GET /pedidos/:id cada 10s para refrescar el estado.
 * - Muestra timeline visual con los 5 estados del flujo.
 * - Permite cancelar si el estado lo permite.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import pedidosService, { EstadoPedido, Pedido } from '../../services/pedidos.service';
import menuService, { Pabellon } from '../../services/menu.service';
import OrderStatus from '../../components/OrderStatus';

interface EstadoItem {
  key: EstadoPedido;
  label: string;
  icon: string;
}

const ESTADOS: EstadoItem[] = [
  { key: 'pendiente', label: 'Recibido', icon: '📝' },
  { key: 'confirmado', label: 'Confirmado', icon: '✅' },
  { key: 'en_preparacion', label: 'En preparación', icon: '🍳' },
  { key: 'en_camino', label: 'En camino', icon: '🛵' },
  { key: 'entregado', label: 'Entregado', icon: '🎉' },
];

const POLL_INTERVAL_MS = 10_000;

export const title = 'Seguimiento';
export default function SeguimientoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [pabellones, setPabellones] = useState<Pabellon[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cargar pabellones (para mostrar el nombre)
  useEffect(() => {
    (async () => {
      try {
        const data = await menuService.listarPabellones();
        setPabellones(data);
      } catch (err) {
        console.warn('[seguimiento] error pabellones', err);
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
        console.warn('[seguimiento] error cargando pedido', err);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  // Polling cada 10s
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
    const found = pabellones.find((p) => String(p.id) === String(pedido.pabellon_id));
    return found?.nombre || `Pabellón ${pedido.pabellon_id}`;
  }, [pedido, pabellones]);

  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  const onCancelar = () => {
    if (!id) return;
    if (!showCancelInput) {
      setShowCancelInput(true);
      return;
    }
    Alert.alert(
      'Cancelar pedido',
      `Motivo: ${cancelReason || 'Sin motivo'}\n\n¿Seguro que quieres cancelar?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await pedidosService.cancelar(id, cancelReason || undefined);
              setShowCancelInput(false);
              cargar(false);
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el pedido.');
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
          onPress={() => router.replace('/(estudiante)/catalogo')}
        >
          <Text style={styles.btnText}>Volver al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoIndex = ESTADOS.findIndex((e) => e.key === pedido.estado);
  const puedeCancelar = ['pendiente', 'confirmado'].includes(pedido.estado);
  const esCancelado = pedido.estado === 'cancelado';
  const horaFormateada = new Date(pedido.hora_programada).toLocaleString(
    'es-PE',
    { dateStyle: 'short', timeStyle: 'short' },
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text style={styles.h1}>Pedido #{pedido.id}</Text>
      <Text style={styles.sub}>{pedido.negocio_nombre}</Text>
      <OrderStatus estado={pedido.estado} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Pabellón de entrega</Text>
        <Text style={styles.cardValue}>{pabellonNombre()}</Text>
      </View>

      {pedido.piso && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Piso</Text>
          <Text style={styles.cardValue}>Piso {pedido.piso}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Hora programada</Text>
        <Text style={styles.cardValue}>{horaFormateada}</Text>
      </View>

      {pedido.codigo_recogida && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>🔑 Código de recogida</Text>
          <Text style={styles.pickupCode}>{pedido.codigo_recogida}</Text>
          <Text style={styles.pickupHint}>Entrégaselo al repartidor para confirmar la recogida</Text>
        </View>
      )}

      {pedido.comprobante_url && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Comprobante de pago</Text>
          <Image
            source={{ uri: pedido.comprobante_url }}
            style={styles.comprobanteImage}
            resizeMode="contain"
          />
          {pedido.comprobante_verificado && (
            <Text style={styles.verifiedText}>✅ Comprobante verificado</Text>
          )}
          {pedido.comprobante_rechazado && (
            <Text style={styles.rejectedText}>
              ❌ Comprobante rechazado{pedido.motivo_cancelacion ? `: ${pedido.motivo_cancelacion}` : ''}
            </Text>
          )}
        </View>
      )}

      {esCancelado && pedido.motivo_cancelacion && (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelText}>
            Motivo: {pedido.motivo_cancelacion}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total</Text>
        <Text style={styles.cardTotal}>S/ {pedido.total.toFixed(2)}</Text>
      </View>

      <Text style={styles.timelineTitle}>Estado del pedido</Text>
      {!esCancelado ? (
        <View style={styles.timeline}>
          {ESTADOS.map((e, i) => {
            const reached = i <= estadoIndex;
            const isLast = i === ESTADOS.length - 1;
            return (
              <View key={e.key} style={styles.timelineItem}>
                <View
                  style={[
                    styles.dot,
                    reached && styles.dotReached,
                    pedido.estado === e.key && styles.dotActive,
                  ]}
                >
                  <Text style={styles.dotIcon}>{e.icon}</Text>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.line,
                      i < estadoIndex && styles.lineReached,
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.timelineLabel,
                    reached && styles.timelineLabelReached,
                  ]}
                >
                  {e.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelText}>
            Este pedido fue cancelado y no se preparará.
          </Text>
        </View>
      )}

      {puedeCancelar && (
        <>
          {showCancelInput && (
            <TextInput
              style={styles.reasonInput}
              placeholder="Motivo de cancelación (opcional)"
              placeholderTextColor="#9CA3AF"
              value={cancelReason}
              onChangeText={setCancelReason}
            />
          )}
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancelar}>
            <Text style={styles.cancelBtnText}>
              {showCancelInput ? 'Confirmar cancelación' : 'Cancelar pedido'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => router.replace('/(estudiante)/catalogo')}
      >
        <Text style={styles.homeBtnText}>Volver al catálogo</Text>
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
  cardLabel: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  cardValue: { fontSize: 15, color: '#1F2937', fontWeight: '600', marginTop: 4 },
  cardTotal: { fontSize: 20, fontWeight: '800', color: '#C0392B', marginTop: 4 },
  pickupCode: {
    fontSize: 28, fontWeight: '900', color: '#C0392B',
    letterSpacing: 6, marginTop: 4, textAlign: 'center',
  },
  pickupHint: { fontSize: 11, color: '#92400E', marginTop: 4, textAlign: 'center' },

  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#1F2937', marginTop: 22, marginBottom: 14 },
  timeline: { paddingLeft: 8 },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    minHeight: 48,
  },
  dot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  dotReached: { backgroundColor: '#FDEDEC', borderColor: '#C0392B' },
  dotActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  dotIcon: { fontSize: 16 },
  line: {
    position: 'absolute',
    left: 17,
    top: 36,
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  lineReached: { backgroundColor: '#C0392B' },
  timelineLabel: { marginLeft: 12, marginTop: 8, fontSize: 14, color: '#9CA3AF' },
  timelineLabelReached: { color: '#1F2937', fontWeight: '600' },

  comprobanteImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
  },
  verifiedText: { color: '#16A34A', fontWeight: '700', marginTop: 8, fontSize: 13 },
  rejectedText: { color: '#DC2626', fontWeight: '700', marginTop: 8, fontSize: 13 },

  cancelBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 16,
    marginTop: 18,
  },
  cancelText: { color: '#7F1D1D', fontWeight: '600', textAlign: 'center' },

  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },

  cancelBtn: {
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C0392B',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#C0392B', fontWeight: '700' },

  homeBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#C0392B',
    alignItems: 'center',
  },
  homeBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  btn: { backgroundColor: '#C0392B', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
});
