'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'

export const Loading: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex items-center justify-center py-4 text-foreground/50">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">{text ?? 'Loading...'}</span>
    </div>
  )
}
