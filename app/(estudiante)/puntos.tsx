import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import puntosService, { Canje, Recompensa } from '../../services/puntos.service';

export default function PuntosScreen() {
  const router = useRouter();
  const [saldo, setSaldo] = useState(0);
  const [historial, setHistorial] = useState<any[]>([]);
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [canjes, setCanjes] = useState<Canje[]>([]);
  const [loading, setLoading] = useState(true);
  const [canjeandoId, setCanjeandoId] = useState<number | string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [saldoData, historialData, recompensasData, canjesData] =
        await Promise.all([
          puntosService.getSaldo(),
          puntosService.getHistorial(),
          puntosService.getRecompensas(),
          puntosService.getMisCanjes(),
        ]);
      setSaldo(saldoData.saldo);
      setHistorial(historialData);
      setRecompensas(recompensasData);
      setCanjes(canjesData);
    } catch (err) {
      console.warn('[puntos] error cargando', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { cargar(); }, [cargar]),
  );

  const onCanjear = async (r: Recompensa) => {
    if (saldo < r.puntos_requeridos) {
      Alert.alert('Puntos insuficientes', `Te faltan ${r.puntos_requeridos - saldo} puntos`);
      return;
    }
    setCanjeandoId(r.id);
    try {
      await puntosService.canjear(r.id);
      Alert.alert('¡Canje exitoso!', `Canjeaste "${r.nombre}". Puedes recogerlo en el local de Doña Pepa.`);
      cargar();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al canjear puntos';
      Alert.alert('Error', msg);
    } finally {
      setCanjeandoId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#C0392B" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Puntos</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.saldoBox}>
        <Text style={styles.saldoAmount}>{saldo}</Text>
        <Text style={styles.saldoLabel}>puntos disponibles</Text>
      </View>

      {recompensas.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Canjea tus puntos</Text>
          <FlatList
            data={recompensas.filter((r) => r.activo)}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View style={styles.recompensaCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recompensaName}>{item.nombre}</Text>
                  {item.descripcion && (
                    <Text style={styles.recompensaDesc}>{item.descripcion}</Text>
                  )}
                  <Text style={styles.recompensaCosto}>
                    {item.puntos_requeridos} puntos
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.canjearBtn,
                    saldo < item.puntos_requeridos && styles.canjearBtnDisabled,
                  ]}
                  onPress={() => onCanjear(item)}
                  disabled={canjeandoId === item.id}
                >
                  {canjeandoId === item.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.canjearBtnText}>Canjear</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No hay recompensas disponibles</Text>
            }
          />
        </>
      )}

      {canjes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Mis canjes</Text>
          <FlatList
            data={canjes}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.canjeItem}>
                <Text style={styles.canjeName}>{item.nombre || 'Canje'}</Text>
                <Text style={styles.canjePuntos}>-{item.puntos_gastados} pts</Text>
                <Text style={styles.canjeEstado}>{item.estado}</Text>
              </View>
            )}
          />
        </>
      )}

      {historial.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Historial de puntos</Text>
          <FlatList
            data={historial}
            keyExtractor={(h, i) => String(h.id || i)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.histItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histDesc}>{item.descripcion}</Text>
                  <Text style={styles.histDate}>
                    {new Date(item.created_at).toLocaleDateString('es-PE')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.histPuntos,
                    item.puntos > 0 ? styles.histGanados : styles.histGastados,
                  ]}
                >
                  {item.puntos > 0 ? `+${item.puntos}` : `${item.puntos}`}
                </Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backText: { color: '#C0392B', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },

  saldoBox: {
    alignItems: 'center', paddingVertical: 28,
    backgroundColor: '#FFF7ED', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16,
  },
  saldoAmount: { fontSize: 48, fontWeight: '800', color: '#C0392B' },
  saldoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginTop: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: '#1F2937',
    marginTop: 22, marginBottom: 12, paddingHorizontal: 16,
  },

  recompensaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  recompensaName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  recompensaDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  recompensaCosto: { fontSize: 13, fontWeight: '700', color: '#C0392B', marginTop: 6 },
  canjearBtn: {
    backgroundColor: '#C0392B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10,
  },
  canjearBtnDisabled: { backgroundColor: '#D1D5DB' },
  canjearBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  canjeItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12,
  },
  canjeName: { flex: 1, fontWeight: '700', color: '#1F2937', fontSize: 13 },
  canjePuntos: { fontWeight: '700', color: '#16A34A', marginRight: 8 },
  canjeEstado: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },

  histItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 8, padding: 12,
  },
  histDesc: { fontSize: 13, color: '#1F2937', fontWeight: '500' },
  histDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  histPuntos: { fontSize: 16, fontWeight: '800' },
  histGanados: { color: '#16A34A' },
  histGastados: { color: '#DC2626' },

  emptyText: { color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 20 },
});
