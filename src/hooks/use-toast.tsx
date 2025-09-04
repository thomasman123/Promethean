export function useToast() {
  return {
    toast: ({ title, description, variant }: {
      title: string
      description?: string
      variant?: 'default' | 'destructive'
    }) => {
      // For now, just log to console
      // In a real implementation, you would show a toast notification
      console.log('Toast:', { title, description, variant })
    }
  }
} 