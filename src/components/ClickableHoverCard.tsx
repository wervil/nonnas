"use client"

import { useState } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface ClickableHoverCardProps {
  trigger: React.ReactNode
  content: React.ReactNode
}

export function ClickableHoverCard({ trigger, content }: ClickableHoverCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={0} closeDelay={100}>
      <HoverCardTrigger 
        asChild
        onClick={(e) => {
          e.preventDefault()
          setOpen(!open)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center"
        className="max-w-[320px] whitespace-normal text-sm capitalize z-[9999]"
        onPointerDownOutside={() => setOpen(false)}
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  )
}

