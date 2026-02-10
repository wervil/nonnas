'use client'

import { Header } from '@/components/Header'
import Globe2D3DShell from '@/components/clickable-globe/Globe2D3DShell'
import { useUser } from '@stackframe/stack'
import { useState } from 'react'

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
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden ">
      {/* Header */}
      <div className="z-49 relative shrink-0">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
          isExplorePage={true}
          exploreState={exploreState.mode}
        // setExploreState={setExploreState}
        />
      </div>

      {/* Globe / Map - takes remaining space; needs parent with defined height for h-full to work */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        <Globe2D3DShell
          // exploreState={exploreState}
          setExploreState={setExploreState}
        />
      </div>
    </div>
  )
}
