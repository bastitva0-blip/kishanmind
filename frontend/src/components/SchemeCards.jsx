import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Phone, Search } from 'lucide-react'

const QUICK_FILTERS = [
  { label: '💰 Income support', query: 'income support PM-KISAN' },
  { label: '🛡️ Crop insurance', query: 'crop insurance PMFBY' },
  { label: '🏦 Loans & credit', query: 'loan credit KCC' },
  { label: '💧 Irrigation', query: 'irrigation drip sprinkler' },
  { label: '🌱 Organic farming', query: 'organic farming' },
  { label: '📱 Sell online', query: 'sell online eNAM market' },
]

function SchemeCard({ scheme }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="scheme-card animate-slide-up">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full 
                             bg-forest-700/50 text-forest-300 uppercase tracking-wide">
              {scheme.type}
            </span>
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug">
            {scheme.name}
          </h3>
          <p className="text-gold-400 text-xs mt-1 font-medium line-clamp-2">
            {scheme.benefit}
          </p>
        </div>
        <div className="flex-shrink-0 mt-1 text-forest-500">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="mt-3 pt-3 border-t border-forest-700/40 flex flex-col gap-3 
                        animate-fade-in">

          {/* Eligibility */}
          <div>
            <p className="text-forest-400 text-xs font-medium uppercase tracking-wide mb-1">
              ✅ Who can apply
            </p>
            <p className="text-forest-200 text-sm leading-relaxed">
              {scheme.eligibility}
            </p>
          </div>

          {/* How to apply */}
          <div>
            <p className="text-forest-400 text-xs font-medium uppercase tracking-wide mb-1">
              📝 How to apply
            </p>
            <p className="text-forest-200 text-sm leading-relaxed">
              {scheme.how_to_apply}
            </p>
          </div>

          {/* Documents */}
          <div>
            <p className="text-forest-400 text-xs font-medium uppercase tracking-wide mb-1">
              📁 Documents needed
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scheme.documents?.map((doc, i) => (
                <span key={i} className="bg-forest-700/40 text-forest-300 text-xs 
                                          px-2.5 py-1 rounded-lg">
                  {doc}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-2 pt-1">
            <a
              href={`tel:${scheme.helpline?.replace(/[^0-9-]/g, '')}`}
              className="flex items-center gap-1.5 bg-forest-700/40 hover:bg-forest-600/40 
                         text-forest-300 text-xs px-3 py-2 rounded-xl transition-colors flex-1
                         justify-center"
            >
              <Phone size={12} />
              {scheme.helpline}
            </a>
            {scheme.portal && (
              <a
                href={scheme.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-gold-500/20 hover:bg-gold-500/30 
                           text-gold-400 text-xs px-3 py-2 rounded-xl transition-colors flex-1
                           justify-center"
              >
                <ExternalLink size={12} />
                Official Portal
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SchemeCards() {
  const [query, setQuery] = useState('')
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const fetchSchemes = async (q) => {
    const searchQuery = q || query
    if (!searchQuery.trim() && searched) return

    setLoading(true)
    setError('')
    setSearched(true)

    try {
      const resp = await fetch('/api/schemes?' + new URLSearchParams({ query: searchQuery }))
      if (!resp.ok) throw new Error('Backend error')
      const data = await resp.json()
      setSchemes(data.schemes || [])
    } catch (e) {
      setError('Could not fetch schemes. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickFilter = (q) => {
    setQuery(q)
    fetchSchemes(q)
  }

  // Load all schemes on mount
  if (!searched && !loading) {
    fetchSchemes('')
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto chat-scroll pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          🏛️
        </div>
        <div>
          <h2 className="text-white font-semibold">SchemeScout</h2>
          <p className="text-forest-400 text-xs">Government benefits for farmers</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 glass rounded-xl flex items-center gap-2 px-3">
          <Search size={14} className="text-forest-400 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchSchemes()}
            placeholder="Search schemes..."
            className="bg-transparent text-white text-sm flex-1 outline-none py-2.5
                       placeholder-forest-600"
          />
        </div>
        <button onClick={() => fetchSchemes()} className="btn-primary px-4">
          Search
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => handleQuickFilter(f.query)}
            className="bg-forest-800/60 hover:bg-forest-700/60 text-forest-300 
                       hover:text-white text-xs px-3 py-1.5 rounded-full 
                       border border-forest-700/40 transition-all active:scale-95"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="thinking-dot" 
                   style={{ animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <p className="text-forest-400 text-sm">Finding schemes...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && schemes.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-forest-500 text-xs">
            {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} found
          </p>
          {schemes.map((scheme, i) => (
            <SchemeCard key={i} scheme={scheme} />
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && searched && schemes.length === 0 && !error && (
        <div className="flex flex-col items-center py-8 gap-3 text-center">
          <div className="text-4xl">🔍</div>
          <p className="text-forest-400 text-sm">
            No schemes found for "{query}".<br />
            Try different keywords.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="glass rounded-xl p-3 flex gap-3 items-center">
        <span className="text-xl">💡</span>
        <div>
          <p className="text-forest-300 text-xs font-medium">Need personal help?</p>
          <p className="text-forest-500 text-xs">
            Visit your nearest CSC or call Kisan Call Centre:
            <span className="text-gold-400 font-medium"> 1800-180-1551</span>
          </p>
        </div>
      </div>
    </div>
  )
}
