'use client'

import { RecipesList } from '@/components/RecipesList'
import Button from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Recipe } from '@/db/schema'
import { countriesData } from '@/utils/countries'
import { Copy, Download } from 'lucide-react'
import { useEffect } from 'react'

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\/?(p|br|div|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function addSection(lines: string[], label: string, content: string | null | undefined) {
  if (!content) return
  const clean = stripHtml(content)
  if (!clean) return
  lines.push(`   ${label}:`)
  clean.split('\n').forEach((line) => lines.push(`      ${line}`))
  lines.push('')
}

function exportRecipesToTxt(recipes: Recipe[], filename: string, countryLabel?: string) {
  if (!recipes.length) return

  const lines: string[] = []

  const header = countryLabel
    ? `Nonna's Recipes - ${countryLabel}`
    : `Nonna's Recipes - All Countries`
  lines.push(header)
  lines.push('='.repeat(header.length))
  lines.push(`Total: ${recipes.length} recipes`)
  lines.push('')
  lines.push('')

  const numWidth = String(recipes.length).length

  recipes.forEach((r, i) => {
    const num = String(i + 1).padStart(numWidth, ' ')
    const grandmother = r.grandmotherTitle || ''
    const fullName = [grandmother, r.firstName, r.lastName].filter(Boolean).join(' ')
    const location = [r.country, r.region, r.city].filter(Boolean).join(', ')

    lines.push(`${num}.  ${fullName}`)
    lines.push(`    Location: ${location}`)
    lines.push('')

    addSection(lines, 'Bio', r.history)
    addSection(lines, 'History', r.geo_history)

    if (r.recipeTitle) {
      lines.push(`   Recipe: ${r.recipeTitle}`)
      lines.push('')
    }

    addSection(lines, 'Ingredients', r.recipe)
    addSection(lines, 'Directions', r.directions)
    addSection(lines, 'Traditions', r.traditions)
    addSection(lines, 'Influences', r.influences)

    lines.push('-'.repeat(60))
    lines.push('')
  })

  const txt = lines.join('\n')
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

type StackUserRow = {
  id: string
  displayName: string | null
  primaryEmail: string | null
  signedUpAt?: string
  role: string
}

interface TabContentProps {
  activeTab: 'recipes' | 'users'
  isSuperAdmin: boolean
  loading: boolean
  recipes: Recipe[]
  sortedUsers: StackUserRow[]
  selectedCountry: string
  setSelectedCountry: (country: string) => void
  roleUpdatingId: string | null
  deleteUserId: string | null
  setDeleteUserId: (id: string | null) => void
  togglePublished: (id: number, published: boolean) => void
  updateUserRole: (userId: string, role: 'team_member' | 'client') => void
  l: (key: string) => string
  d: (key: string) => string
  b: (key: string) => string
  SUPER_ADMIN_EMAIL: string
  SUPER_ADMIN_SEC_EMAIL: string
  loadTabData: (activeTab: 'recipes' | 'users', page?: number) => Promise<void>
  copyInviteLink?: () => void
  copied?: boolean
  usersPagination?: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  } | null
  currentPage?: number
}

export function TabContent({
  activeTab,
  isSuperAdmin,
  loading,
  recipes,
  sortedUsers,
  selectedCountry,
  setSelectedCountry,
  roleUpdatingId,
  setDeleteUserId,
  togglePublished,
  updateUserRole,
  l,
  b,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_SEC_EMAIL,
  loadTabData,
  copyInviteLink,
  copied,
  usersPagination,
  currentPage,
}: TabContentProps) {
  // Load data when tab changes
  useEffect(() => {
    loadTabData(activeTab)
  }, [activeTab, loadTabData])

  const countries = Object.keys(countriesData)

  if (activeTab === 'users') {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm overflow-x-auto">
        <div className="grid grid-cols-6 gap-0 p-4 font-(--font-bell) bg-gray-50 text-gray-700 border-b border-gray-200 min-w-200">
          <div className="pr-4 border-r border-gray-200">Name</div>
          <div className="px-4 border-r border-gray-200">Email</div>
          <div className="px-4 border-r border-gray-200">Role</div>
          <div className="px-4 border-r border-gray-200">Signed up</div>
          <div className="px-4 text-right border-r border-gray-200">Action</div>
          <div className="pl-4 text-right">Delete</div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          </div>
        )}

        {/* Users Table */}
        {!loading && sortedUsers.map((u) => {
          const userEmail = (u.primaryEmail || '').toLowerCase()
          const isSuper = userEmail === SUPER_ADMIN_EMAIL || userEmail === SUPER_ADMIN_SEC_EMAIL

          const isAdmin = u.role === 'team_member'
          const badge = isSuper ? 'Super Admin' : isAdmin ? 'Admin' : 'Client'

          return (
            <div
              key={u.id}
              className={`grid grid-cols-6 gap-0 p-4 border-t border-l border-r border-gray-200 items-center transition-colors hover:bg-gray-50 min-w-200 ${isSuper ? 'bg-[#6D2924]/10' : ''
                }`}
            >
              <div className="pr-4 border-r border-gray-200 truncate text-gray-900 font-(--font-bell)" title={u.displayName || undefined}>
                {u.displayName || '—'}
              </div>
              <div className="px-4 border-r border-gray-200 truncate text-gray-600 font-(--font-bell)" title={u.primaryEmail || undefined}>
                {u.primaryEmail || '—'}
              </div>

              <div className='px-4 border-r border-gray-200 whitespace-nowrap'>
                {isSuper ? (
                  <span className="text-xs px-3 py-2 rounded-full bg-[#FFCCC8] text-[#6D2924] font-semibold border border-[#FFCCC8]">
                    {badge}
                  </span>
                ) : isAdmin ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                    {badge}
                  </span>
                ) : (
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                    {badge}
                  </span>
                )}
              </div>

              <div className="px-4 border-r border-gray-200 text-gray-500 font-(--font-bell) text-sm">
                {u.signedUpAt ? new Date(u.signedUpAt).toLocaleString() : '—'}
              </div>

              {/* Role toggle */}
              <div className="px-4 border-r border-gray-200 flex justify-end">
                {isSuper ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <Button
                    onClick={() =>
                      updateUserRole(u.id, isAdmin ? 'client' : 'team_member')
                    }
                    disabled={roleUpdatingId === u.id}
                    className="bg-[#9BC9C3] hover:bg-[#8AB8B1] rounded-lg! text-[#26786E] border border-[#9BC9C3] text-sm! sm:text-lg! px-2! py-1! sm:px-4! sm:py-2!"
                    variant="empty"
                  >
                    {roleUpdatingId === u.id
                      ? 'Updating...'
                      : isAdmin
                        ? 'Make Client'
                        : 'Make Admin'}
                  </Button>
                )}
              </div>

              {/* Delete (super admin only) */}
              <div className="pl-4 flex justify-end">
                {!isSuperAdmin || isSuper ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  <Button
                    className='bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-sm! sm:text-lg! px-2! py-1! sm:px-4! sm:py-2! rounded-lg!'
                    onClick={() => setDeleteUserId(u.id)}
                    disabled={roleUpdatingId === u.id}
                    variant="empty"
                  >
                    Delete
                  </Button>

                )}
              </div>
            </div>
          )
        })}

        {/* Pagination controls */}
        {usersPagination && !loading && (
          <div className="flex justify-between items-center p-4 border-t border-l border-r border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600 font-(--font-bell)">
              Showing {((currentPage || 1) - 1) * usersPagination.limit + 1} to {Math.min((currentPage || 1) * usersPagination.limit, usersPagination.totalCount)} of {usersPagination.totalCount} users
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => loadTabData('users', (currentPage || 1) - 1)}
                disabled={!usersPagination.hasPrev || loading}
                className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-sm! px-3! py-1!"
                variant="empty"
              >
                ← Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-700 font-(--font-bell)">
                Page {currentPage || 1} of {usersPagination.totalPages}
              </span>
              <Button
                onClick={() => loadTabData('users', (currentPage || 1) + 1)}
                disabled={!usersPagination.hasNext || loading}
                className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-sm! px-3! py-1!"
                variant="empty"
              >
                Next →
              </Button>
            </div>
          </div>
        )}

      </div>
    )
  } else {
    // Recipes tab - show all recipes
    return (
      <div>
        {/* Country filter and copy invite link */}
        <div className="flex justify-between items-center mb-6">
          {isSuperAdmin && copyInviteLink && (
            <Button
              onClick={copyInviteLink}
              className="bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white transition-colors flex items-center gap-2 px-6 py-3 h-12 rounded-xl text-base font-medium whitespace-nowrap"
              variant="empty"
            >
              <Copy className="w-5 h-5" />
              {copied ? 'Copied ✓' : 'Copy Invite Link'}
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="min-w-50">
              <SearchableSelect
                options={countries.map((c) => ({
                  value: countriesData[c as keyof typeof countriesData].name,
                  label: countriesData[c as keyof typeof countriesData].name,
                  flag: countriesData[c as keyof typeof countriesData].flag,
                }))}
                value={selectedCountry}
                onChange={setSelectedCountry}
                placeholder={l('all')}
                variant="light"
              />
            </div>

            {recipes.length > 0 && (
              <Button
                onClick={() => {
                  const filename = selectedCountry
                    ? `recipes-${selectedCountry.toLowerCase().replace(/\s+/g, '-')}.txt`
                    : 'recipes-all.txt'
                  exportRecipesToTxt(recipes, filename, selectedCountry || undefined)
                }}
                className="bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white transition-colors flex items-center gap-2 px-4 py-3 h-12 rounded-xl text-sm font-medium whitespace-nowrap"
                variant="empty"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export ({recipes.length})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Recipe content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-xl font-(--font-bell)">
              {b('loading')}
            </div>
          </div>
        ) : (
          <RecipesList recipes={recipes} togglePublished={togglePublished} />
        )}
      </div>
    )
  }
}
