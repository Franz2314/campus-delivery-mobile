import React, { useCallback, useEffect, useState } from 'react';
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
import { useCart } from '../../hooks/useCart';
import menuService, { Menu, MenuItem } from '../../services/menu.service';

const TIPO_ICON: Record<string, string> = {
  entrada: '🥗',
  sopa: '🍜',
  plato_fuerte: '🍛',
  postre: '🍮',
  bebida: '🥤',
};

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  sopa: 'Sopa',
  plato_fuerte: 'Plato fuerte',
  postre: 'Postre',
  bebida: 'Bebida',
};

export const title = 'Menú del Día';
export default function MenuDelDiaScreen() {
  const { user, signOut } = useAuth();
  const { addItem, itemCount } = useCart();
  const router = useRouter();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const cargar = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await menuService.listarMenus();
      setMenus(data.filter((m) => m.disponible));
    } catch (err) {
      console.warn('[menu-del-dia] error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useFocusEffect(useCallback(() => { cargar(false); }, [cargar]));

  const renderItem = (item: MenuItem) => (
    <View key={item.id} style={styles.menuItemRow}>
      <Text style={styles.menuItemIcon}>{TIPO_ICON[item.tipo] || '🍽️'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuItemTipo}>{TIPO_LABEL[item.tipo] || item.tipo}</Text>
        <Text style={styles.menuItemNombre}>{item.nombre}</Text>
      </View>
    </View>
  );

  const renderMenuCard = ({ item }: { item: Menu }) => {
    const expanded = expandedId === item.id;
    return (
      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuHeader}
          onPress={() => setExpandedId(expanded ? null : item.id)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.menuName}>{item.nombre}</Text>
            {item.descripcion && (
              <Text style={styles.menuDesc}>{item.descripcion}</Text>
            )}
          </View>
          <Text style={styles.menuPrice}>S/ {item.precio.toFixed(2)}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.menuItems}>
            {item.items.map(renderItem)}
            <TouchableOpacity
              style={styles.addMenuBtn}
              onPress={() => {
                addItem({
                  producto_id: item.id,
                  nombre: item.nombre,
                  precio: item.precio,
                  imagen_url: undefined,
                  negocio_id: item.negocio_id,
                  negocio_nombre: 'Menú del Día',
                });
                router.push('/(estudiante)/carrito');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.addMenuBtnText}>Agregar al carrito</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const firstName = user?.nombre?.split(' ')[0] ?? 'estudiante';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
          <Text style={styles.subtitle}>Menú del Día — solo por hoy</Text>
        </View>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push('/(estudiante)/carrito')}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.volverBtn}
          onPress={() => router.push('/(estudiante)/catalogo')}
        >
          <Text style={styles.volverText}>Catálogo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : menus.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Sin menús hoy</Text>
          <Text style={styles.emptySubtitle}>
            No hay menú del día disponible por ahora
          </Text>
        </View>
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderMenuCard}
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
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  greeting: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 12, color: '#C0392B', marginTop: 2, fontWeight: '600' },
  cartBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center', marginRight: 6, position: 'relative',
  },
  cartIcon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20,
    borderRadius: 10, backgroundColor: '#C0392B', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  volverBtn: { marginRight: 8 },
  volverText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  menuCard: {
    backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
  },
  menuName: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  menuDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 16 },
  menuPrice: { fontSize: 17, fontWeight: '800', color: '#C0392B', marginLeft: 12 },

  menuItems: {
    borderTopWidth: 1, borderTopColor: '#EEEEEE', paddingHorizontal: 14, paddingVertical: 10,
  },
  menuItemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  menuItemIcon: { fontSize: 18, marginRight: 10 },
  menuItemTipo: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  menuItemNombre: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginTop: 1 },

  addMenuBtn: {
    marginTop: 10, backgroundColor: '#C0392B', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  addMenuBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  emptyEmoji: { fontSize: 50, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
