import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import useGameStore from '../store/useGameStore'
import useAuthStore from '../store/useAuthStore'
import useCardStore from '../store/useCardStore'

const CELL_SIZE = 58

export default function GameScreen() {
  const { token, user } = useAuthStore()
  const { cards, fetchCards } = useCardStore()
  const {
    room, players, calledNumbers, lastCalledNumber,
    gameStatus, winners, lastBingoClaim, error,
    initSocket, createRoom, joinRoom, selectCard,
    startGame, callNumber, claimBingo, leaveRoom, clearError,
  } = useGameStore()

  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [claimResult, setClaimResult] = useState(null)
  const claimTimer = useRef(null)

  const isHost = room && user && String(room.hostId) === String(user.id)
  const myPlayer = players.find((p) => String(p.userId) === String(user?.id))
  const myCard = cards.find((c) => c._id === (myPlayer?.cardId || selectedCardId))

  useEffect(() => {
    if (token) initSocket(token)
    fetchCards()
  }, [token])

  useEffect(() => {
    if (!lastBingoClaim) return
    setClaimResult(lastBingoClaim.valid ? 'valid' : 'invalid')
    clearTimeout(claimTimer.current)
    claimTimer.current = setTimeout(() => setClaimResult(null), 3000)
  }, [lastBingoClaim])

  const handleError = (err) => {
    setActionError(err.message)
    setTimeout(() => setActionError(''), 3500)
  }

  const withLoading = (fn) => async (...args) => {
    setLoading(true)
    try { await fn(...args) } catch (err) { handleError(err) }
    finally { setLoading(false) }
  }

  const handleCreateRoom  = withLoading(createRoom)
  const handleJoinRoom    = withLoading(() => joinRoom(joinCode.trim()))
  const handleStartGame   = withLoading(() => startGame(room.code))
  const handleSelectCard  = async (cardId) => {
    setSelectedCardId(cardId)
    if (!room) return
    try { await selectCard(room.code, cardId) } catch (err) { handleError(err) }
  }
  const handleCallNumber  = async () => { try { await callNumber(room.code) } catch (err) { handleError(err) } }
  const handleClaimBingo  = async () => {
    const cardId = myPlayer?.cardId || selectedCardId
    if (!cardId) return handleError(new Error('Primero selecciona un cartón.'))
    try { await claimBingo(room.code, cardId) } catch (err) { handleError(err) }
  }

  // ── LOBBY ──────────────────────────────────────────────
  if (gameStatus === 'idle') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Sala de <Text style={s.accent}>Juego</Text></Text>
          <Text style={s.subtitle}>Crea una sala o únete con un código</Text>

          {(actionError || error) && <Text style={s.errorBanner}>{actionError || error}</Text>}

          <TouchableOpacity style={s.bigBtn} onPress={handleCreateRoom} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={s.bigBtnIcon}>🏠</Text>
                <Text style={s.bigBtnTitle}>Crear sala nueva</Text>
                <Text style={s.bigBtnDesc}>Serás el anfitrión</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.joinCard}>
            <Text style={s.bigBtnIcon}>🚀</Text>
            <Text style={s.bigBtnTitle}>Unirse con código</Text>
            <View style={s.joinRow}>
              <TextInput
                style={s.joinInput}
                placeholder="XXXX"
                placeholderTextColor="#888899"
                value={joinCode}
                onChangeText={(v) => setJoinCode(v.toUpperCase())}
                maxLength={4}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[s.joinBtn, joinCode.length < 4 && { opacity: 0.4 }]}
                onPress={handleJoinRoom}
                disabled={loading || joinCode.length < 4}
              >
                <Text style={s.joinBtnText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── SALA DE ESPERA ─────────────────────────────────────
  if (gameStatus === 'waiting') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Sala de <Text style={s.accent}>Espera</Text></Text>
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>CÓDIGO</Text>
            <Text style={s.codeValue}>{room?.code}</Text>
          </View>

          {(actionError || error) && <Text style={s.errorBanner}>{actionError || error}</Text>}

          {/* Jugadores */}
          <Text style={s.panelLabel}>JUGADORES ({players.length})</Text>
          {players.map((p) => (
            <View key={p.userId} style={s.playerRow}>
              <View style={[s.dot, { backgroundColor: p.cardId ? '#43e97b' : '#888899' }]} />
              <Text style={s.playerName}>{p.name}</Text>
              {String(p.userId) === String(user?.id) && <Text style={s.tag}>Tú</Text>}
              {String(p.userId) === String(room?.hostId) && <Text style={[s.tag, s.hostTag]}>Host</Text>}
              {p.cardId && <Text style={[s.tag, s.cardTag]}>✓ cartón</Text>}
            </View>
          ))}

          {/* Selector de cartón */}
          <Text style={[s.panelLabel, { marginTop: 20 }]}>TU CARTÓN</Text>
          {cards.length === 0
            ? <Text style={s.emptyText}>No tienes cartones. Ve a la pestaña Escanear.</Text>
            : cards.map((c) => {
                const active = (myPlayer?.cardId || selectedCardId) === c._id
                return (
                  <TouchableOpacity
                    key={c._id}
                    style={[s.cardOption, active && s.cardOptionActive]}
                    onPress={() => handleSelectCard(c._id)}
                  >
                    <Text style={[s.cardOptionName, active && { color: '#6c63ff' }]}>{c.name}</Text>
                    <Text style={s.cardOptionType}>{c.sourceType}</Text>
                  </TouchableOpacity>
                )
              })
          }

          <View style={s.waitingActions}>
            {isHost ? (
              <TouchableOpacity style={s.startBtn} onPress={handleStartGame} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.startBtnText}>¡Iniciar juego!</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={s.waitHint}>Esperando a que el anfitrión inicie...</Text>
            )}
            <TouchableOpacity style={s.leaveBtn} onPress={() => leaveRoom(room?.code)}>
              <Text style={s.leaveBtnText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── JUEGO ACTIVO ───────────────────────────────────────
  if (gameStatus === 'active') {
    const grid = myCard?.grid ?? null
    return (
      <SafeAreaView style={s.safe}>
        {claimResult && (
          <View style={[s.bingoBanner, claimResult === 'valid' ? s.bingoValid : s.bingoInvalid]}>
            <Text style={s.bingoBannerText}>
              {claimResult === 'valid'
                ? `¡BINGO VÁLIDO! ${lastBingoClaim?.player} ganó 🎉`
                : `¡Falso bingo! ${lastBingoClaim?.player} aún no completa línea`}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={s.content}>
          {/* Header de juego */}
          <View style={s.gameHeader}>
            <Text style={s.codeValue}>{room?.code}</Text>
            <Text style={s.subtitle}>{players.length} jugadores</Text>
          </View>

          {actionError && <Text style={s.errorBanner}>{actionError}</Text>}

          {/* Último número */}
          <View style={s.lastNumBox}>
            <Text style={s.lastNumLabel}>ÚLTIMO NÚMERO</Text>
            <Text style={s.lastNum}>{lastCalledNumber ?? '—'}</Text>
          </View>

          {/* Cartón */}
          <Text style={s.panelLabel}>MI CARTÓN</Text>
          {grid ? (
            <View style={s.bingoGrid}>
              {['B', 'I', 'N', 'G', 'O'].map((l) => (
                <View key={l} style={s.gridColHeader}>
                  <Text style={s.gridColHeaderText}>{l}</Text>
                </View>
              ))}
              {grid.map((row, ri) =>
                row.map((num, ci) => {
                  const isFree = num === null
                  const marked = isFree || calledNumbers.includes(num)
                  const isLast = num === lastCalledNumber
                  return (
                    <View
                      key={`${ri}-${ci}`}
                      style={[
                        s.gridCell,
                        marked && s.gridCellMarked,
                        isLast && s.gridCellLast,
                        isFree && s.gridCellFree,
                      ]}
                    >
                      <Text style={[s.gridCellText, marked && s.gridCellTextMarked]}>
                        {isFree ? 'FREE' : num}
                      </Text>
                    </View>
                  )
                })
              )}
            </View>
          ) : (
            <Text style={s.emptyText}>No seleccionaste cartón en la sala de espera.</Text>
          )}

          {/* Números cantados anteriores */}
          <Text style={[s.panelLabel, { marginTop: 16 }]}>
            CANTADOS ({calledNumbers.length})
          </Text>
          <View style={s.calledList}>
            {[...calledNumbers].reverse().slice(1).map((n) => (
              <View key={n} style={s.calledBubble}>
                <Text style={s.calledBubbleText}>{n}</Text>
              </View>
            ))}
          </View>

          {/* Acciones */}
          <View style={s.gameActions}>
            {isHost && (
              <TouchableOpacity style={s.callBtn} onPress={handleCallNumber}>
                <Text style={s.callBtnText}>🎲 Cantar número</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.bingoBtn} onPress={handleClaimBingo}>
              <Text style={s.bingoBtnText}>¡BINGO!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.leaveBtn} onPress={() => leaveRoom(room?.code)}>
              <Text style={s.leaveBtnText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── JUEGO TERMINADO ────────────────────────────────────
  if (gameStatus === 'ended') {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 72 }}>🎉</Text>
        <Text style={[s.title, { marginTop: 12, textAlign: 'center' }]}>¡Juego terminado!</Text>
        {winners.length > 0 && (
          <Text style={[s.subtitle, { textAlign: 'center' }]}>
            Ganador{winners.length > 1 ? 'es' : ''}: <Text style={{ color: '#f9ca24', fontWeight: '700' }}>{winners.join(', ')}</Text>
          </Text>
        )}
        <Text style={[s.subtitle, { textAlign: 'center' }]}>
          {calledNumbers.length} números cantados en total
        </Text>
        <TouchableOpacity style={[s.startBtn, { marginTop: 32 }]} onPress={() => leaveRoom(room?.code)}>
          <Text style={s.startBtnText}>Nueva partida</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return null
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#e8e8f0', marginBottom: 6 },
  accent: { color: '#6c63ff' },
  subtitle: { fontSize: 14, color: '#888899', marginBottom: 16 },
  errorBanner: { backgroundColor: 'rgba(255,101,132,0.15)', color: '#ff6584', padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13 },
  // Lobby
  bigBtn: { backgroundColor: '#12121a', borderRadius: 16, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  bigBtnIcon: { fontSize: 32, marginBottom: 6 },
  bigBtnTitle: { fontSize: 17, fontWeight: '700', color: '#e8e8f0' },
  bigBtnDesc: { fontSize: 12, color: '#888899', marginTop: 2 },
  joinCard: { backgroundColor: '#12121a', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  joinRow: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  joinInput: { flex: 1, backgroundColor: '#1a1a26', color: '#e8e8f0', padding: 12, borderRadius: 10, fontSize: 18, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: '#2a2a3e', fontFamily: 'monospace' },
  joinBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center' },
  joinBtnText: { color: '#fff', fontWeight: '700' },
  // Waiting room
  codeBox: { backgroundColor: '#12121a', borderRadius: 14, padding: 16, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  codeLabel: { fontSize: 10, color: '#888899', fontFamily: 'monospace', letterSpacing: 2 },
  codeValue: { fontSize: 28, fontWeight: '800', color: '#6c63ff', fontFamily: 'monospace' },
  panelLabel: { fontSize: 10, color: '#888899', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a26' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  playerName: { flex: 1, color: '#e8e8f0', fontSize: 14 },
  tag: { fontSize: 10, color: '#888899', borderWidth: 1, borderColor: '#2a2a3e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hostTag: { color: '#f9ca24', borderColor: '#f9ca24' },
  cardTag: { color: '#43e97b', borderColor: '#43e97b' },
  emptyText: { color: '#888899', fontSize: 13, marginVertical: 8 },
  cardOption: { backgroundColor: '#12121a', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a3e', flexDirection: 'row', justifyContent: 'space-between' },
  cardOptionActive: { borderColor: '#6c63ff', backgroundColor: 'rgba(108,99,255,0.08)' },
  cardOptionName: { color: '#e8e8f0', fontWeight: '600' },
  cardOptionType: { color: '#888899', fontSize: 12 },
  waitingActions: { marginTop: 24, gap: 10 },
  startBtn: { backgroundColor: '#6c63ff', padding: 16, borderRadius: 12, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  waitHint: { color: '#888899', textAlign: 'center', fontSize: 13 },
  leaveBtn: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  leaveBtnText: { color: '#888899', fontWeight: '600' },
  // Active game
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  lastNumBox: { backgroundColor: '#12121a', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  lastNumLabel: { fontSize: 10, color: '#888899', fontFamily: 'monospace', letterSpacing: 2 },
  lastNum: { fontSize: 56, fontWeight: '800', color: '#6c63ff' },
  bingoGrid: { flexDirection: 'row', flexWrap: 'wrap', width: CELL_SIZE * 5, alignSelf: 'center', marginBottom: 16 },
  gridColHeader: { width: CELL_SIZE, height: 28, backgroundColor: '#6c63ff', alignItems: 'center', justifyContent: 'center' },
  gridColHeaderText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  gridCell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.5, borderColor: '#2a2a3e', backgroundColor: '#12121a', alignItems: 'center', justifyContent: 'center' },
  gridCellMarked: { backgroundColor: 'rgba(108,99,255,0.25)' },
  gridCellLast: { backgroundColor: 'rgba(108,99,255,0.6)' },
  gridCellFree: { backgroundColor: 'rgba(67,233,123,0.15)' },
  gridCellText: { color: '#e8e8f0', fontSize: 15, fontWeight: '600' },
  gridCellTextMarked: { color: '#6c63ff' },
  calledList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  calledBubble: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center', justifyContent: 'center' },
  calledBubbleText: { color: '#e8e8f0', fontSize: 12, fontWeight: '600' },
  gameActions: { gap: 10 },
  callBtn: { backgroundColor: '#12121a', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  callBtnText: { color: '#e8e8f0', fontWeight: '700', fontSize: 15 },
  bingoBtn: { backgroundColor: '#ff6584', borderRadius: 12, padding: 18, alignItems: 'center' },
  bingoBtnText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  // Bingo banner
  bingoBanner: { padding: 12, alignItems: 'center' },
  bingoValid: { backgroundColor: 'rgba(67,233,123,0.2)' },
  bingoInvalid: { backgroundColor: 'rgba(255,101,132,0.2)' },
  bingoBannerText: { color: '#e8e8f0', fontWeight: '700', fontSize: 14 },
})
