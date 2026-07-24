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
import menuService, { Menu, MenuItem } from '../../services/menu.service';

const TIPOS_ITEM = ['entrada', 'sopa', 'plato_fuerte', 'postre', 'bebida'];
const TIPO_ICON: Record<string, string> = {
  entrada: '🥗', sopa: '🍜', plato_fuerte: '🍛', postre: '🍮', bebida: '🥤',
};

interface MenuForm {
  nombre: string;
  descripcion: string;
  precio: string;
  disponible: boolean;
}

const FORM_INICIAL: MenuForm = { nombre: '', descripcion: '', precio: '', disponible: true };

export const title = 'Menús del Día';
export default function GestionMenusScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Menu | null>(null);
  const [form, setForm] = useState<MenuForm>(FORM_INICIAL);
  const [saving, setSaving] = useState(false);

  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [itemMenuId, setItemMenuId] = useState<string | number | null>(null);
  const [editItemTarget, setEditItemTarget] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({ tipo: 'entrada' as string, nombre: '', descripcion: '' });

  const cargar = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await menuService.listarMenus();
      setMenus(data);
    } catch (err) {
      console.warn('[gestion-menus] error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useFocusEffect(useCallback(() => { cargar(false); }, [cargar]));

  const toggleDisponible = async (m: Menu) => {
    try {
      await menuService.actualizarMenu(m.id, { disponible: !m.disponible });
      setMenus((prev) => prev.map((x) => x.id === m.id ? { ...x, disponible: !m.disponible } : x));
    } catch {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const openCrear = () => {
    setEditTarget(null);
    setForm(FORM_INICIAL);
    setModalVisible(true);
  };

  const openEditar = (m: Menu) => {
    setEditTarget(m);
    setForm({ nombre: m.nombre, descripcion: m.descripcion ?? '', precio: String(m.precio), disponible: m.disponible });
    setModalVisible(true);
  };

  const guardar = async () => {
    const nombre = form.nombre.trim();
    const precio = parseFloat(form.precio);
    if (nombre.length < 2) { Alert.alert('Nombre requerido'); return; }
    if (Number.isNaN(precio) || precio <= 0) { Alert.alert('Precio inválido'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await menuService.actualizarMenu(editTarget.id, { nombre, descripcion: form.descripcion.trim() || undefined, precio, disponible: form.disponible });
      } else {
        await menuService.crearMenu({ nombre, descripcion: form.descripcion.trim() || undefined, precio });
      }
      setModalVisible(false);
      cargar(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const eliminar = (m: Menu) => {
    Alert.alert('Eliminar menú', `¿Seguro que quieres eliminar "${m.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await menuService.eliminarMenu(m.id);
          setMenus((prev) => prev.filter((x) => x.id !== m.id));
        } catch { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  };

  const openAddItem = (menuId: string | number) => {
    setItemMenuId(menuId);
    setEditItemTarget(null);
    setItemForm({ tipo: 'entrada', nombre: '', descripcion: '' });
    setItemModalVisible(true);
  };

  const openEditItem = (item: MenuItem, menuId: string | number) => {
    setItemMenuId(menuId);
    setEditItemTarget(item);
    setItemForm({ tipo: item.tipo, nombre: item.nombre, descripcion: item.descripcion ?? '' });
    setItemModalVisible(true);
  };

  const guardarItem = async () => {
    if (!itemForm.nombre.trim()) { Alert.alert('Nombre requerido'); return; }
    setSaving(true);
    try {
      if (editItemTarget) {
        await menuService.actualizarMenuItem(editItemTarget.id, { tipo: itemForm.tipo, nombre: itemForm.nombre.trim(), descripcion: itemForm.descripcion.trim() || undefined });
      } else if (itemMenuId) {
        await menuService.agregarMenuItem(itemMenuId, { tipo: itemForm.tipo, nombre: itemForm.nombre.trim(), descripcion: itemForm.descripcion.trim() || undefined });
      }
      setItemModalVisible(false);
      cargar(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const eliminarItem = (item: MenuItem) => {
    Alert.alert('Eliminar item', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await menuService.eliminarMenuItem(item.id);
          cargar(false);
        } catch { Alert.alert('Error'); }
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0] ?? 'negocio'} 🏪</Text>
          <Text style={styles.subtitle}>Gestiona tus Menús del Día</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => router.push('/(negocio)/menu')}>
            <Text style={styles.linkText}>Productos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(negocio)/pedidos')}>
            <Text style={styles.linkText}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openCrear} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>＋ Nuevo menú</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#C0392B" size="large" /></View>
      ) : menus.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Sin menús</Text>
          <Text style={styles.emptySubtitle}>Crea tu primer menú del día</Text>
        </View>
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={styles.menuCard}>
              <View style={styles.menuCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuName}>{item.nombre}</Text>
                  {item.descripcion && <Text style={styles.menuDesc}>{item.descripcion}</Text>}
                  <Text style={styles.menuPrice}>S/ {item.precio.toFixed(2)}</Text>
                </View>
                <View style={styles.toggleCol}>
                  <Text style={styles.toggleLabel}>{item.disponible ? 'Disponible' : 'Agotado'}</Text>
                  <Switch value={item.disponible} onValueChange={() => toggleDisponible(item)}
                    trackColor={{ false: '#D1D5DB', true: '#F5B7B1' }} thumbColor={item.disponible ? '#C0392B' : '#9CA3AF'} />
                </View>
              </View>

              {item.items && item.items.length > 0 && (
                <View style={styles.itemsSection}>
                  {item.items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <Text style={styles.itemIcon}>{TIPO_ICON[it.tipo] || '🍽️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTipo}>{it.tipo}</Text>
                        <Text style={styles.itemNombre}>{it.nombre}</Text>
                      </View>
                      <TouchableOpacity onPress={() => openEditItem(it, item.id)} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => eliminarItem(it)} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openAddItem(item.id)}>
                  <Text style={styles.actionBtnText}>＋ Item</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditar(item)}>
                  <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => eliminar(item)}>
                  <Text style={[styles.actionBtnText, { color: '#7F1D1D' }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(false); }}
              tintColor="#C0392B" colors={['#C0392B']} />
          }
        />
      )}

      {/* Modal menú */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editTarget ? 'Editar menú' : 'Nuevo menú'}</Text>
            <ScrollView>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} placeholder="Ej. Menú Universitario" placeholderTextColor="#9CA3AF"
                value={form.nombre} onChangeText={(v) => setForm({ ...form, nombre: v })} />
              <Text style={styles.label}>Descripción</Text>
              <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Describe el menú"
                placeholderTextColor="#9CA3AF" multiline value={form.descripcion}
                onChangeText={(v) => setForm({ ...form, descripcion: v })} />
              <Text style={styles.label}>Precio (S/)</Text>
              <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad" value={form.precio} onChangeText={(v) => setForm({ ...form, precio: v })} />
              <View style={styles.toggleRowModal}>
                <Text style={{ fontWeight: '600' }}>{form.disponible ? 'Disponible' : 'No disponible'}</Text>
                <Switch value={form.disponible} onValueChange={(v) => setForm({ ...form, disponible: v })}
                  trackColor={{ false: '#D1D5DB', true: '#F5B7B1' }} thumbColor={form.disponible ? '#C0392B' : '#9CA3AF'} />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, saving && { opacity: 0.7 }]} onPress={guardar} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal item */}
      <Modal visible={itemModalVisible} animationType="slide" transparent onRequestClose={() => setItemModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editItemTarget ? 'Editar item' : 'Nuevo item'}</Text>
            <ScrollView>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.chipsRow}>
                {TIPOS_ITEM.map((t) => (
                  <Pressable key={t} onPress={() => setItemForm({ ...itemForm, tipo: t })}
                    style={[styles.chip, itemForm.tipo === t && styles.chipActive]}>
                    <Text style={[styles.chipText, itemForm.tipo === t && styles.chipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Nombre</Text>
              <TextInput style={styles.input} placeholder="Ej. Arroz con pollo" placeholderTextColor="#9CA3AF"
                value={itemForm.nombre} onChangeText={(v) => setItemForm({ ...itemForm, nombre: v })} />
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Detalle"
                placeholderTextColor="#9CA3AF" multiline value={itemForm.descripcion}
                onChangeText={(v) => setItemForm({ ...itemForm, descripcion: v })} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setItemModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, saving && { opacity: 0.7 }]} onPress={guardarItem} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalConfirmText}>Guardar</Text>}
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
  subtitle: { fontSize: 12, color: '#C0392B', marginTop: 2, fontWeight: '600' },
  linkText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  addBtn: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 12,
    backgroundColor: '#C0392B', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  menuCard: {
    backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE',
    padding: 12,
  },
  menuCardHeader: { flexDirection: 'row', alignItems: 'center' },
  menuName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  menuDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  menuPrice: { fontSize: 14, fontWeight: '800', color: '#C0392B', marginTop: 4 },
  toggleCol: { alignItems: 'center', marginLeft: 8 },
  toggleLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4, fontWeight: '600' },

  itemsSection: { borderTopWidth: 1, borderTopColor: '#EEEEEE', marginTop: 10, paddingTop: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  itemIcon: { fontSize: 16, marginRight: 8 },
  itemTipo: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  itemNombre: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginTop: 1 },
  smallBtn: { padding: 4, marginLeft: 4 },
  smallBtnText: { fontSize: 14 },

  menuActions: { flexDirection: 'row', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingTop: 8 },
  actionBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  actionBtnText: { color: '#3730A3', fontSize: 11, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },

  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 24, maxHeight: '88%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1F2937', backgroundColor: '#FAFAFA',
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
    marginTop: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  modalCancelText: { color: '#374151', fontWeight: '600' },
  modalConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#C0392B', alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
