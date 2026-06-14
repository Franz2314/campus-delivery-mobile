/**
 * Pantalla de carrito para el estudiante.
 *
 * - Lista los productos con controles +/− y eliminar.
 * - Selector de pabellón (chips horizontales cargados desde GET /pabellones).
 * - Selector de hora programada (slots rápidos + opción de hora específica HH:MM).
 * - Al confirmar, navega a /pedido con pabellon_id y hora_programada por params.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useCart } from '../../hooks/useCart';
import menuService, { Pabellon } from '../../services/menu.service';

interface TimeSlot {
  label: string;
  minutes: number;
}

function getMaxPisos(maxPisos: number | undefined): number {
  return Math.max(1, maxPisos ?? 8);
}

const TIME_SLOTS: TimeSlot[] = [
  { label: 'Lo antes posible', minutes: 0 },
  { label: 'En 15 min', minutes: 15 },
  { label: 'En 30 min', minutes: 30 },
  { label: 'En 45 min', minutes: 45 },
  { label: 'En 1 hora', minutes: 60 },
];

const CUSTOM_INDEX = TIME_SLOTS.length; // slot para "Hora específica"

export default function CarritoScreen() {
  const router = useRouter();
  const { items, total, updateQuantity, removeItem, clear } = useCart();

  const [pabellones, setPabellones] = useState<Pabellon[]>([]);
  const [pabellonId, setPabellonId] = useState<number | string | null>(null);
  const [piso, setPiso] = useState(1);
  const [loadingPabs, setLoadingPabs] = useState(true);
  const [slotIndex, setSlotIndex] = useState(0);
  const [customHour, setCustomHour] = useState('');
  const [customMinute, setCustomMinute] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await menuService.listarPabellones();
        setPabellones(data);
        if (data.length > 0) setPabellonId(data[0].id);
      } catch (err) {
        console.warn('[carrito] error cargando pabellones', err);
      } finally {
        setLoadingPabs(false);
      }
    })();
  }, []);

  const calcularHoraProgramada = useCallback((): string | null => {
    const now = new Date();
    if (slotIndex < TIME_SLOTS.length) {
      now.setMinutes(now.getMinutes() + TIME_SLOTS[slotIndex].minutes);
      return now.toISOString();
    }
    // Hora específica
    const h = parseInt(customHour, 10);
    const m = parseInt(customMinute, 10);
    if (
      Number.isNaN(h) ||
      Number.isNaN(m) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59
    ) {
      return null;
    }
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1); // siguiente día
    }
    return target.toISOString();
  }, [slotIndex, customHour, customMinute]);

  const customHourValido = useMemo(() => {
    if (slotIndex !== CUSTOM_INDEX) return true;
    const h = parseInt(customHour, 10);
    const m = parseInt(customMinute, 10);
    return (
      !Number.isNaN(h) &&
      !Number.isNaN(m) &&
      h >= 0 &&
      h <= 23 &&
      m >= 0 &&
      m <= 59
    );
  }, [slotIndex, customHour, customMinute]);

  const onContinuar = () => {
    if (items.length === 0) {
      Alert.alert('Carrito vacío', 'Agrega productos antes de continuar.');
      return;
    }
    if (!pabellonId) {
      Alert.alert('Selecciona un pabellón', 'Elige dónde recibir tu pedido.');
      return;
    }
    if (!customHourValido) {
      Alert.alert('Hora inválida', 'Verifica la hora específica (HH:MM).');
      return;
    }
    const hora = calcularHoraProgramada();
    if (!hora) {
      Alert.alert('Hora inválida', 'No se pudo calcular la hora de entrega.');
      return;
    }
    router.push({
      pathname: '/(estudiante)/pedido',
      params: {
        pabellon_id: String(pabellonId),
        piso: String(piso),
        hora_programada: hora,
      },
    });
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={styles.emptySubtitle}>
          Agrega productos desde el catálogo
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(estudiante)/catalogo')}
        >
          <Text style={styles.btnText}>Ver catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tu pedido</Text>
        <TouchableOpacity onPress={clear}>
          <Text style={styles.clearText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      {items.map((item) => (
        <View key={item.producto_id} style={styles.item}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.nombre}</Text>
            <Text style={styles.itemBusiness}>{item.negocio_nombre}</Text>
            <Text style={styles.itemPrice}>S/ {item.precio.toFixed(2)}</Text>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.producto_id, item.cantidad - 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qty}>{item.cantidad}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(item.producto_id, item.cantidad + 1)}
              style={styles.qtyBtn}
            >
              <Text style={styles.qtyBtnText}>＋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeItem(item.producto_id)}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>S/ {total.toFixed(2)}</Text>
      </View>

      {/* Pabellón */}
      <Text style={styles.sectionTitle}>Pabellón de entrega</Text>
      {loadingPabs ? (
        <ActivityIndicator color="#C0392B" />
      ) : pabellones.length === 0 ? (
        <Text style={styles.helpText}>
          No hay pabellones disponibles por ahora.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {pabellones.map((p) => {
            const active = String(pabellonId) === String(p.id);
            return (
              <Pressable
                key={String(p.id)}
                onPress={() => { setPabellonId(p.id); setPiso(1); }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                  ]}
                >
                  {p.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Piso */}
      {pabellonId && (() => {
        const pab = pabellones.find((p) => String(p.id) === String(pabellonId));
        const maxPisos = getMaxPisos(pab?.max_pisos);
        return (
          <>
            <Text style={styles.sectionTitle}>Piso</Text>
            <View style={styles.pisoRow}>
              {Array.from({ length: maxPisos }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setPiso(n)}
                  style={[styles.pisoChip, piso === n && styles.pisoChipActive]}
                >
                  <Text style={[styles.pisoChipText, piso === n && styles.pisoChipTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      })()}

      {/* Hora */}
      <Text style={styles.sectionTitle}>Hora de entrega</Text>
      <View style={styles.slotsGrid}>
        {TIME_SLOTS.map((s, i) => {
          const active = slotIndex === i;
          return (
            <Pressable
              key={s.label}
              onPress={() => setSlotIndex(i)}
              style={[styles.slot, active && styles.slotActive]}
            >
              <Text
                style={[styles.slotText, active && styles.slotTextActive]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setSlotIndex(CUSTOM_INDEX)}
          style={[styles.slot, slotIndex === CUSTOM_INDEX && styles.slotActive]}
        >
          <Text
            style={[
              styles.slotText,
              slotIndex === CUSTOM_INDEX && styles.slotTextActive,
            ]}
          >
            Hora específica
          </Text>
        </Pressable>
      </View>

      {slotIndex === CUSTOM_INDEX && (
        <View style={styles.timeInputRow}>
          <TextInput
            style={styles.timeInput}
            placeholder="HH"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={2}
            value={customHour}
            onChangeText={setCustomHour}
          />
          <Text style={styles.timeSep}>:</Text>
          <TextInput
            style={styles.timeInput}
            placeholder="MM"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={2}
            value={customMinute}
            onChangeText={setCustomMinute}
          />
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={onContinuar} activeOpacity={0.85}>
        <Text style={styles.btnText}>Continuar al pago</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 18,
    marginBottom: 8,
  },
  clearText: { color: '#C0392B', fontWeight: '600', fontSize: 13 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  itemBusiness: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#C0392B', marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  qty: { minWidth: 26, textAlign: 'center', fontWeight: '700', color: '#1F2937' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  removeBtnText: { fontSize: 20, color: '#9CA3AF', fontWeight: '700' },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB',
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#C0392B' },

  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#F5F5F5', marginRight: 8,
  },
  chipActive: { backgroundColor: '#C0392B' },
  chipText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8,
    backgroundColor: '#F5F5F5', marginRight: 8, marginBottom: 8,
  },
  slotActive: { backgroundColor: '#FDEDEC', borderWidth: 1, borderColor: '#C0392B' },
  slotText: { color: '#374151', fontWeight: '600', fontSize: 12 },
  slotTextActive: { color: '#C0392B' },

  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeInput: {
    width: 64, textAlign: 'center', paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    fontSize: 18, fontWeight: '700', color: '#1F2937', backgroundColor: '#FAFAFA',
  },
  timeSep: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginHorizontal: 6 },

  pisoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pisoChip: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F5F5', marginRight: 8, marginBottom: 8,
  },
  pisoChipActive: { backgroundColor: '#C0392B' },
  pisoChipText: { color: '#374151', fontWeight: '700', fontSize: 14 },
  pisoChipTextActive: { color: '#FFFFFF' },

  helpText: { color: '#6B7280', fontSize: 12 },

  btn: {
    backgroundColor: '#C0392B', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 26,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
    backgroundColor: '#FFFFFF',
  },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 24 },
});
