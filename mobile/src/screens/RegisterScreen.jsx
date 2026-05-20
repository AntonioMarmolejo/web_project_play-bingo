import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import useAuthStore from '../store/useAuthStore'

export default function RegisterScreen({ navigation }) {
  const { register, loading, error, clearError } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleRegister = async () => {
    clearError()
    try {
      await register(name.trim(), email.trim(), password)
    } catch {}
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        <Text style={s.title}>Crear cuenta</Text>
        <Text style={s.subtitle}>Únete a BingoScan</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TextInput
          style={s.input}
          placeholder="Nombre"
          placeholderTextColor="#888899"
          value={name}
          onChangeText={setName}
        />
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
          placeholder="Contraseña (mín. 6 caracteres)"
          placeholderTextColor="#888899"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleRegister}
        />

        <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Registrarme</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.link}>¿Ya tienes cuenta? <Text style={s.linkBold}>Inicia sesión</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#12121a', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#2a2a3e' },
  title: { fontSize: 26, fontWeight: '800', color: '#e8e8f0', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888899', textAlign: 'center', marginBottom: 24 },
  error: { backgroundColor: 'rgba(255,101,132,0.15)', color: '#ff6584', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13 },
  input: { backgroundColor: '#1a1a26', color: '#e8e8f0', padding: 14, borderRadius: 10, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e' },
  btn: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#888899', textAlign: 'center', marginTop: 20, fontSize: 13 },
  linkBold: { color: '#6c63ff', fontWeight: '600' },
})
