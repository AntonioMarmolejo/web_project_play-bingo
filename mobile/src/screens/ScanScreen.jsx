import { useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { CameraView, useCameraPermissions } from 'expo-camera'
import useCardStore from '../store/useCardStore'
import { cards as cardsApi } from '../services/api'

const LETTERS = ['B', 'I', 'N', 'G', 'O']
const EMPTY_GRID = Array(5).fill(null).map(() => Array(5).fill(''))
const LOW_CONF = 0.75

// step: 'method' | 'camera' | 'processing' | 'review' | 'done'
export default function ScanScreen() {
  const { saveCard } = useCardStore()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef(null)

  const [step, setStep] = useState('method')
  const [ocrGrid, setOcrGrid] = useState(EMPTY_GRID)
  const [ocrConf, setOcrConf] = useState(null)
  const [imageUri, setImageUri] = useState(null)
  const [imagePublicId, setImagePublicId] = useState(null)
  const [sourceType, setSourceType] = useState('manual')
  const [cardName, setCardName] = useState('Mi cartón')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const reset = () => {
    setStep('method')
    setOcrGrid(EMPTY_GRID)
    setOcrConf(null)
    setImageUri(null)
    setImagePublicId(null)
    setSourceType('manual')
    setCardName('Mi cartón')
    setSaveError(null)
  }

  // ── Ejecuta OCR con la imagen seleccionada ─────────────
  const runOCR = async (uri) => {
    setStep('processing')
    setSourceType('photo')
    try {
      const result = await cardsApi.ocr(uri)
      setOcrGrid(result.grid)
      setOcrConf(result.confidence)
      setImagePublicId(result.imagePublicId ?? null)
      setStep('review')
    } catch {
      Alert.alert('OCR no disponible', 'El backend no respondió. Puedes ingresar los números manualmente.')
      setOcrGrid(EMPTY_GRID)
      setStep('review')
    }
  }

  // ── Tomar foto con la cámara ────────────────────────────
  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission()
      if (!granted) {
        Alert.alert('Permiso requerido', 'Necesitas permitir el acceso a la cámara.')
        return
      }
    }
    setStep('camera')
  }

  const handleCapture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 })
    if (photo) {
      setImageUri(photo.uri)
      await runOCR(photo.uri)
    }
  }

  // ── Elegir desde galería ────────────────────────────────
  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      setImageUri(uri)
      await runOCR(uri)
    }
  }

  // ── Editar celda ────────────────────────────────────────
  const handleCellEdit = (row, col, val) => {
    const next = ocrGrid.map((r) => [...r])
    const clean = val.replace(/\D/g, '').slice(0, 2)
    next[row][col] = clean === '' ? '' : Number(clean)
    setOcrGrid(next)
    if (ocrConf) {
      const nc = ocrConf.map((r) => [...r])
      nc[row][col] = 1
      setOcrConf(nc)
    }
  }

  // ── Guardar cartón ──────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const normalized = ocrGrid.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === 2 && ci === 2) return null
          const n = Number(cell)
          return isNaN(n) || cell === '' ? null : n
        })
      )
      await saveCard(normalized, sourceType, imageUri, imagePublicId, cardName)
      setStep('done')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Vista: Selección de método ──────────────────────────
  if (step === 'method') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.content}>
          <Text style={s.title}>Cargar <Text style={s.accent}>Cartón</Text></Text>
          <Text style={s.subtitle}>Elige cómo ingresar tu cartón</Text>

          <TouchableOpacity style={s.methodCard} onPress={handleTakePhoto}>
            <Text style={s.methodIcon}>📸</Text>
            <Text style={s.methodTitle}>Fotografía</Text>
            <Text style={s.methodDesc}>Toma una foto con la cámara</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.methodCard} onPress={handleGallery}>
            <Text style={s.methodIcon}>🖼️</Text>
            <Text style={s.methodTitle}>Galería</Text>
            <Text style={s.methodDesc}>Elige una imagen guardada</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.methodCard} onPress={() => { setSourceType('manual'); setStep('review') }}>
            <Text style={s.methodIcon}>✏️</Text>
            <Text style={s.methodTitle}>Manual</Text>
            <Text style={s.methodDesc}>Ingresa los números a mano</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── Vista: Cámara ───────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
          <View style={s.cameraOverlay}>
            <View style={s.cameraGuide} />
            <Text style={s.cameraHint}>Encuadra el cartón de bingo</Text>
            <View style={s.cameraActions}>
              <TouchableOpacity style={s.cameraCancel} onPress={reset}>
                <Text style={{ color: '#fff' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.captureBtn} onPress={handleCapture}>
                <View style={s.captureBtnInner} />
              </TouchableOpacity>
              <View style={{ width: 70 }} />
            </View>
          </View>
        </CameraView>
      </View>
    )
  }

  // ── Vista: Procesando ───────────────────────────────────
  if (step === 'processing') {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={[s.subtitle, { marginTop: 16 }]}>Analizando imagen con OCR...</Text>
      </SafeAreaView>
    )
  }

  // ── Vista: Revisión del grid ────────────────────────────
  if (step === 'review') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.reviewContent}>
          <Text style={s.title}>
            {sourceType === 'manual' ? 'Ingresa los números' : 'Revisa y corrige'}
          </Text>

          {ocrConf && sourceType !== 'manual' && (
            <View style={s.ocrBanner}>
              <Text style={s.ocrBannerText}>
                Las celdas en <Text style={{ color: '#f9ca24' }}>amarillo</Text> tienen baja confianza — revísalas.
              </Text>
            </View>
          )}

          {/* Nombre del cartón */}
          <TextInput
            style={s.nameInput}
            value={cardName}
            onChangeText={setCardName}
            placeholder="Nombre del cartón"
            placeholderTextColor="#888899"
          />

          {/* Imagen preview */}
          {imageUri && (
            <Image source={{ uri: imageUri }} style={s.previewImg} resizeMode="contain" />
          )}

          {/* Grid 5x5 */}
          <View style={s.grid}>
            {LETTERS.map((l) => (
              <View key={l} style={s.colHeader}>
                <Text style={s.colHeaderText}>{l}</Text>
              </View>
            ))}
            {ocrGrid.map((row, ri) =>
              row.map((val, ci) => {
                const isFree = ri === 2 && ci === 2
                const conf = ocrConf?.[ri]?.[ci] ?? 1
                const isLow = !isFree && conf < LOW_CONF
                return (
                  <View
                    key={`${ri}-${ci}`}
                    style={[s.cell, isLow && s.cellWarn, isFree && s.cellFree]}
                  >
                    {isFree ? (
                      <Text style={s.freeText}>FREE</Text>
                    ) : (
                      <TextInput
                        style={s.cellInput}
                        value={val === null ? '' : String(val)}
                        onChangeText={(v) => handleCellEdit(ri, ci, v)}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="—"
                        placeholderTextColor="#444"
                        textAlign="center"
                      />
                    )}
                  </View>
                )
              })
            )}
          </View>

          {saveError && <Text style={s.error}>{saveError}</Text>}

          <View style={s.reviewActions}>
            <TouchableOpacity style={s.btnBack} onPress={reset}>
              <Text style={s.btnBackText}>← Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnSaveText}>Guardar ✓</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Vista: Listo ────────────────────────────────────────
  if (step === 'done') {
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <Text style={{ fontSize: 64 }}>✅</Text>
        <Text style={[s.title, { marginTop: 12 }]}>¡Cartón guardado!</Text>
        <Text style={s.subtitle}>"{cardName}" está listo para jugar.</Text>
        <TouchableOpacity style={[s.btnSave, { marginTop: 32, paddingHorizontal: 32 }]} onPress={reset}>
          <Text style={s.btnSaveText}>+ Cargar otro</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return null
}

