import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show banner after 3 seconds
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setVisible(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  if (!visible || installed) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 animate-slide-up">
      <div className="glass bg-forest-800/95 rounded-2xl p-4 border border-forest-500/40 
                      shadow-2xl shadow-forest-900/80 flex items-center gap-3">
        {/* App icon */}
        <div className="w-12 h-12 bg-forest-700 rounded-xl flex items-center 
                        justify-center text-2xl flex-shrink-0 animate-glow">
          🌾
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Add to Home Screen</p>
          <p className="text-forest-400 text-xs mt-0.5">
            Works offline · No app store needed
          </p>
        </div>

        <button
          onClick={handleInstall}
          className="bg-gold-500 hover:bg-gold-400 text-forest-900 font-bold 
                     text-xs px-3 py-2 rounded-xl transition-all active:scale-95
                     flex items-center gap-1.5 flex-shrink-0"
        >
          <Download size={12} />
          Install
        </button>

        <button
          onClick={() => setVisible(false)}
          className="text-forest-500 hover:text-forest-300 p-1 flex-shrink-0
                     transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
