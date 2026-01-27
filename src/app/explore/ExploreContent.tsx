'use client'

import { useState } from 'react'
import { useUser } from '@stackframe/stack'
import { Header } from '@/components/Header'
import Globe2D3DShell from '@/components/clickable-globe/Globe2D3DShell'

// ✅ Match Globe2D3DShell mode naming
type ExploreMode = 'globe' | 'map'

type ExploreState = {
  mode: ExploreMode
  selectedRegion?: string | null
  selectedContinent?: string | null
}

export default function ExploreContent() {
  const user = useUser()
  let hasPermissions = false

  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
    hasPermissions = team ? !!user.usePermission(team, 'team_member') : false
  }

  // ✅ Shared state (mode must NOT be optional)
  const [exploreState, setExploreState] = useState<ExploreState>({
    mode: 'globe',
    selectedRegion: null,
    selectedContinent: null,
  })

  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="z-49 relative">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
          isExplorePage={true}
          exploreState={exploreState.mode}
          // setExploreState={setExploreState}
        />
      </div>

      {/* Globe */}
      <div className="flex-grow w-full relative overflow-hidden">
        <Globe2D3DShell
          // exploreState={exploreState}
          setExploreState={setExploreState}
        />
      </div>
    </div>
  )
}
