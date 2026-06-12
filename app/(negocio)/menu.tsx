/**
 * Pantalla de gestión de menú para el negocio.
 *
 * - Lista los productos del negocio autenticado (filtra por negocio_id).
 * - Cada producto tiene switch de disponibilidad (rápido toggle).
 * - Botón "Editar" abre un modal para cambiar nombre, precio, categoría.
 * - Botón "+ Nuevo producto" abre el mismo modal en modo creación.
 * - Pull-to-refresh + recarga al volver a la pantalla.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import menuService, {
  Producto,
  CrearProductoPayload,
  ActualizarProductoPayload,
} from '../../services/menu.service';

const CATEGORIAS_SUGERIDAS = ['Snacks', 'Almuerzos', 'Bebidas', 'Postres', 'Combos'];

interface FormState {
  nombre: string;
  precio: string;
  categoria: string;
  descripcion: string;
  disponible: boolean;
}

const FORM_INICIAL: FormState = {
  nombre: '',
  precio: '',
  categoria: 'Snacks',
  descripcion: '',
  disponible: true,
};

export default function NegocioMenuScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [saving, setSaving] = useState(false);

  const negocioId = useMemo(() => {
    // El user del negocio debe tener un negocio_id; si no, usamos el id como fallback
    return (user as any)?.negocio_id ?? user?.id;
  }, [user]);

  const cargar = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        const data = await menuService.listarProductos({ negocio_id: negocioId });
        setProductos(data);
      } catch (err) {
        console.warn('[negocio/menu] error cargando', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [negocioId],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      cargar(false);
    }, [cargar]),
  );

  // ── Acciones ───────────────────────────────────────────────────────────
  const toggleDisponible = async (p: Producto) => {
    try {
      await menuService.actualizarProducto(p.id, { disponible: !p.disponible });
      setProductos((prev) =>
        prev.map((x) =>
          x.id === p.id ? { ...x, disponible: !p.disponible } : x,
        ),
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la disponibilidad.');
    }
  };

  const openCrear = () => {
    setEditTarget(null);
    setForm(FORM_INICIAL);
    setModalVisible(true);
  };

  const openEditar = (p: Producto) => {
    setEditTarget(p);
    setForm({
      nombre: p.nombre,
      precio: String(p.precio),
      categoria: p.categoria,
      descripcion: p.descripcion ?? '',
      disponible: p.disponible,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditTarget(null);
    setForm(FORM_INICIAL);
  };

  const guardar = async () => {
    const nombre = form.nombre.trim();
    const precio = parseFloat(form.precio);
    if (nombre.length < 2) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre de al menos 2 caracteres.');
      return;
    }
    if (Number.isNaN(precio) || precio <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio mayor a 0.');
      return;
    }
    if (!form.categoria.trim()) {
      Alert.alert('Categoría requerida', 'Selecciona o escribe una categoría.');
      return;
    }

    setSaving(true);
    try {
      if (editTarget) {
        const payload: ActualizarProductoPayload = {
          nombre,
          precio,
          categoria: form.categoria.trim(),
          descripcion: form.descripcion.trim() || undefined,
          disponible: form.disponible,
        };
        await menuService.actualizarProducto(editTarget.id, payload);
      } else {
        const payload: CrearProductoPayload = {
          nombre,
          precio,
          categoria: form.categoria.trim(),
          descripcion: form.descripcion.trim() || undefined,
          disponible: form.disponible,
          negocio_id: negocioId!,
        };
        await menuService.crearProducto(payload);
      }
      closeModal();
      cargar(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        'No se pudo guardar el producto. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = (p: Producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Seguro que quieres eliminar "${p.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuService.eliminarProducto(p.id);
              setProductos((prev) => prev.filter((x) => x.id !== p.id));
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar el producto.');
            }
          },
        },
      ],
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            Hola, {user?.nombre?.split(' ')[0] ?? 'negocio'} 🏪
          </Text>
          <Text style={styles.subtitle}>Gestiona tu menú</Text>
        </View>
        <TouchableOpacity onPress={signOut} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openCrear} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>＋ Nuevo producto</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : productos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🍱</Text>
          <Text style={styles.emptyTitle}>Sin productos</Text>
          <Text style={styles.emptySubtitle}>
            Agrega tu primer producto para empezar a recibir pedidos
          </Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.nombre}</Text>
                <Text style={styles.cardCategory}>{item.categoria}</Text>
                <Text style={styles.cardPrice}>S/ {item.precio.toFixed(2)}</Text>
              </View>
              <View style={styles.cardActions}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>
                    {item.disponible ? 'Disponible' : 'Agotado'}
                  </Text>
                  <Switch
                    value={item.disponible}
                    onValueChange={() => toggleDisponible(item)}
                    trackColor={{ false: '#D1D5DB', true: '#F5B7B1' }}
                    thumbColor={item.disponible ? '#C0392B' : '#9CA3AF'}
                  />
                </View>
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditar(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => eliminar(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.deleteBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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

      {/* Modal Crear / Editar */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editTarget ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Café con leche"
                placeholderTextColor="#9CA3AF"
                value={form.nombre}
                onChangeText={(v) => setForm({ ...form, nombre: v })}
              />

              <Text style={styles.label}>Precio (S/)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                value={form.precio}
                onChangeText={(v) => setForm({ ...form, precio: v })}
              />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.chipsRow}>
                {CATEGORIAS_SUGERIDAS.map((c) => {
                  const active = form.categoria === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setForm({ ...form, categoria: c })}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="O escribe una categoría"
                placeholderTextColor="#9CA3AF"
                value={form.categoria}
                onChangeText={(v) => setForm({ ...form, categoria: v })}
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                placeholder="Detalle del producto"
                placeholderTextColor="#9CA3AF"
                multiline
                value={form.descripcion}
                onChangeText={(v) => setForm({ ...form, descripcion: v })}
              />

              <View style={styles.toggleRowModal}>
                <Text style={styles.toggleLabel}>
                  {form.disponible ? 'Disponible para la venta' : 'No disponible'}
                </Text>
                <Switch
                  value={form.disponible}
                  onValueChange={(v) => setForm({ ...form, disponible: v })}
                  trackColor={{ false: '#D1D5DB', true: '#F5B7B1' }}
                  thumbColor={form.disponible ? '#C0392B' : '#9CA3AF'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={closeModal}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, saving && { opacity: 0.7 }]}
                onPress={guardar}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  addBtn: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 12,
    backgroundColor: '#C0392B', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cardCategory: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  cardPrice: { fontSize: 14, fontWeight: '800', color: '#C0392B', marginTop: 4 },

  cardActions: { alignItems: 'flex-end' },
  toggleRow: { alignItems: 'center', marginBottom: 8 },
  toggleLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 6 },
  editBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  editBtnText: { color: '#3730A3', fontSize: 11, fontWeight: '700' },
  deleteBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  deleteBtnText: { color: '#7F1D1D', fontSize: 11, fontWeight: '700' },

  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 24, maxHeight: '88%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2,
    alignSelf: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 12 },

  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#1F2937', backgroundColor: '#FAFAFA',
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#F5F5F5', marginRight: 6, marginBottom: 6,
  },
  chipActive: { backgroundColor: '#FDEDEC', borderWidth: 1, borderColor: '#C0392B' },
  chipText: { color: '#374151', fontWeight: '600', fontSize: 11 },
  chipTextActive: { color: '#C0392B' },

  toggleRowModal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingVertical: 10, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontWeight: '600' },
  modalConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    backgroundColor: '#C0392B', alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
