import { useState, useEffect } from 'react'
import { MapPin, Droplets, Wind, Thermometer, RefreshCw } from 'lucide-react'

const CONDITION_ICONS = {
  'Clear sky ☀️':        '☀️',
  'Partly cloudy ⛅':   '⛅',
  'Foggy 🌫️':           '🌫️',
  'Drizzle 🌦️':         '🌦️',
  'Rain 🌧️':            '🌧️',
  'Snow ❄️':             '❄️',
  'Rain showers 🌧️':    '🌧️',
  'Thunderstorm ⛈️':    '⛈️',
  'Variable 🌤️':        '🌤️',
}

const LOCATIONS = [
  'Lucknow', 'Delhi', 'Chandigarh', 'Amritsar', 'Ludhiana',
  'Jaipur', 'Bhopal', 'Indore', 'Nagpur', 'Pune',
  'Mumbai', 'Hyderabad', 'Bangalore', 'Kolkata', 'Patna'
]

export default function WeatherCards() {
  const [location, setLocation] = useState('Lucknow')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(0)

  const fetchWeather = async (loc) => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Get weather forecast for ${loc} for 7 days`,
          session_id: `weather-${loc}`
        })
      })
      if (!resp.ok) throw new Error('Backend error')
      const json = await resp.json()

      // Parse weather data from agent response
      // The agent returns structured text; we also call the MCP tool directly
      // For the card view, call weather tool directly via a dedicated endpoint
      const weatherResp = await fetch('/api/weather?location=' + encodeURIComponent(loc))
      if (weatherResp.ok) {
        const weatherData = await weatherResp.json()
        setData(weatherData)
      } else {
        // Fallback: use agent response text
        setData({ response: json.response, forecast: [] })
      }
    } catch (e) {
      setError('Could not fetch weather. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWeather(location) }, [location])

  const dayName = (dateStr, i) => {
    if (i === 0) return 'Today'
    if (i === 1) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' })
  }

  const rainColor = (mm) => {
    if (!mm || mm < 1) return 'text-forest-600'
    if (mm < 10) return 'text-blue-400'
    if (mm < 30) return 'text-blue-300'
    return 'text-blue-200 font-semibold'
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto chat-scroll pb-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            🌤️
          </div>
          <div>
            <h2 className="text-white font-semibold">WeatherWatch</h2>
            <p className="text-forest-400 text-xs">7-day farming forecast</p>
          </div>
        </div>
        <button
          onClick={() => fetchWeather(location)}
          disabled={loading}
          className="btn-ghost p-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Location selector */}
      <div className="glass rounded-xl p-1 flex items-center gap-2">
        <MapPin size={14} className="text-forest-400 ml-2 flex-shrink-0" />
        <select
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="bg-transparent text-white text-sm flex-1 outline-none 
                     cursor-pointer py-1.5"
        >
          {LOCATIONS.map(l => (
            <option key={l} value={l} className="bg-forest-800 text-white">{l}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="text-4xl animate-pulse">🌤️</div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="thinking-dot" 
                   style={{ animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <p className="text-forest-400 text-sm">Fetching forecast...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => fetchWeather(location)} className="btn-ghost text-sm mt-2">
            Retry
          </button>
        </div>
      )}

      {/* Forecast cards */}
      {data?.forecast?.length > 0 && !loading && (
        <>
          {/* Scrollable day strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {data.forecast.map((day, i) => {
              const icon = CONDITION_ICONS[day.condition] || '🌤️'
              const isSelected = selected === i
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`weather-card transition-all flex-shrink-0
                    ${isSelected
                      ? 'border-forest-500 bg-forest-700/40 scale-105'
                      : 'border-transparent hover:border-forest-600/40'
                    }`}
                >
                  <span className="text-forest-400 text-xs font-medium">
                    {dayName(day.date, i)}
                  </span>
                  <span className="text-2xl">{icon}</span>
                  <span className="text-white text-sm font-bold">
                    {Math.round(day.max_temp_c)}°
                  </span>
                  <span className={`text-xs ${rainColor(day.rainfall_mm)}`}>
                    {day.rainfall_mm > 0 ? `${day.rainfall_mm}mm` : '—'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {data.forecast[selected] && (() => {
            const day = data.forecast[selected]
            const icon = CONDITION_ICONS[day.condition] || '🌤️'
            return (
              <div className="glass rounded-2xl p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-forest-400 text-xs">
                      {new Date(day.date).toLocaleDateString('en-IN', { 
                        weekday: 'long', day: 'numeric', month: 'short' 
                      })}
                    </p>
                    <p className="text-white font-medium">{day.condition}</p>
                  </div>
                  <span className="text-5xl">{icon}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-forest-800/50 rounded-xl p-3 text-center">
                    <Thermometer size={16} className="text-red-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{Math.round(day.max_temp_c)}°C</p>
                    <p className="text-forest-500 text-xs">Max</p>
                  </div>
                  <div className="bg-forest-800/50 rounded-xl p-3 text-center">
                    <Droplets size={16} className="text-blue-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{day.rainfall_mm || 0}mm</p>
                    <p className="text-forest-500 text-xs">Rain</p>
                  </div>
                  <div className="bg-forest-800/50 rounded-xl p-3 text-center">
                    <Wind size={16} className="text-forest-400 mx-auto mb-1" />
                    <p className="text-white font-bold">{day.wind_kmh || 0}</p>
                    <p className="text-forest-500 text-xs">km/h</p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Farming advisories */}
          {data.farming_advisory?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-forest-400 text-xs font-medium uppercase tracking-wide px-1">
                Farming Advisory
              </p>
              {data.farming_advisory.map((tip, i) => (
                <div key={i} className="glass rounded-xl p-3 text-sm text-forest-200">
                  {tip}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Fallback text response */}
      {data?.response && !data.forecast?.length && !loading && (
        <div className="glass rounded-2xl p-4 text-sm text-forest-200 
                        leading-relaxed whitespace-pre-wrap">
          {data.response}
        </div>
      )}
    </div>
  )
}
