"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useCanvas, CanvasBoard } from '@/lib/canvas-context'
import { useDashboard } from '@/lib/dashboard-context'

interface CanvasShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string | null
}

export function CanvasShareModal({ open, onOpenChange, boardId }: CanvasShareModalProps) {
  const { boards, updateBoard } = useCanvas()
  const { selectedAccountId } = useDashboard()
  const [sharingMode, setSharingMode] = useState<'private' | 'team' | 'public' | 'custom'>('private')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([])

  const board = boards.find(b => b.id === boardId)

  useEffect(() => {
    if (board) {
      setSharingMode(board.sharing_mode)
      setSelectedUsers(board.allowed_users || [])
    }
  }, [board])

  useEffect(() => {
    if (open && sharingMode === 'custom') {
      // Load users from account
      fetch(`/api/team/members?accountId=${selectedAccountId}`)
        .then(res => res.json())
        .then(data => {
          setAvailableUsers(data.members || [])
        })
        .catch(console.error)
    }
  }, [open, sharingMode, selectedAccountId])

  const handleSave = async () => {
    if (!boardId) return

    await updateBoard(boardId, {
      sharing_mode: sharingMode,
      allowed_users: sharingMode === 'custom' ? selectedUsers : [],
    })

    onOpenChange(false)
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription>
            Control who can view and edit this canvas board
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={sharingMode} onValueChange={(v: any) => setSharingMode(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="private" />
              <Label htmlFor="private" className="cursor-pointer">
                <div>
                  <div className="font-medium">Private</div>
                  <div className="text-xs text-muted-foreground">Only you can access</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="team" id="team" />
              <Label htmlFor="team" className="cursor-pointer">
                <div>
                  <div className="font-medium">Team</div>
                  <div className="text-xs text-muted-foreground">Anyone in your account can access</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="cursor-pointer">
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-xs text-muted-foreground">Anyone with the link can view (read-only)</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">
                <div>
                  <div className="font-medium">Custom</div>
                  <div className="text-xs text-muted-foreground">Select specific users</div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          {sharingMode === 'custom' && (
            <div className="space-y-2 mt-4">
              <Label>Select Users</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {availableUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <Label htmlFor={`user-${user.id}`} className="cursor-pointer">
                      {user.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sharingMode === 'public' && board && (
            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/canvas/public/${board.id}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/canvas/public/${board.id}`)
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

