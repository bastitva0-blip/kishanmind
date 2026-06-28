import { useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, ShoppingBag } from 'lucide-react'

const COMMODITIES = [
  'Wheat', 'Rice', 'Maize', 'Tomato', 'Onion', 'Potato',
  'Soybean', 'Cotton', 'Sugarcane', 'Mustard', 'Arhar Dal',
  'Moong Dal', 'Urad Dal', 'Jowar', 'Bajra'
]

const STATES = [
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Maharashtra',
  'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Bihar',
  'West Bengal', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu'
]

export default function PriceTable() {
  const [commodity, setCommodity] = useState('Wheat')
  const [state, setState] = useState('Uttar Pradesh')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const fetchPrices = async () => {
    setLoading(true)
    setError('')
    setSearched(true)
    try {
      const resp = await fetch('/api/prices?' + new URLSearchParams({ commodity, state }))
      if (!resp.ok) throw new Error('Backend error')
      const json = await resp.json()
      setData(json)
    } catch (e) {
      setError('Could not fetch prices. Check if backend is running.')
    } finally {
      setLoading(false)
    }
  }

  // Find best and worst market
  const records = data?.records || []
  const parsePrice = (p) => parseInt(String(p).replace(/,/g, '')) || 0
  const sorted = [...records].sort((a, b) => parsePrice(b.modal_price) - parsePrice(a.modal_price))
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const allPrices = records.map(r => parsePrice(r.modal_price)).filter(Boolean)
  const avgPrice = allPrices.length 
    ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) 
    : 0

  const priceColor = (record) => {
    if (!best || !worst) return 'text-white'
    const p = parsePrice(record.modal_price)
    const bestP = parsePrice(best.modal_price)
    const worstP = parsePrice(worst.modal_price)
    if (p === bestP && bestP !== worstP) return 'text-emerald-400 font-bold'
    if (p === worstP && bestP !== worstP) return 'text-red-400'
    return 'text-white'
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto chat-scroll pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center">
          💰
        </div>
        <div>
          <h2 className="text-white font-semibold">MarketMind</h2>
          <p className="text-forest-400 text-xs">Live mandi prices · Agmarknet</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="glass rounded-xl flex-1 flex items-center gap-2 px-3">
            <ShoppingBag size={14} className="text-forest-400 flex-shrink-0" />
            <select
              value={commodity}
              onChange={e => setCommodity(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none 
                         cursor-pointer py-2.5"
            >
              {COMMODITIES.map(c => (
                <option key={c} value={c} className="bg-forest-800">{c}</option>
              ))}
            </select>
          </div>
          <div className="glass rounded-xl flex-1 flex items-center gap-2 px-3">
            <span className="text-forest-400 text-xs flex-shrink-0">📍</span>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none 
                         cursor-pointer py-2.5"
            >
              {STATES.map(s => (
                <option key={s} value={s} className="bg-forest-800">{s}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchPrices}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading 
            ? <><RefreshCw size={14} className="animate-spin" /> Fetching prices...</>
            : '🔍 Get Live Prices'
          }
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="text-4xl animate-pulse">💰</div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="thinking-dot" 
                   style={{ animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <p className="text-forest-400 text-sm">Checking Agmarknet...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="flex flex-col gap-3 animate-slide-up">

          {/* Summary cards */}
          {records.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="glass rounded-xl p-3 text-center">
                <TrendingUp size={14} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-emerald-400 font-bold text-sm">
                  ₹{parsePrice(best?.modal_price).toLocaleString('en-IN')}
                </p>
                <p className="text-forest-500 text-xs">Best</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <span className="text-gold-400 text-sm font-bold block mb-0.5">
                  ₹{avgPrice.toLocaleString('en-IN')}
                </span>
                <p className="text-forest-500 text-xs">Average</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <TrendingDown size={14} className="text-red-400 mx-auto mb-1" />
                <p className="text-red-400 font-bold text-sm">
                  ₹{parsePrice(worst?.modal_price).toLocaleString('en-IN')}
                </p>
                <p className="text-forest-500 text-xs">Lowest</p>
              </div>
            </div>
          )}

          {/* Best mandi highlight */}
          {best && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 
                            rounded-2xl p-3 flex items-center gap-3">
              <div className="text-2xl">🏆</div>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-400 font-bold text-sm">
                  Sell at {best.market}
                </p>
                <p className="text-forest-400 text-xs">{best.district} · Best price today</p>
              </div>
              <p className="text-emerald-400 font-bold">
                ₹{parsePrice(best.modal_price).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          {/* Price table */}
          {records.length > 0 ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-4 py-2 bg-forest-800/50 border-b border-forest-700/40
                              grid grid-cols-12 gap-2">
                <span className="col-span-5 text-forest-400 text-xs font-medium">Market</span>
                <span className="col-span-3 text-forest-400 text-xs font-medium text-right">Min</span>
                <span className="col-span-4 text-forest-400 text-xs font-medium text-right">Modal ▼</span>
              </div>
              <div className="divide-y divide-forest-800/40 max-h-64 overflow-y-auto chat-scroll">
                {sorted.map((rec, i) => (
                  <div key={i} className="px-4 py-2.5 grid grid-cols-12 gap-2 
                                          hover:bg-forest-800/30 transition-colors">
                    <div className="col-span-5 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{rec.market}</p>
                      <p className="text-forest-500 text-xs truncate">{rec.district}</p>
                    </div>
                    <span className="col-span-3 text-forest-400 text-xs text-right self-center">
                      ₹{parsePrice(rec.min_price).toLocaleString('en-IN')}
                    </span>
                    <span className={`col-span-4 text-sm text-right self-center ${priceColor(rec)}`}>
                      ₹{parsePrice(rec.modal_price).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-4 text-center text-forest-400 text-sm">
              {data.message || 'No price data found. Try a different commodity or state.'}
            </div>
          )}

          {/* Footer note */}
          <p className="text-forest-600 text-xs text-center">
            Prices in ₹/quintal (100 kg) · Source: Agmarknet / data.gov.in
          </p>
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <div className="text-5xl">📊</div>
          <p className="text-forest-400 text-sm">
            Select a commodity and state, then tap<br />"Get Live Prices"
          </p>
        </div>
      )}
    </div>
  )
}
