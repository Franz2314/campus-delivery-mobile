/**
 * Tarjeta de producto para el catálogo.
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Producto } from '../services/menu.service';

interface Props {
  producto: Producto;
  onAdd: (producto: Producto) => void;
}

export default function ProductCard({ producto, onAdd }: Props) {
  const agotado = !producto.disponible;

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {producto.imagen_url ? (
          <Image
            source={{ uri: producto.imagen_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderEmoji}>🍔</Text>
          </View>
        )}
        {agotado && (
          <View style={styles.badgeAgotado}>
            <Text style={styles.badgeAgotadoText}>Agotado</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {producto.nombre}
        </Text>
        <Text style={styles.business} numberOfLines={1}>
          {producto.negocio_nombre}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>S/ {producto.precio.toFixed(2)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, agotado && styles.addBtnDisabled]}
            onPress={() => onAdd(producto)}
            disabled={agotado}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  imageContainer: {
    aspectRatio: 1.4,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 40 },
  badgeAgotado: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAgotadoText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  body: { padding: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  business: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: { fontSize: 15, fontWeight: '800', color: '#C0392B' },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#C0392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: '#9CA3AF' },
  addBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 20 },
});
