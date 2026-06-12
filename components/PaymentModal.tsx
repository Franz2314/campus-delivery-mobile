/**
 * Modal para subir el comprobante de pago (Yape / Plin).
 * Solo implementación cliente: selección desde galería o cámara.
 * La URI resultante se envía al backend en el campo `comprobante_url`.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (uri: string) => void;
}

export default function PaymentModal({ visible, onClose, onConfirm }: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setUri(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const pickFromGallery = useCallback(async () => {
    setBusy(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Habilita el acceso a tu galería en ajustes.',
        );
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!r.canceled && r.assets[0]) {
        setUri(r.assets[0].uri);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    setBusy(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Habilita el acceso a la cámara en ajustes.',
        );
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      if (!r.canceled && r.assets[0]) {
        setUri(r.assets[0].uri);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (uri) {
      onConfirm(uri);
      reset();
    }
  }, [uri, onConfirm, reset]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Comprobante de pago</Text>
          <Text style={styles.sub}>
            Sube la captura de tu Yape o Plin. Verificaremos el pago antes
            de preparar tu pedido.
          </Text>

          {uri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri }} style={styles.preview} />
              <TouchableOpacity onPress={() => setUri(null)}>
                <Text style={styles.linkText}>Quitar imagen</Text>
              </TouchableOpacity>
            </View>
          ) : busy ? (
            <View style={styles.busyBox}>
              <ActivityIndicator color="#C0392B" size="large" />
            </View>
          ) : (
            <View style={styles.row}>
              <TouchableOpacity style={styles.btnGhost} onPress={takePhoto}>
                <Text style={styles.btnGhostIcon}>📷</Text>
                <Text style={styles.btnGhostText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={pickFromGallery}>
                <Text style={styles.btnGhostIcon}>🖼️</Text>
                <Text style={styles.btnGhostText}>Galería</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirm, !uri && styles.btnConfirmDisabled]}
              onPress={handleConfirm}
              disabled={!uri}
            >
              <Text style={styles.btnConfirmText}>Usar imagen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 18 },

  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  btnGhostIcon: { fontSize: 26, marginBottom: 6 },
  btnGhostText: { color: '#374151', fontWeight: '600', fontSize: 13 },

  busyBox: { paddingVertical: 36, alignItems: 'center' },

  previewWrap: { alignItems: 'center', marginBottom: 12 },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  linkText: { color: '#C0392B', fontWeight: '600', fontSize: 13 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  btnCancelText: { color: '#374151', fontWeight: '600' },
  btnConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#C0392B',
    alignItems: 'center',
  },
  btnConfirmDisabled: { opacity: 0.5 },
  btnConfirmText: { color: '#FFFFFF', fontWeight: '700' },
});
