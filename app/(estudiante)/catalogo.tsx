import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import menuService, { Producto } from '../../services/menu.service';
import ProductCard from '../../components/ProductCard';

const CATEGORIES = ['Todos', 'Snacks', 'Almuerzos', 'Bebidas', 'Postres'];

export const title = 'Catálogo';
export default function CatalogoScreen() {
  const { user, signOut } = useAuth();
  const { addItem, itemCount } = useCart();
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoria, setCategoria] = useState<string>('Todos');
  const chipScrollRef = useRef<FlatList>(null);

  const cargar = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        const data = await menuService.listarProductos(
          categoria === 'Todos' ? {} : { categoria },
        );
        setProductos(data);
      } catch (err) {
        console.warn('[catalogo] error cargando productos', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoria],
  );

  useEffect(() => { cargar(); }, [cargar]);

  useFocusEffect(
    useCallback(() => { cargar(false); }, [cargar]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargar(false);
  }, [cargar]);

  const onAdd = useCallback(
    (p: Producto) => {
      addItem({
        producto_id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        imagen_url: p.imagen_url,
        negocio_id: p.negocio_id,
        negocio_nombre: p.negocio_nombre,
      });
    },
    [addItem],
  );

  const firstName = user?.nombre?.split(' ')[0] ?? 'estudiante';

  const renderChip = (c: string, i: number) => {
    const active = categoria === c;
    return (
      <TouchableOpacity
        key={c}
        onPress={() => setCategoria(c)}
        style={[styles.chip, active && styles.chipActive]}
        activeOpacity={0.85}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {c}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: Producto }) => (
    <ProductCard producto={item} onAdd={onAdd} />
  );

  const ListHeader = () => (
    <View style={styles.chipsContainer}>
      {CATEGORIES.map(renderChip)}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Header firstName={firstName} itemCount={itemCount} router={router} signOut={signOut} />
        <ListHeader />
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header firstName={firstName} itemCount={itemCount} router={router} signOut={signOut} />
      <FlatList
        data={productos}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        renderItem={renderProduct}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>Sin productos</Text>
            <Text style={styles.emptySubtitle}>
              No encontramos productos en esta categoría
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#C0392B"
            colors={['#C0392B']}
          />
        }
      />
    </View>
  );
}

function Header({ firstName, itemCount, router, signOut }: any) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
        <Text style={styles.subtitle}>¿Qué te llevas hoy?</Text>
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
        style={styles.menuBtn}
        onPress={() => router.push('/(estudiante)/menu-del-dia')}
      >
        <Text style={styles.menuBtnIcon}>📋</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.puntosBtn}
        onPress={() => router.push('/(estudiante)/puntos')}
      >
        <Text style={styles.puntosIcon}>⭐</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginRight: 8 }}
        onPress={() => router.push('/(estudiante)/pedidos')}
      >
        <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Pedidos</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={signOut} style={styles.logoutBtn} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  greeting: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    position: 'relative',
  },
  cartIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  menuBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F0FFF4', alignItems: 'center',
    justifyContent: 'center', marginRight: 6,
  },
  menuBtnIcon: { fontSize: 18 },
  puntosBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  puntosIcon: { fontSize: 20 },

  logoutBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
  },
  chipActive: { backgroundColor: '#C0392B' },
  chipText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },

  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  gridContent: { paddingHorizontal: 16, paddingBottom: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
