"use client"

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Collaborator } from '@/lib/canvas-context'

interface UseRealtimeCollaborationProps {
  boardId: string | null
  userId: string | null
  userName: string | null
  onElementChange?: (payload: any) => void
}

const CURSOR_UPDATE_THROTTLE = 200 // ms
const PRESENCE_HEARTBEAT = 5000 // ms

// Generate a random color for the user
function generateUserColor() {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function useRealtimeCollaboration({
  boardId,
  userId,
  userName,
  onElementChange,
}: UseRealtimeCollaborationProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<any>(null)
  const lastCursorUpdate = useRef<number>(0)
  const userColor = useRef<string>(generateUserColor())
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)

  // Update cursor position (throttled)
  const updateCursorPosition = useCallback((x: number, y: number) => {
    if (!channelRef.current || !boardId || !userId) return

    const now = Date.now()
    if (now - lastCursorUpdate.current < CURSOR_UPDATE_THROTTLE) return

    lastCursorUpdate.current = now

    channelRef.current.track({
      user_id: userId,
      user_name: userName,
      cursor_position: { x, y },
      color: userColor.current,
      online_at: new Date().toISOString(),
    })
  }, [boardId, userId, userName])

  // Initialize realtime connection (memoized to prevent reconnection loops)
  useEffect(() => {
    if (!boardId || !userId) {
      // Cleanup and return early if no board/user
      setIsConnected(false)
      setCollaborators([])
      return
    }
    
    console.log('🔌 [Realtime] Connecting to board:', boardId)

    const channel = supabase.channel(`board:${boardId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Subscribe to element changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_elements',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log('📝 [Realtime] Element change:', payload)
          if (onElementChange) {
            onElementChange(payload)
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        console.log('👥 [Realtime] Presence sync:', state)
        
        const collaboratorsList: Collaborator[] = []
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[]
          presences.forEach((presence) => {
            collaboratorsList.push({
              id: presence.user_id,
              board_id: boardId,
              user_id: presence.user_id,
              cursor_position: presence.cursor_position || { x: 0, y: 0 },
              current_selection: [],
              online_at: presence.online_at || new Date().toISOString(),
              color: presence.color || '#3b82f6',
              user_name: presence.user_name || 'Anonymous',
            })
          })
        })
        
        setCollaborators(collaboratorsList)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('✅ [Realtime] User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 [Realtime] User left:', key, leftPresences)
      })
      .subscribe((status) => {
        console.log('🔌 [Realtime] Subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')

        if (status === 'SUBSCRIBED') {
          // Initial presence broadcast
          channel.track({
            user_id: userId,
            user_name: userName,
            cursor_position: { x: 0, y: 0 },
            color: userColor.current,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    // Set up presence heartbeat
    heartbeatInterval.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track({
          user_id: userId,
          user_name: userName,
          cursor_position: { x: 0, y: 0 },
          color: userColor.current,
          online_at: new Date().toISOString(),
        })
      }
    }, PRESENCE_HEARTBEAT)

    // Cleanup
    return () => {
      console.log('🔌 [Realtime] Disconnecting from board:', boardId)
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId])

  // Track mouse movement
  useEffect(() => {
    if (!isConnected) return

    const handleMouseMove = (e: MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isConnected, updateCursorPosition])

  return {
    collaborators,
    isConnected,
    updateCursorPosition,
  }
}

