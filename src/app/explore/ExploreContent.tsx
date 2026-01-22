'use client'

import { useUser } from '@stackframe/stack'
import { Header } from '@/components/Header'
import Globe2D3DShell from '@/components/clickable-globe/Globe2D3DShell'

export default function ExploreContent() {
    const user = useUser()
    let hasPermissions = false

    if (user) {
        const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
        hasPermissions = team ? !!user.usePermission(team, 'team_member') : false
    }

    return (
        <div className="flex flex-col h-screen w-full bg-[#0a0a0a] overflow-hidden">
            {/* Header with high z-index to stay above map elements if needed */}
            <div className="z-49 relative">
                <Header
                    hasAdminAccess={hasPermissions}
                    user={user}
                    isExplorePage={true}
                // Search and filter options omitted to hide them on Explore page
                // as they are specific to the Recipe Book
                />
            </div>

            <div className="flex-grow w-full relative overflow-hidden">
                <Globe2D3DShell />
            </div>
        </div>
    )
}