const CELL_SIZE = 56

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#e8e8f0', marginBottom: 6 },
  accent: { color: '#6c63ff' },
  subtitle: { fontSize: 14, color: '#888899', marginBottom: 24 },
  // Method cards
  methodCard: { backgroundColor: '#12121a', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e', flexDirection: 'row', alignItems: 'center', gap: 16 },
  methodIcon: { fontSize: 32 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  methodDesc: { fontSize: 12, color: '#888899' },
  // Camera
  cameraOverlay: { flex: 1, justifyContent: 'space-between', padding: 24 },
  cameraGuide: { alignSelf: 'center', marginTop: 60, width: 280, height: 180, borderWidth: 2, borderColor: '#6c63ff', borderRadius: 12 },
  cameraHint: { color: '#fff', textAlign: 'center', fontSize: 14 },
  cameraActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  cameraCancel: { width: 70, alignItems: 'center' },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  // Review
  reviewContent: { padding: 20, paddingBottom: 60 },
  ocrBanner: { backgroundColor: 'rgba(249,202,36,0.1)', borderRadius: 10, padding: 12, marginBottom: 16 },
  ocrBannerText: { color: '#e8e8f0', fontSize: 13 },
  nameInput: { backgroundColor: '#1a1a26', color: '#e8e8f0', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e' },
  previewImg: { width: '100%', height: 160, borderRadius: 10, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: CELL_SIZE * 5, alignSelf: 'center', marginBottom: 20 },
  colHeader: { width: CELL_SIZE, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6c63ff' },
  colHeaderText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderWidth: 0.5, borderColor: '#2a2a3e', backgroundColor: '#12121a', alignItems: 'center', justifyContent: 'center' },
  cellWarn: { backgroundColor: 'rgba(249,202,36,0.12)' },
  cellFree: { backgroundColor: 'rgba(108,99,255,0.2)' },
  cellInput: { width: '100%', textAlign: 'center', color: '#e8e8f0', fontSize: 15, fontWeight: '600' },
  freeText: { color: '#6c63ff', fontSize: 10, fontWeight: '700' },
  error: { color: '#ff6584', marginBottom: 12, fontSize: 13 },
  reviewActions: { flexDirection: 'row', gap: 12 },
  btnBack: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  btnBackText: { color: '#888899', fontWeight: '600' },
  btnSave: { flex: 1, backgroundColor: '#6c63ff', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
