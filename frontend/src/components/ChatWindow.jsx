import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Paperclip, X } from 'lucide-react'
import VoiceInput from './VoiceInput'

// Map agent name → visual style
const AGENT_STYLES = {
  CropDoc:      { color: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-400', emoji: '🌿' },
  MarketMind:   { color: 'border-gold-500/50',    badge: 'bg-gold-500/20    text-gold-400',    emoji: '💰' },
  WeatherWatch: { color: 'border-blue-500/50',    badge: 'bg-blue-500/20    text-blue-400',    emoji: '🌤️' },
  SchemeScout:  { color: 'border-purple-500/50',  badge: 'bg-purple-500/20  text-purple-400',  emoji: '🏛️' },
  KisanMind:    { color: 'border-forest-500/50',  badge: 'bg-forest-500/20  text-forest-400',  emoji: '🌾' },
  System:       { color: 'border-red-500/30',     badge: 'bg-red-500/20     text-red-400',     emoji: '⚠️' },
}

const SUGGESTIONS = [
  "What's the wheat price in Punjab today?",
  "Will it rain in Lucknow this week?",
  "How do I apply for PM-KISAN?",
  "My tomato plant has yellow leaves — what disease?",
  "Best time to harvest sugarcane?",
  "Which mandi gives best price for onion in Maharashtra?",
]

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-forest-700/50 flex items-center 
                      justify-center text-sm flex-shrink-0">
        🌾
      </div>
      <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5 items-center h-4">
          {[0,1,2].map(i => (
            <div key={i} className="thinking-dot" 
                 style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const style = AGENT_STYLES[msg.agent] || AGENT_STYLES.KisanMind

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="bg-forest-700/70 text-white rounded-2xl rounded-br-sm 
                        px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 animate-slide-up">
      {/* Agent avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                       text-sm flex-shrink-0 ${style.badge}`}>
        {style.emoji}
      </div>

      <div className="flex-1 min-w-0">
        {/* Agent badge */}
        {msg.agent && msg.agent !== 'KisanMind' && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium 
                            px-2 py-0.5 rounded-full mb-1 ${style.badge}`}>
            {style.emoji} {msg.agent}
          </span>
        )}

        {/* Message card */}
        <div className={`glass rounded-2xl rounded-bl-sm p-3 border ${style.color} 
                         text-sm text-forest-100 leading-relaxed whitespace-pre-wrap
                         max-w-[90%]`}>
          {msg.content}
        </div>

        {/* Timestamp */}
        {msg.time && (
          <p className="text-forest-700 text-xs mt-1 ml-1">
            {msg.time}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      agent: 'KisanMind',
      content: `🌾 Namaste! I'm KisanMind, your AI farming assistant.

I can help you with:
  🌿 Crop disease diagnosis — share a photo!
  💰 Today's mandi prices across India
  🌤️ Weather forecast & farming advice
  🏛️ Government schemes you qualify for

What can I help you with today?`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const bottomRef = useRef()
  const inputRef = useRef()

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || thinking) return

    setInput('')
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    setMessages(prev => [...prev, {
      role: 'user', content: userText, time: now
    }])
    setThinking(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, session_id: sessionId })
      })

      if (!resp.ok) throw new Error(`Server error ${resp.status}`)
      const data = await resp.json()

      if (data.session_id) setSessionId(data.session_id)

      setMessages(prev => [...prev, {
        role: 'assistant',
        agent: data.agent_used || 'KisanMind',
        content: data.response || 'Sorry, I could not process that.',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        agent: 'System',
        content: `❌ Could not reach backend.\n\nMake sure it's running:\n\`\`\`\npython main.py\n\`\`\`\n\nError: ${e.message}`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }])
    } finally {
      setThinking(false)
    }
  }

  const handleVoiceTranscript = (text) => {
    setShowVoice(false)
    setInput(text)
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 py-3 flex flex-col gap-3">

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {thinking && <ThinkingBubble />}

        {/* Suggestion chips — show when only welcome message */}
        {messages.length === 1 && !thinking && (
          <div className="flex flex-col gap-2 mt-2 animate-fade-in">
            <p className="text-forest-500 text-xs text-center">Try asking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="bg-forest-800/60 hover:bg-forest-700/60 border border-forest-700/40
                             text-forest-300 hover:text-white text-xs px-3 py-1.5 rounded-full
                             transition-all active:scale-95 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-3 pb-3 pt-2 border-t border-forest-800/50">
        <div className="glass rounded-2xl flex items-end gap-2 px-3 py-2
                        border border-forest-700/40 focus-within:border-forest-500/60
                        transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              // Auto resize
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Ask about crops, prices, weather, schemes..."
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-forest-600
                       outline-none resize-none py-1.5 leading-relaxed min-h-[24px]"
            style={{ maxHeight: '100px' }}
          />

          {/* Voice button */}
          <button
            onClick={() => setShowVoice(true)}
            className="text-forest-500 hover:text-gold-400 transition-colors p-1.5
                       flex-shrink-0 active:scale-90"
            title="Voice input"
          >
            <Mic size={18} />
          </button>

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || thinking}
            className="bg-forest-600 hover:bg-forest-500 disabled:opacity-30 
                       disabled:cursor-not-allowed text-white p-1.5 rounded-xl 
                       transition-all flex-shrink-0 active:scale-90"
          >
            <Send size={16} />
          </button>
        </div>

        <p className="text-forest-700 text-xs text-center mt-1.5">
          Enter to send · Shift+Enter for new line · 🎤 for voice
        </p>
      </div>

      {/* Voice input overlay */}
      {showVoice && (
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          onClose={() => setShowVoice(false)}
        />
      )}
    </div>
  )
}
