/**
 * Pantalla de catálogo para el estudiante.
 *
 * - Saluda al usuario autenticado.
 * - Filtra productos por categoría (chips horizontales).
 * - Renderiza una grilla 2x de ProductCard.
 * - Header con badge del carrito + botón de logout.
 * - Pull-to-refresh + recarga al volver a la pantalla.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
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

export default function CatalogoScreen() {
  const { user, signOut } = useAuth();
  const { addItem, itemCount } = useCart();
  const router = useRouter();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoria, setCategoria] = useState<string>('Todos');

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

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Recargar al volver a la pantalla (p.ej. tras login)
  useFocusEffect(
    useCallback(() => {
      cargar(false);
    }, [cargar]),
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

  return (
    <View style={styles.container}>
      {/* Header */}
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

        <TouchableOpacity onPress={signOut} style={styles.logoutBtn} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Chips de categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map((c) => {
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
        })}
      </ScrollView>

      {/* Lista de productos */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#C0392B" size="large" />
        </View>
      ) : productos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>Sin productos</Text>
          <Text style={styles.emptySubtitle}>
            No encontramos productos en esta categoría
          </Text>
        </View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <ProductCard producto={item} onAdd={onAdd} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
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
    marginRight: 8,
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

  logoutBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  logoutText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },

  chipsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
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
