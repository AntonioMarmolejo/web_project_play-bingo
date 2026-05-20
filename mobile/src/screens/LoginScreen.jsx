import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import useAuthStore from '../store/useAuthStore'

export default function LoginScreen({ navigation }) {
  const { login, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    clearError()
    try {
      await login(email.trim(), password)
    } catch {}
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        <Text style={s.logo}>🎯</Text>
        <Text style={s.title}>BingoScan</Text>
        <Text style={s.subtitle}>Inicia sesión para jugar</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#888899"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={s.input}
          placeholder="Contraseña"
          placeholderTextColor="#888899"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={s.link}>¿No tienes cuenta? <Text style={s.linkBold}>Regístrate</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#12121a', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#2a2a3e' },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#6c63ff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888899', textAlign: 'center', marginBottom: 24 },
  error: { backgroundColor: 'rgba(255,101,132,0.15)', color: '#ff6584', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13 },
  input: { backgroundColor: '#1a1a26', color: '#e8e8f0', padding: 14, borderRadius: 10, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e' },
  btn: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#888899', textAlign: 'center', marginTop: 20, fontSize: 13 },
  linkBold: { color: '#6c63ff', fontWeight: '600' },
})
