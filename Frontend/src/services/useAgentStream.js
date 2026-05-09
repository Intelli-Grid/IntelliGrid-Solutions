// Frontend/src/services/useAgentStream.js
// War Room — SSE hook for live agent log streaming.
// Connects to the backend /api/v1/admin/war-room/stream endpoint.
// Uses the main frontend's Clerk useAuth() — no satellite dependency.
// Returns an array of the last 100 events, newest first.

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://backend.intelligrid.online/api/v1')
  .replace(/\/+$/, '')

/**
 * @returns {{ events: Array, connected: boolean, reconnect: function }}
 */
export function useAgentStream() {
  const { getToken } = useAuth()
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)

  const connect = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      // EventSource does not support custom headers — pass token as query param
      const url = `${BASE_URL}/admin/war-room/stream?clerk_token=${encodeURIComponent(token)}`
      const source = new EventSource(url, { withCredentials: true })

      source.onopen = () => setConnected(true)

      source.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (!event || !event.type) return
          setEvents((prev) => [event, ...prev].slice(0, 100))
        } catch (_) {}
      }

      source.onerror = () => {
        setConnected(false)
        source.close()
        // Auto-reconnect after 5 seconds
        setTimeout(connect, 5000)
      }

      return () => {
        source.close()
        setConnected(false)
      }
    } catch (err) {
      console.error('[useAgentStream] Connection error:', err.message)
    }
  }, [getToken])

  useEffect(() => {
    let cleanup
    connect().then((fn) => { cleanup = fn })
    return () => { if (cleanup) cleanup() }
  }, [connect])

  const reconnect = useCallback(() => {
    setEvents([])
    connect()
  }, [connect])

  return { events, connected, reconnect }
}
