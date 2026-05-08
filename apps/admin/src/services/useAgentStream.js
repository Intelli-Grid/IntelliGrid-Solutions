// apps/admin/src/services/useAgentStream.js
// War Room — SSE hook for live agent log streaming.
// Connects to the backend /api/v1/admin/war-room/stream endpoint.
// Returns an array of the last 100 events, newest first.

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

/**
 * @param {string} apiUrl - The backend base URL (e.g. import.meta.env.VITE_API_URL)
 * @returns {{ events: Array, connected: boolean, reconnect: function }}
 */
export function useAgentStream(apiUrl) {
  const { getToken } = useAuth()
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)

  const connect = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      // EventSource does not support custom headers — pass token as query param
      const url = `${apiUrl}/api/v1/admin/war-room/stream?clerk_token=${encodeURIComponent(token)}`
      const source = new EventSource(url, { withCredentials: true })

      source.onopen = () => setConnected(true)

      source.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          // Ignore heartbeat pings (they come as comments, not messages, but guard anyway)
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
  }, [apiUrl, getToken])

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
