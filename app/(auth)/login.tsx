/**
 * Pantalla de inicio de sesión.
 *
 * - Email + contraseña.
 * - Valida campos no vacíos antes de enviar.
 * - Al autenticarse, el AuthProvider redirige al home según el rol.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { useAuth } from '../../hooks/useAuth';

export const title = 'Iniciar sesión';
export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Ingresa tu correo UTP y tu contraseña.');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signIn({ email: cleanEmail, password });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo iniciar sesión. Verifica tus credenciales.';
      setErrorMsg(`Error: ${msg}`);
      console.error('[login] Error completo:', JSON.stringify({
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      }));
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
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>Campus</Text>
          <Text style={styles.logoAccent}>Delivery</Text>
          <Text style={styles.tagline}>Comida rápida en tu pabellón</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Correo UTP</Text>
          <TextInput
            style={styles.input}
            placeholder="nombre@utp.edu.pe"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta?</Text>
            <Link href="/(auth)/registro" style={styles.footerLink}>
              Regístrate
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  brand: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#C0392B',
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 40,
    fontWeight: '300',
    color: '#1F2937',
    marginTop: -8,
  },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 10 },

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

  button: {
    backgroundColor: '#C0392B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
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
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorBoxText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
