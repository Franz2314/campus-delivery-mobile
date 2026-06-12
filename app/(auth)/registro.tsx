/**
 * Pantalla de registro.
 *
 * - Valida dominio @utp.edu.pe en cliente antes de enviar.
 * - Selector de rol (estudiante / repartidor / negocio) con tarjetas.
 * - Al autenticarse, el AuthProvider redirige al home según el rol elegido.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';
import { Rol } from '../../services/auth.service';

const ROLES: { value: Rol; label: string; desc: string; icon: string }[] = [
  {
    value: 'estudiante',
    label: 'Estudiante',
    desc: 'Pide comida a tu pabellón',
    icon: '🎓',
  },
  {
    value: 'repartidor',
    label: 'Repartidor',
    desc: 'Gana entregando pedidos',
    icon: '🛵',
  },
  {
    value: 'negocio',
    label: 'Negocio',
    desc: 'Ofrece tu menú al campus',
    icon: '🏪',
  },
];

const UTP_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@utp\.edu\.pe$/;

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [rol, setRol] = useState<Rol>('estudiante');
  const [submitting, setSubmitting] = useState(false);

  const emailValido = useMemo(
    () => UTP_EMAIL_REGEX.test(email.trim().toLowerCase()),
    [email],
  );

  const formValido =
    nombre.trim().length >= 2 && emailValido && password.length >= 6;

  const onSubmit = async () => {
    if (!formValido) {
      Alert.alert(
        'Datos incompletos',
        'Verifica: nombre (mín. 2 caracteres), correo @utp.edu.pe y contraseña (mín. 6).',
      );
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password,
        rol,
        telefono: telefono.trim() || undefined,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'No se pudo crear la cuenta. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Solo correos institucionales @utp.edu.pe
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Mateo Pérez"
            placeholderTextColor="#9CA3AF"
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={styles.label}>Correo UTP</Text>
          <TextInput
            style={[
              styles.input,
              email.length > 0 && !emailValido && styles.inputError,
            ]}
            placeholder="nombre@utp.edu.pe"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {email.length > 0 && !emailValido && (
            <Text style={styles.errorText}>El correo debe ser @utp.edu.pe</Text>
          )}

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Teléfono (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="987654321"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          <Text style={styles.label}>Soy...</Text>
          <View style={styles.rolesRow}>
            {ROLES.map((r) => {
              const selected = rol === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRol(r.value)}
                  style={[styles.roleCard, selected && styles.roleCardActive]}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      selected && styles.roleLabelActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!formValido || submitting) && styles.buttonDisabled,
            ]}
            onPress={onSubmit}
            disabled={!formValido || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Inicia sesión
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 40 },

  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  form: { width: '100%' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#C0392B' },
  errorText: { color: '#C0392B', fontSize: 12, marginTop: 4 },

  rolesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  roleCardActive: { borderColor: '#C0392B', backgroundColor: '#FDEDEC' },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  roleLabelActive: { color: '#C0392B' },
  roleDesc: { fontSize: 10, color: '#6B7280', marginTop: 2, textAlign: 'center' },

  button: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    gap: 6,
  },
  footerText: { color: '#6B7280', fontSize: 14 },
  footerLink: { color: '#C0392B', fontSize: 14, fontWeight: '700' },
});
