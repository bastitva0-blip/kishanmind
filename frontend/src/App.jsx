import { useState } from 'react'
import { MessageSquare, TrendingUp, CloudSun, BookOpen, Leaf } from 'lucide-react'
import ChatWindow from './components/ChatWindow'
import CropUpload from './components/CropUpload'
import WeatherCards from './components/WeatherCards'
import PriceTable from './components/PriceTable'
import SchemeCards from './components/SchemeCards'
import InstallBanner from './components/InstallBanner'

const TABS = [
  { id: 'chat',    label: 'Chat',     icon: MessageSquare, emoji: '💬' },
  { id: 'scan',    label: 'CropDoc',  icon: Leaf,          emoji: '🌿' },
  { id: 'prices',  label: 'Prices',   icon: TrendingUp,    emoji: '💰' },
  { id: 'weather', label: 'Weather',  icon: CloudSun,      emoji: '🌤️' },
  { id: 'schemes', label: 'Schemes',  icon: BookOpen,      emoji: '🏛️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('chat')

  const renderTab = () => {
    switch (activeTab) {
      case 'chat':    return <ChatWindow />
      case 'scan':    return <div className="px-4 pt-4 h-full overflow-hidden"><CropUpload /></div>
      case 'prices':  return <div className="px-4 pt-4 h-full overflow-hidden"><PriceTable /></div>
      case 'weather': return <div className="px-4 pt-4 h-full overflow-hidden"><WeatherCards /></div>
      case 'schemes': return <div className="px-4 pt-4 h-full overflow-hidden"><SchemeCards /></div>
      default:        return <ChatWindow />
    }
  }

  return (
    <div className="flex flex-col h-full bg-forest-900 font-sans max-w-md mx-auto 
                    relative overflow-hidden">
      
      {/* Top header */}
      <header className="flex-shrink-0 px-4 pt-safe-top pt-4 pb-3 
                         border-b border-forest-800/50 bg-forest-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-forest-600 to-forest-800 
                            flex items-center justify-center text-lg shadow-lg animate-glow">
              🌾
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">KisanMind</h1>
              <p className="gradient-text text-xs font-medium">AI Farming Assistant</p>
            </div>
          </div>

          {/* Online indicator */}
          <div className="flex items-center gap-1.5 bg-forest-800/60 px-3 py-1.5 
                          rounded-full border border-forest-700/40">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-forest-400 text-xs">AI Online</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden relative">
        {renderTab()}
      </main>

      {/* Bottom navigation */}
      <nav className="flex-shrink-0 border-t border-forest-800/60 
                      bg-forest-900/95 backdrop-blur-sm px-2 pb-safe-bottom">
        <div className="flex items-center">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${isActive ? 'active' : ''}`}
              >
                <span className={`text-lg transition-transform duration-200
                                  ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {tab.emoji}
                </span>
                <span className={`text-[10px] font-medium transition-colors
                                  ${isActive ? 'text-forest-300' : 'text-forest-600'}`}>
                  {tab.label}
                </span>
                {/* Active dot */}
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-forest-400 mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* PWA Install Banner */}
      <InstallBanner />
    </div>
  )
}
