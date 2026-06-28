import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, X } from 'lucide-react'

export default function VoiceInput({ onTranscript, onClose }) {
  const [state, setState] = useState('idle') // idle | listening | processing | error
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef(null)

  const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

  useEffect(() => {
    if (!isSupported) {
      setErrorMsg('Voice input not supported in this browser. Try Chrome.')
      setState('error')
      return
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-IN'     // Indian English — understands crop names
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState('listening')
      setTranscript('')
      setInterimText('')
    }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += text
        } else {
          interim += text
        }
      }
      setTranscript(prev => prev + final)
      setInterimText(interim)
    }

    recognition.onend = () => {
      setState('processing')
      setInterimText('')
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setErrorMsg('No speech detected. Tap mic and speak clearly.')
      } else if (event.error === 'not-allowed') {
        setErrorMsg('Microphone permission denied. Please allow mic access.')
      } else {
        setErrorMsg(`Error: ${event.error}`)
      }
      setState('error')
    }

    recognitionRef.current = recognition

    // Auto-start
    try { recognition.start() } catch (e) {}

    return () => {
      try { recognition.stop() } catch (e) {}
    }
  }, [])

  // When processing done, send transcript up
  useEffect(() => {
    if (state === 'processing' && transcript.trim()) {
      const timer = setTimeout(() => {
        onTranscript(transcript.trim())
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [state, transcript])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (state === 'listening') {
      recognitionRef.current.stop()
    } else {
      setTranscript('')
      setErrorMsg('')
      setState('idle')
      try { recognitionRef.current.start() } catch (e) {}
    }
  }

  return (
    <div className="fixed inset-0 bg-forest-950/95 backdrop-blur-sm z-50 
                    flex flex-col items-center justify-center gap-6 animate-fade-in">
      
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-forest-500 hover:text-white 
                   transition-colors p-2"
      >
        <X size={24} />
      </button>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-white font-semibold text-lg">Voice Input</h2>
        <p className="text-forest-400 text-sm mt-1">
          {state === 'idle'       && 'Tap the mic to start speaking'}
          {state === 'listening'  && 'Listening... speak now'}
          {state === 'processing' && 'Processing your voice...'}
          {state === 'error'      && errorMsg}
        </p>
      </div>

      {/* Mic button */}
      <button
        onClick={toggleListening}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center 
          transition-all duration-300 active:scale-90
          ${state === 'listening'
            ? 'bg-gold-500 text-forest-900 animate-pulse-mic'
            : state === 'error'
            ? 'bg-red-500/30 text-red-400 border-2 border-red-500/50'
            : 'bg-forest-700 text-forest-300 hover:bg-forest-600 border-2 border-forest-500/50'
          }
        `}
      >
        {state === 'listening' ? <MicOff size={36} /> : <Mic size={36} />}
      </button>

      {/* Waveform visualizer */}
      {state === 'listening' && (
        <div className="flex items-center gap-1.5 h-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="voice-bar" />
          ))}
        </div>
      )}

      {/* Live transcript */}
      {(transcript || interimText) && (
        <div className="glass rounded-2xl px-5 py-3 max-w-xs text-center animate-fade-in">
          <p className="text-white text-sm leading-relaxed">
            {transcript}
            <span className="text-forest-400">{interimText}</span>
          </p>
        </div>
      )}

      {/* Processing spinner */}
      {state === 'processing' && (
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="thinking-dot"
                 style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      )}

      {/* Hint */}
      <p className="text-forest-600 text-xs text-center max-w-[200px]">
        Try: "What's the wheat price in Punjab?" or "Weather this week"
      </p>
    </div>
  )
}
