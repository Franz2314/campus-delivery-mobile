/**
 * Badge con el estado actual de un pedido.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EstadoPedido } from '../services/pedidos.service';

interface Props {
  estado: EstadoPedido;
}

interface StatusStyle {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

const STATUS_MAP: Record<EstadoPedido, StatusStyle> = {
  pendiente: {
    label: 'Recibido',
    color: '#92400E',
    bg: '#FEF3C7',
    icon: '📝',
  },
  confirmado: {
    label: 'Confirmado',
    color: '#1E3A8A',
    bg: '#DBEAFE',
    icon: '✅',
  },
  en_preparacion: {
    label: 'En preparación',
    color: '#7C2D12',
    bg: '#FFEDD5',
    icon: '🍳',
  },
  en_camino: {
    label: 'En camino',
    color: '#5B21B6',
    bg: '#EDE9FE',
    icon: '🛵',
  },
  entregado: {
    label: 'Entregado',
    color: '#14532D',
    bg: '#DCFCE7',
    icon: '🎉',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#7F1D1D',
    bg: '#FEE2E2',
    icon: '❌',
  },
  rechazado: {
    label: 'Rechazado',
    color: '#7F1D1D',
    bg: '#FEE2E2',
    icon: '🚫',
  },
};

export default function OrderStatus({ estado }: Props) {
  const s = STATUS_MAP[estado];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={styles.icon}>{s.icon}</Text>
      <Text style={[styles.label, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 12,
  },
  icon: { fontSize: 14, marginRight: 6 },
  label: { fontSize: 13, fontWeight: '700' },
});
