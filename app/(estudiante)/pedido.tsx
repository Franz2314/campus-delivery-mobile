/**
 * Pantalla de confirmación + subida de comprobante.
 *
 * - Recibe pabellon_id y hora_programada por search params.
 * - Muestra resumen del pedido (items del cart + total).
 * - Botón "Subir comprobante" abre el PaymentModal.
 * - Al confirmar, llama POST /pedidos, vacía el carrito
 *   y navega a /seguimiento con el id del pedido creado.
 */
import React, { useCallback, useState } from 'react';
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

import { useCart } from '../../hooks/useCart';
import pedidosService from '../../services/pedidos.service';
import PaymentModal from '../../components/PaymentModal';

export default function PedidoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pabellon_id: string;
    hora_programada: string;
  }>();
  const { items, total, clear } = useCart();

  const [comprobanteUri, setComprobanteUri] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onComprobanteConfirm = useCallback((uri: string) => {
    setComprobanteUri(uri);
    setModalVisible(false);
  }, []);

  const onConfirmar = async () => {
    if (!comprobanteUri) {
      Alert.alert(
        'Falta comprobante',
        'Sube la foto de tu comprobante Yape/Plin antes de enviar el pedido.',
      );
      return;
    }
    if (!params.pabellon_id || !params.hora_programada) {
      Alert.alert('Datos faltantes', 'Faltan datos del pedido. Vuelve al carrito.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de enviar.');
      return;
    }
    setSubmitting(true);
    try {
      const pedido = await pedidosService.crear({
        pabellon_id: params.pabellon_id,
        hora_programada: params.hora_programada,
        items: items.map((i) => ({
          producto_id: i.producto_id,
          cantidad: i.cantidad,
        })),
        comprobante_url: comprobanteUri,
      });
      clear();
      router.replace({
        pathname: '/(estudiante)/seguimiento',
        params: { id: String(pedido.id) },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'No se pudo crear el pedido. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>No hay productos</Text>
        <Text style={styles.emptySubtitle}>
          Vuelve al catálogo para armar tu pedido
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(estudiante)/catalogo')}
        >
          <Text style={styles.btnText}>Ir al catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <Text style={styles.h1}>Confirma tu pedido</Text>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total a pagar</Text>
          <Text style={styles.totalAmount}>S/ {total.toFixed(2)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Resumen</Text>
        {items.map((item) => (
          <View key={item.producto_id} style={styles.itemRow}>
            <Text style={styles.itemQty}>{item.cantidad}×</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.nombre}
            </Text>
            <Text style={styles.itemSubtotal}>
              S/ {(item.precio * item.cantidad).toFixed(2)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Comprobante de pago (Yape / Plin)</Text>
        <Text style={styles.helpText}>
          Sube la captura de tu transferencia. Verificaremos el pago antes de
          preparar tu pedido.
        </Text>

        {comprobanteUri ? (
          <View style={styles.comprobanteBox}>
            <Text style={styles.comprobanteText} numberOfLines={1}>
              ✅ Imagen adjuntada
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.linkText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadIcon}>📎</Text>
            <Text style={styles.uploadText}>Subir comprobante</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.7 }]}
          onPress={onConfirmar}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>Enviar pedido</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <PaymentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={onComprobanteConfirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  h1: { fontSize: 22, fontWeight: '800', color: '#1F2937' },

  totalBox: {
    backgroundColor: '#FDEDEC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  totalLabel: { fontSize: 12, color: '#7F1D1D', fontWeight: '600' },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#C0392B',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 18,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemQty: { width: 32, fontWeight: '700', color: '#6B7280' },
  itemName: { flex: 1, color: '#1F2937', fontSize: 14 },
  itemSubtotal: { color: '#1F2937', fontWeight: '700', fontSize: 14 },

  helpText: { color: '#6B7280', fontSize: 12, marginBottom: 12 },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C0392B',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    backgroundColor: '#FFF7F6',
  },
  uploadIcon: { fontSize: 22, marginRight: 8 },
  uploadText: { color: '#C0392B', fontWeight: '700', fontSize: 14 },

  comprobanteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  comprobanteText: { color: '#14532D', fontWeight: '600', flex: 1 },
  linkText: { color: '#C0392B', fontWeight: '700' },

  btn: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  emptySubtitle: {
    fontSize: 14, color: '#6B7280',
    marginTop: 4, marginBottom: 24, textAlign: 'center',
  },
});
