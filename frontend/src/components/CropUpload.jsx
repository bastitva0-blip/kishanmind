import { useState, useRef } from 'react'
import { Camera, Upload, Leaf, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const SEVERITY_STYLES = {
  None:     { badge: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle size={14}/> },
  Mild:     { badge: 'bg-yellow-500/20  text-yellow-400',  icon: <AlertTriangle size={14}/> },
  Moderate: { badge: 'bg-orange-500/20  text-orange-400',  icon: <AlertTriangle size={14}/> },
  Severe:   { badge: 'bg-red-500/20     text-red-400',     icon: <AlertTriangle size={14}/> },
}

const URGENCY_STYLES = {
  'Act immediately': 'text-red-400',
  'Within a week':   'text-orange-400',
  'Monitor only':    'text-yellow-400',
  'No action needed':'text-emerald-400',
}

export default function CropUpload({ onDiagnosis }) {
  const [phase, setPhase] = useState('idle') // idle | scanning | result | error
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const cameraRef = useRef()

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    
    // Preview
    const url = URL.createObjectURL(file)
    setPreview(url)
    setPhase('scanning')
    setResult(null)
    setError('')

    // Upload to backend
    const form = new FormData()
    form.append('file', file)

    try {
      const resp = await fetch('/api/analyze-crop', { method: 'POST', body: form })
      if (!resp.ok) throw new Error(`Server error ${resp.status}`)
      const data = await resp.json()
      setResult(data)
      setPhase('result')
      onDiagnosis?.(data.diagnosis)
    } catch (e) {
      setError(e.message || 'Analysis failed. Is the backend running?')
      setPhase('error')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const reset = () => {
    setPhase('idle')
    setPreview(null)
    setResult(null)
    setError('')
  }

  const sevStyle = SEVERITY_STYLES[result?.severity] || SEVERITY_STYLES['Mild']

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto chat-scroll pb-4">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Leaf size={20} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold">CropDoc</h2>
          <p className="text-forest-400 text-xs">AI plant disease diagnosis</p>
        </div>
      </div>

      {/* Upload zone */}
      {phase === 'idle' && (
        <div
          className="glass rounded-2xl border-2 border-dashed border-forest-600/60 
                     hover:border-forest-500 transition-colors cursor-pointer
                     flex flex-col items-center justify-center gap-4 py-10 px-4
                     active:bg-forest-800/30"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-16 h-16 rounded-2xl bg-forest-700/50 flex items-center 
                          justify-center text-3xl">
            🌿
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Drop a crop photo here</p>
            <p className="text-forest-400 text-sm mt-1">or tap to browse</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <Upload size={14} /> Gallery
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Camera size={14} /> Camera
            </button>
          </div>
          <p className="text-forest-600 text-xs">JPG, PNG, WebP • Max 10MB</p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
             onChange={e => handleFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" 
             className="hidden" onChange={e => handleFile(e.target.files[0])} />

      {/* Scanning state */}
      {(phase === 'scanning') && preview && (
        <div className="rounded-2xl overflow-hidden relative">
          <img src={preview} alt="Crop" className="w-full rounded-2xl object-cover max-h-64" />
          {/* Scan line overlay */}
          <div className="absolute inset-0 rounded-2xl bg-forest-900/30">
            <div className="scan-line" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-end 
                          pb-4 gap-2">
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="thinking-dot"
                       style={{ animationDelay: `${i*0.2}s` }} />
                ))}
              </div>
              <span className="text-white text-sm font-medium">Analyzing crop...</span>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && result && (
        <div className="flex flex-col gap-3 animate-slide-up">
          {/* Image thumbnail */}
          {preview && (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Crop" 
                   className="w-full object-cover max-h-48 rounded-2xl" />
              <div className="absolute top-2 right-2">
                <span className={`severity-badge ${sevStyle.badge} flex items-center gap-1`}>
                  {sevStyle.icon}
                  {result.severity || 'Analyzed'}
                </span>
              </div>
            </div>
          )}

          {/* Diagnosis card */}
          <div className="glass rounded-2xl p-4 border-l-4 border-emerald-500/60">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-forest-400 text-xs uppercase tracking-wide">Crop</p>
                <p className="text-white font-semibold">{result.crop || 'Plant'}</p>
              </div>
              <div className="text-right">
                <p className="text-forest-400 text-xs uppercase tracking-wide">Disease</p>
                <p className={`font-bold ${result.disease?.toLowerCase() === 'healthy' 
                  ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {result.disease || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Confidence + urgency */}
            <div className="flex gap-2 mb-3">
              {result.confidence && (
                <span className="bg-forest-700/50 text-forest-300 text-xs px-2 py-1 rounded-lg">
                  {result.confidence} confidence
                </span>
              )}
              {result.urgency && (
                <span className={`text-xs px-2 py-1 rounded-lg bg-forest-700/50 
                                  ${URGENCY_STYLES[result.urgency] || 'text-white'} 
                                  flex items-center gap-1`}>
                  <Clock size={10} /> {result.urgency}
                </span>
              )}
            </div>

            {/* Full diagnosis text */}
            <div className="bg-forest-800/50 rounded-xl p-3 text-sm text-forest-200 
                            leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto 
                            chat-scroll">
              {result.diagnosis}
            </div>
          </div>

          {/* Retry */}
          <button onClick={reset} className="btn-ghost text-sm w-full">
            📸 Analyze another crop
          </button>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="glass rounded-2xl p-4 border border-red-500/30 
                        flex flex-col items-center gap-3 text-center">
          <div className="text-3xl">⚠️</div>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={reset} className="btn-ghost text-sm">Try again</button>
        </div>
      )}

      {/* Tips */}
      {phase === 'idle' && (
        <div className="glass rounded-xl p-3">
          <p className="text-forest-400 text-xs font-medium mb-2">📷 Photo tips for best results:</p>
          <ul className="text-forest-500 text-xs space-y-1">
            <li>• Focus on the affected leaf or stem</li>
            <li>• Good natural lighting works best</li>
            <li>• Include both healthy and affected parts</li>
            <li>• Avoid blurry or dark photos</li>
          </ul>
        </div>
      )}
    </div>
  )
}
