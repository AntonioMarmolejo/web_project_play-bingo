import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import useAuthStore from '../store/useAuthStore'
import { rooms as roomsApi } from '../services/api'

const STATUS = {
  active:  { label: 'En juego',  color: '#43e97b' },
  waiting: { label: 'Esperando', color: '#f9ca24' },
  ended:   { label: 'Terminada', color: '#888899' },
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuthStore()
  const [roomsList, setRoomsList] = useState([])
  const [stats, setStats] = useState({ cardsCount: 0, roomsPlayed: 0, bingosWon: 0, activeRooms: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roomsApi.myRooms()
      .then(({ rooms, stats }) => { setRoomsList(rooms); setStats(stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hola, <Text style={s.name}>{user?.name ?? 'Jugador'}</Text></Text>
            <Text style={s.sub}>¿Listo para jugar bingo?</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsGrid}>
          {[
            { n: stats.roomsPlayed, label: 'Partidas' },
            { n: stats.bingosWon,   label: 'Bingos' },
            { n: stats.cardsCount,  label: 'Cartones' },
            { n: stats.activeRooms, label: 'Activas' },
          ].map(({ n, label }) => (
            <View key={label} style={s.statCard}>
              <Text style={s.statNum}>{loading ? '—' : n}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Salas recientes */}
        <Text style={s.sectionTitle}>Mis Salas</Text>
        {loading && <ActivityIndicator color="#6c63ff" style={{ marginTop: 16 }} />}
        {!loading && roomsList.length === 0 && (
          <Text style={s.empty}>Todavía no has jugado ninguna partida.</Text>
        )}
        {roomsList.map((room) => {
          const st = STATUS[room.status]
          return (
            <View key={room.code} style={s.roomCard}>
              <View style={s.roomRow}>
                <Text style={s.roomCode}>{room.code}</Text>
                <Text style={[s.roomBadge, { color: st.color, borderColor: st.color }]}>
                  {st.label}
                </Text>
              </View>
              <Text style={s.roomMeta}>
                {room.playersCount} jugadores · {room.calledCount} números · {formatDate(room.createdAt)}
              </Text>
              {room.status !== 'ended' && (
                <TouchableOpacity
                  style={s.enterBtn}
                  onPress={() => navigation.navigate('Jugar')}
                >
                  <Text style={s.enterBtnText}>Entrar →</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#e8e8f0' },
  name: { color: '#6c63ff' },
  sub: { fontSize: 13, color: '#888899', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a3e' },
  logoutText: { color: '#888899', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#12121a', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#6c63ff' },
  statLabel: { fontSize: 12, color: '#888899', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8f0', marginBottom: 12 },
  empty: { color: '#888899', fontSize: 13, marginTop: 8 },
  roomCard: { backgroundColor: '#12121a', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e' },
  roomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  roomCode: { fontFamily: 'monospace', fontSize: 15, fontWeight: '600', color: '#e8e8f0' },
  roomBadge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  roomMeta: { fontSize: 12, color: '#888899', marginBottom: 8 },
  enterBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(108,99,255,0.4)' },
  enterBtnText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
})
