import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { cards as cardsApi } from '../../services/api'
import useCardStore from '../../store/useCardStore'
import styles from './ScanPage.module.css'

// ── Constantes ───────────────────────────────────────────────────
const METHODS = [
  { id: 'photo',  icon: '📸', title: 'Foto',   desc: 'Fotografía tu hoja física' },
  { id: 'pdf',    icon: '📄', title: 'PDF',    desc: 'Sube un archivo PDF' },
  { id: 'manual', icon: '✏️', title: 'Manual', desc: 'Digita los números' },
]

const LETTERS = ['B', 'I', 'N', 'G', 'O']
const EMPTY_GRID = Array(5).fill(null).map(() => Array(5).fill(''))

// Confianza OCR baja si < 0.75
const LOW_CONF = 0.75

// ── Componente principal ─────────────────────────────────────────
export default function ScanPage() {
  const navigate = useNavigate()
  const { saveCard } = useCardStore()
  const fileRef = useRef(null)

  // Paso actual: 'method' | 'upload' | 'processing' | 'review' | 'done'
  const [step, setStep] = useState('method')
  const [method, setMethod] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Datos OCR
  const [ocrGrid, setOcrGrid] = useState(EMPTY_GRID)
  const [ocrConf, setOcrConf] = useState(null)   // grid 5x5 de confianza (0-1)
  const [imageUrl, setImageUrl] = useState(null)
  const [sourceType, setSourceType] = useState('manual')

  // Estado de guardado
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [cardName, setCardName] = useState('Mi cartón')

  // ── Handlers archivo ──────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return
    setSelectedFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  // ── Enviar al OCR ─────────────────────────────────────────────
  const handleRunOCR = async () => {
    if (!selectedFile) return
    setStep('processing')
    try {
      const result = await cardsApi.ocr(selectedFile)
      setOcrGrid(result.grid)
      setOcrConf(result.confidence)
      setImageUrl(result.fileUrl)
      setSourceType(result.sourceType)
      setStep('review')
    } catch (err) {
      // Si el backend no está disponible, usamos el mock del cliente
      const mockGrid = generateClientMock()
      setOcrGrid(mockGrid.grid)
      setOcrConf(mockGrid.confidence)
      setSourceType(method)
      setStep('review')
    }
  }

  // ── Editar celda en la revisión ───────────────────────────────
  const handleCellEdit = (row, col, val) => {
    const next = ocrGrid.map((r) => [...r])
    next[row][col] = val.replace(/\D/g, '').slice(0, 2) === ''
      ? ''
      : Number(val.replace(/\D/g, '').slice(0, 2))
    setOcrGrid(next)

    // Resetear confianza de esa celda a 1 (editada manualmente)
    if (ocrConf) {
      const nextConf = ocrConf.map((r) => [...r])
      nextConf[row][col] = 1
      setOcrConf(nextConf)
    }
  }

  // ── Edición manual directa ────────────────────────────────────
  const handleManualCell = (row, col, val) => {
    const next = ocrGrid.map((r) => [...r])
    next[row][col] = val.replace(/\D/g, '').slice(0, 2)
    setOcrGrid(next)
  }

  // ── Guardar cartón ────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Normaliza el grid: strings → numbers, vacíos → null
      const normalized = ocrGrid.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === 2 && ci === 2) return null
          const n = Number(cell)
          return isNaN(n) || cell === '' ? null : n
        })
      )
      await saveCard(normalized, sourceType, imageUrl, cardName)
      setStep('done')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Reiniciar ────────────────────────────────────────────────
  const reset = () => {
    setStep('method')
    setMethod(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setOcrGrid(EMPTY_GRID)
    setOcrConf(null)
    setImageUrl(null)
    setSaveError(null)
    setCardName('Mi cartón')
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cargar <span>Cartón</span></h1>
        <p className={styles.subtitle}>
          {step === 'method'     && 'Elige cómo quieres ingresar tu cartón'}
          {step === 'upload'     && `Método: ${METHODS.find(m => m.id === method)?.title} — sube tu archivo`}
          {step === 'processing' && 'Procesando con OCR...'}
          {step === 'review'     && 'Revisa y corrige los números detectados'}
          {step === 'done'       && 'Cartón guardado correctamente'}
        </p>
      </div>

      {/* ── PASO 1: Seleccionar método ── */}
      {step === 'method' && (
        <div className={styles.methods}>
          {METHODS.map((m) => (
            <button
              key={m.id}
              className={styles.methodCard}
              onClick={() => {
                setMethod(m.id)
                if (m.id === 'manual') {
                  setOcrGrid(EMPTY_GRID)
                  setStep('review')
                } else {
                  setStep('upload')
                }
              }}
            >
              <span className={styles.methodIcon}>{m.icon}</span>
              <span className={styles.methodTitle}>{m.title}</span>
              <span className={styles.methodDesc}>{m.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── PASO 2: Upload de archivo ── */}
      {step === 'upload' && (
        <div className={styles.uploadArea}>
          <div
            className={`${styles.dropzone} ${dragOver ? styles.dragActive : ''} ${selectedFile ? styles.hasFile : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileRef.current?.click()}
          >
            {selectedFile ? (
              <div className={styles.filePreview}>
                {previewUrl
                  ? <img src={previewUrl} alt="preview" className={styles.previewImg} />
                  : <span className={styles.pdfIcon}>📄</span>
                }
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{selectedFile.name}</span>
                  <span className={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    className={styles.btnRemoveFile}
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null) }}
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className={styles.dropIcon}>{method === 'photo' ? '📸' : '📄'}</span>
                <p className={styles.dropTitle}>
                  {method === 'photo' ? 'Arrastra tu foto aquí' : 'Arrastra tu PDF aquí'}
                </p>
                <p className={styles.dropSub}>o haz clic para seleccionar</p>
                <p className={styles.dropFormats}>
                  {method === 'photo' ? 'JPG, PNG, WEBP — máx 10 MB' : 'PDF — máx 10 MB'}
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={method === 'photo' ? 'image/*' : 'application/pdf'}
              className={styles.fileInput}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>

          <div className={styles.uploadActions}>
            <button className={styles.btnBack} onClick={reset}>← Volver</button>
            <button
              className={styles.btnPrimary}
              onClick={handleRunOCR}
              disabled={!selectedFile}
            >
              Analizar con OCR →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: Procesando ── */}
      {step === 'processing' && (
        <div className={styles.processingArea}>
          <div className={styles.processingCard}>
            <div className={styles.spinner} />
            <p className={styles.processingTitle}>Analizando imagen</p>
            <p className={styles.processingDesc}>
              El OCR está extrayendo los números de tu cartón...
            </p>
            <div className={styles.processingSteps}>
              <span className={styles.stepDot} />
              <span className={styles.stepDot} />
              <span className={styles.stepDot} />
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 4: Revisión y corrección ── */}
      {step === 'review' && (
        <div className={styles.reviewArea}>
          {/* Info OCR si viene de foto/pdf */}
          {method !== 'manual' && ocrConf && (
            <div className={styles.ocrInfo}>
              <span className={styles.ocrBadge}>OCR</span>
              Las celdas en{' '}
              <span style={{ color: 'var(--accent4)' }}>amarillo</span>{' '}
              tienen baja confianza — revísalas antes de guardar.
            </div>
          )}

          <div className={styles.reviewLayout}>
            {/* Cartón editable */}
            <div>
              <p className={styles.gridLabel}>
                {method === 'manual' ? 'Ingresa los números' : 'Corrige si es necesario'}
              </p>
              <div className={styles.bingoGrid}>
                {LETTERS.map((l) => (
                  <div key={l} className={styles.colHeader}>{l}</div>
                ))}
                {ocrGrid.map((row, ri) =>
                  row.map((val, ci) => {
                    const isFree = ri === 2 && ci === 2
                    const conf = ocrConf?.[ri]?.[ci] ?? 1
                    const isLowConf = !isFree && conf < LOW_CONF
                    return (
                      <div
                        key={`${ri}-${ci}`}
                        className={`${styles.cell} ${isLowConf ? styles.cellWarn : ''} ${isFree ? styles.cellFree : ''}`}
                      >
                        {isFree ? (
                          <span className={styles.freeLabel}>FREE</span>
                        ) : (
                          <>
                            <input
                              className={styles.cellInput}
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              value={val === null ? '' : val}
                              onChange={(e) =>
                                method === 'manual'
                                  ? handleManualCell(ri, ci, e.target.value)
                                  : handleCellEdit(ri, ci, e.target.value)
                              }
                              placeholder="—"
                            />
                            {isLowConf && (
                              <span className={styles.confWarning} title={`Confianza: ${Math.round(conf * 100)}%`}>
                                ⚠
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Panel derecho */}
            <div className={styles.reviewSide}>
              {/* Nombre del cartón */}
              <div className={styles.sideSection}>
                <label className={styles.sideLabel}>Nombre del cartón</label>
                <input
                  className={styles.nameInput}
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  maxLength={30}
                  placeholder="Mi cartón"
                />
              </div>

              {/* Preview de imagen si tiene */}
              {previewUrl && (
                <div className={styles.sideSection}>
                  <label className={styles.sideLabel}>Imagen original</label>
                  <img src={previewUrl} alt="original" className={styles.sidePreview} />
                </div>
              )}

              {/* Estadísticas OCR */}
              {ocrConf && method !== 'manual' && (
                <div className={styles.sideSection}>
                  <label className={styles.sideLabel}>Resultado OCR</label>
                  <div className={styles.ocrStats}>
                    <div className={styles.ocrStat}>
                      <span className={styles.ocrStatNum} style={{ color: 'var(--accent3)' }}>
                        {countHighConf(ocrConf)}
                      </span>
                      <span className={styles.ocrStatLabel}>Detectadas</span>
                    </div>
                    <div className={styles.ocrStat}>
                      <span className={styles.ocrStatNum} style={{ color: 'var(--accent4)' }}>
                        {countLowConf(ocrConf)}
                      </span>
                      <span className={styles.ocrStatLabel}>Revisar</span>
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p className={styles.saveError}>{saveError}</p>}

              <div className={styles.reviewActions}>
                <button className={styles.btnBack} onClick={reset}>← Volver</button>
                <button
                  className={styles.btnSave}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Cartón ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 5: Listo ── */}
      {step === 'done' && (
        <div className={styles.doneArea}>
          <div className={styles.doneCard}>
            <span className={styles.doneIcon}>✅</span>
            <h2 className={styles.doneTitle}>¡Cartón guardado!</h2>
            <p className={styles.doneDesc}>
              Tu cartón <strong>"{cardName}"</strong> está listo para jugar.
            </p>
            <div className={styles.doneActions}>
              <button className={styles.btnBack} onClick={reset}>
                + Cargar otro cartón
              </button>
              <button className={styles.btnPrimary} onClick={() => navigate('/game')}>
                Ir a jugar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function countHighConf(conf) {
  return conf.flat().filter((v) => v >= LOW_CONF && v < 1).length
}

function countLowConf(conf) {
  return conf.flat().filter((v) => v < LOW_CONF && v !== 0).length
}

// Mock cliente — se usa cuando el backend no está disponible
function generateClientMock() {
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]]
  const cols = ranges.map(([min, max]) => {
    const pool = Array.from({ length: max-min+1 }, (_,i) => i+min)
    for (let i = pool.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]] = [pool[j],pool[i]]
    }
    return pool.slice(0,5)
  })
  const grid = Array.from({length:5}, (_,ri) =>
    Array.from({length:5}, (_,ci) => ri===2&&ci===2 ? null : cols[ci][ri])
  )
  const confidence = Array.from({length:5}, (_,ri) =>
    Array.from({length:5}, (_,ci) => {
      if (ri===2&&ci===2) return 1
      return Math.random()<0.15 ? Math.random()*0.4+0.35 : 0.9+Math.random()*0.1
    })
  )
  return { grid, confidence }
}
