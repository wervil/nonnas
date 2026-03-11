"use client"

import { Heart, Users } from "lucide-react";
import { useState } from "react";

interface AdminTabSwitcherProps {
  children: (activeTab: 'recipes' | 'users') => React.ReactNode
  isSuperAdmin: boolean
  copyInviteButton?: React.ReactNode
}

export function AdminTabSwitcher({ children, isSuperAdmin, copyInviteButton }: AdminTabSwitcherProps) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'users'>('recipes')

  const tabs = [
    {
      id: 'recipes' as const,
      label: 'Recipes',
      icon: Heart,
    },
    {
      id: 'users' as const,
      label: 'Users',
      icon: Users,
      disabled: !isSuperAdmin,
    },
  ]

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex mb-8 w-full overflow-x-auto justify-between scrollbar-hide gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDisabled = tab.disabled

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-6 py-2 text-sm font-(--font-bell) transition-all duration-200 relative whitespace-nowrap flex-1 justify-center
                ${isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isActive
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
      {copyInviteButton && (
        <div className="mt-4 mb-2">
          {copyInviteButton}
        </div>
      )}
      <div className="mt-6">
        {children(activeTab)}
      </div>
    </div>
  )
}
