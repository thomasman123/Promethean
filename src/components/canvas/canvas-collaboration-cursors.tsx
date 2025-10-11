"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Collaborator } from '@/lib/canvas-context'

interface CanvasCollaborationCursorsProps {
  collaborators: Collaborator[]
  currentUserId: string
}

export function CanvasCollaborationCursors({ 
  collaborators, 
  currentUserId 
}: CanvasCollaborationCursorsProps) {
  const [visibleCollaborators, setVisibleCollaborators] = useState<Collaborator[]>([])

  useEffect(() => {
    // Filter out current user and only show active collaborators (last seen within 30 seconds)
    const now = new Date()
    const active = collaborators.filter(c => {
      if (c.user_id === currentUserId) return false
      const lastSeen = new Date(c.online_at)
      const diff = (now.getTime() - lastSeen.getTime()) / 1000
      return diff < 30
    })
    setVisibleCollaborators(active)
  }, [collaborators, currentUserId])

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <AnimatePresence>
        {visibleCollaborators.map((collaborator) => (
          <motion.div
            key={collaborator.user_id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              left: collaborator.cursor_position.x,
              top: collaborator.cursor_position.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Cursor SVG */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M5.65376 12.3673L13.1526 18.2838C13.8304 18.8138 14.8054 18.4089 14.9439 17.5589L16.7715 6.46124C16.9183 5.56247 16.0288 4.88868 15.2074 5.26928L4.10945 10.4054C3.25756 10.8019 3.22885 11.9708 4.05779 12.4055L5.65376 12.3673Z"
                fill={collaborator.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* Name label */}
            <div
              className="mt-1 ml-6 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.user_name || 'Anonymous'}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

