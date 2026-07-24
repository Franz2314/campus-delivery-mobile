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
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

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

export const title = 'Mis pedidos';
export default function NegocioPedidosScreen() {
  const router = useRouter();
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

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelMotive, setCancelMotive] = useState('');

  const onCancel = async (p: Pedido) => {
    if (!['pendiente', 'confirmado'].includes(p.estado)) return;
    if (cancelTarget !== String(p.id)) {
      setCancelTarget(String(p.id));
      setCancelMotive('');
      return;
    }
    try {
      await pedidosService.cancelar(p.id, cancelMotive || undefined);
      setCancelTarget(null);
      setCancelMotive('');
      cargar(false);
    } catch {
      Alert.alert('Error', 'No se pudo cancelar el pedido');
    }
  };

  const renderCard = (p: Pedido) => {
    const acciones = ACCIONES_POR_ESTADO[p.estado] ?? [];
    const horaTxt = new Date(p.hora_programada).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const isCancelSelected = cancelTarget === String(p.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Pedido #{p.id?.toString().slice(0, 8)}</Text>
            <Text style={styles.cardSubtitle}>
              {new Date(p.created_at).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {p.pabellon_nombre ? `  ·  ${p.pabellon_nombre}` : ''}
              {p.piso ? ` · Piso ${p.piso}` : ''}
            </Text>
          </View>
          <Text style={styles.cardTotal}>S/ {p.total.toFixed(2)}</Text>
        </View>

        <View style={styles.statusRow}>
          <OrderStatus estado={p.estado} />
          <Text style={styles.horaProgramada}>🕐 {horaTxt}</Text>
        </View>

        {/* Productos del pedido */}
        {p.detalles && p.detalles.length > 0 && (
          <View style={styles.detallesSection}>
            {p.detalles.map((d) => (
              <View key={String(d.producto_id)} style={styles.detalleRow}>
                <Text style={styles.detalleCantidad}>{d.cantidad}×</Text>
                <Text style={styles.detalleNombre} numberOfLines={1}>{d.nombre}</Text>
                <Text style={styles.detalleSubtotal}>S/ {d.subtotal.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Código de recogida */}
        {p.codigo_recogida && (
          <View style={styles.pickupBox}>
            <Text style={styles.pickupLabel}>🔑 Código de recogida</Text>
            <Text style={styles.pickupCode}>{p.codigo_recogida}</Text>
            <Text style={styles.pickupHint}>Entrégaselo al repartidor para confirmar la recogida</Text>
          </View>
        )}

        {p.comprobante_url && p.estado === 'pendiente' && !p.comprobante_verificado && (
          <View style={styles.comprobanteSection}>
            <Image
              source={{ uri: p.comprobante_url }}
              style={styles.comprobanteImage}
              resizeMode="contain"
            />
            <Text style={styles.comprobanteHint}>El comprobante se verificará al confirmar el pedido</Text>
          </View>
        )}

        {p.comprobante_url && !['pendiente'].includes(p.estado) && (
          <View style={styles.comprobanteSection}>
            <Image
              source={{ uri: p.comprobante_url }}
              style={styles.comprobanteImageSmall}
              resizeMode="contain"
            />
            {p.comprobante_verificado && (
              <Text style={styles.verifiedText}>✅ Verificado</Text>
            )}
            {p.comprobante_rechazado && (
              <Text style={styles.rejectedText}>❌ Rechazado</Text>
            )}
          </View>
        )}

        {p.estado === 'cancelado' && p.motivo_cancelacion && (
          <View style={styles.cancelReason}>
            <Text style={styles.cancelReasonText}>
              Cancelado: {p.motivo_cancelacion}
            </Text>
          </View>
        )}

        {isCancelSelected && (
          <TextInput
            style={styles.cancelInput}
            placeholder="Motivo de cancelación (opcional)"
            placeholderTextColor="#9CA3AF"
            value={cancelMotive}
            onChangeText={setCancelMotive}
          />
        )}

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
            {['pendiente', 'confirmado'].includes(p.estado) && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => onCancel(p)}
              >
                <Text style={styles.cancelBtnText}>
                  {cancelTarget === String(p.id) ? 'Confirmar cancelación' : 'Cancelar pedido'}
                </Text>
              </TouchableOpacity>
            )}
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
        <View style={styles.headerLinks}>
          <TouchableOpacity
            style={styles.headerTab}
            onPress={() => router.push('/(negocio)/pedidos')}
          >
            <Text style={[styles.headerTabText, styles.headerTabActive]}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerTab}
            onPress={() => router.push('/(negocio)/menu')}
          >
            <Text style={styles.headerTabText}>Menú</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
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
  headerLinks: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTab: {},
  headerTabText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  headerTabActive: { color: '#C0392B', fontWeight: '800' },

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

  comprobanteSection: { marginTop: 12 },
  comprobanteImage: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#F3F4F6' },
  comprobanteImageSmall: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#F3F4F6' },
  comprobanteHint: { color: '#6B7280', fontSize: 11, marginTop: 4, textAlign: 'center' },
  comprobanteActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  verifyBtn: {
    flex: 1, backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 10,
    alignItems: 'center',
  },
  verifyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    flex: 1, backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  verifiedText: { color: '#16A34A', fontWeight: '700', marginTop: 6, fontSize: 12 },
  rejectedText: { color: '#DC2626', fontWeight: '700', marginTop: 6, fontSize: 12 },
  cancelReason: {
    marginTop: 8, backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10,
  },
  cancelReasonText: { color: '#7F1D1D', fontWeight: '600', fontSize: 12 },
  cancelInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 10, fontSize: 13, color: '#1F2937', marginTop: 8,
  },
  cancelBtn: {
    marginTop: 4, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#C0392B', alignItems: 'center',
  },
  cancelBtnText: { color: '#C0392B', fontWeight: '700', fontSize: 13 },

  terminalRow: {
    marginTop: 12, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  terminalText: { color: '#6B7280', fontSize: 12, fontWeight: '600' },

  detallesSection: {
    marginTop: 10, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10,
  },
  detalleRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 4,
  },
  detalleCantidad: {
    fontSize: 13, fontWeight: '700', color: '#C0392B', width: 28,
  },
  detalleNombre: {
    flex: 1, fontSize: 13, color: '#1F2937', fontWeight: '500',
  },
  detalleSubtotal: {
    fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 8,
  },
  pickupBox: {
    marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12,
    alignItems: 'center',
  },
  pickupLabel: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  pickupCode: {
    fontSize: 28, fontWeight: '900', color: '#C0392B',
    letterSpacing: 6, marginTop: 4,
  },
  pickupHint: { fontSize: 11, color: '#92400E', marginTop: 4, textAlign: 'center' },

  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
