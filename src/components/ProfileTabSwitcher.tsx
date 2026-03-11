'use client'

import { Heart, ListChecks, User } from 'lucide-react'
import { useState } from 'react'

interface ProfileTabSwitcherProps {
  children: (activeTab: 'profile' | 'recipes' | 'activity') => React.ReactNode
}

export function ProfileTabSwitcher({ children }: ProfileTabSwitcherProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'recipes' | 'activity'>('profile')

  const tabs = [
    {
      id: 'profile' as const,
      label: 'My Profile',
      icon: User,
    },
    {
      id: 'recipes' as const,
      label: 'My Recipes',
      icon: Heart,
    },
    {
      id: 'activity' as const,
      label: 'My Activity',
      icon: ListChecks,
    },
  ]

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex  mb-8 w-full overflow-x-auto justify-between scrollbar-hide gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-2 text-sm font-(--font-bell) transition-all duration-200 relative whitespace-nowrap flex-1 justify-center
                ${isActive
                  ? 'bg-[#FFCCC8] text-gray-900'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children(activeTab)}
      </div>
    </div>
  )
}
