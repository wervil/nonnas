'use client'

import { Book } from '@/components/Book/Book'
import { useRecipes } from '@/hooks/useRecipes'
import Image from 'next/image'
import { button, Header } from '@/components/Header'
import { useUser } from '@stackframe/stack'
import { useTranslations } from 'next-intl'
import { useCountries } from '@/hooks/useCountries'
import { countriesReverseMap } from '@/utils/countries'
import { Select } from '@/components/Select'
import { usePathname, useSearchParams } from 'next/navigation'
import { WelcomeOverlay } from '@/components/Book/WelcomeOverlay'
import { useEffect, useState } from 'react'



import { SearchResultsModal } from '@/components/SearchResultsModal'
import { BookHandle } from '@/components/Book/Book'
import { useRef } from 'react'

export type ClusterPoint = {
  id: string;
  lat: number;
  lng: number;
  weight?: number; // optional
};

export default function Recipes() {
  const n = useTranslations('navigation')
  // const l = useTranslations('labels')
  const countries = useCountries()
  const path = usePathname()
  const searchParams = useSearchParams()
  const bookRef = useRef<BookHandle>(null)

  // Get recipe ID from URL parameter (from map "View Recipe" button)
  const [initialRecipeId, setInitialRecipeId] = useState<number | null>(null)

  useEffect(() => {
    const recipeParam = searchParams.get('recipe')
    if (recipeParam) {
      const recipeId = parseInt(recipeParam, 10)
      if (!isNaN(recipeId)) {
        setInitialRecipeId(recipeId)
        // Clear the URL parameter after reading it (optional - keeps URL clean)
        window.history.replaceState({}, '', '/')
      }
    }
  }, [searchParams])

  const countriesOptions = [
    { value: '', label: n('all') },
    ...countries?.map((country: string) => ({
      value: country,
      label: `${countriesReverseMap[country]?.flag} ${country}`,
    })),
  ]



  const {
    loading,
    recipes,
    filteredRecipes,
    tableOfContents,
    selectedCountry,
    setSelectedCountry,
    search,
    setSearch,
  } = useRecipes()
  let hasPermissions = false

  const user = useUser()
  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
    hasPermissions = team ? !!user.usePermission(team, 'team_member') : false
  }

  const handleSelectRecipe = (recipeId: number) => {
    // 1. Close modal (clear filters)
    setSearch('')
    setSelectedCountry({ value: '', label: n('all') })

    // 2. Navigate Book
    if (bookRef.current) {
      bookRef.current.goToRecipe(recipeId)
    }
  }

  const showSearchResults = (search.length > 0 || selectedCountry.value !== '') && !loading

  return (
    <>
      <SearchResultsModal
        isOpen={showSearchResults}
        onClose={() => {
          setSearch('')
          setSelectedCountry({ value: '', label: n('all') })
        }}
        results={filteredRecipes}
        onSelect={handleSelectRecipe}
      />
      <div className="min-h-svh flex flex-col overflow-hidden">
        <div className="relative z-[60]">
          <Header
            hasAdminAccess={hasPermissions}
            countriesOptions={countriesOptions}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            search={search}
            setSearch={setSearch}
            user={user}
          />
        </div>
        <main className="grow flex flex-col w-full object-top object-cover relative main-gradient min-h-svh">
          <WelcomeOverlay />
          <Image
            src="/bg.webp"
            alt="Description"
            layout="fill"
            objectFit="cover"
            style={{ zIndex: -1 }}
          />
          <div className="items-center relative flex flex-col md:hidden p-8 w-full gap-3">
            {button(path, n as (key: string) => string, hasPermissions)}
            {setSearch ? (
              <div className="flex items-center gap-1 border-2 border-green-dark rounded-full px-2 w-full bg-white">
                <Image
                  src="/search.svg"
                  width={20}
                  height={20}
                  alt="search icon"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="px-2 py-1 w-full max-w-md border-0 outline-0 italic text-gray-500"
                />
              </div>
            ) : null}
            {countriesOptions ? (
              <div className="w-full relative bg-white rounded-[20px]">
                <Select
                  options={countriesOptions}
                  selectedOption={selectedCountry}
                  setSelectedOption={setSelectedCountry}
                />
                <div className="flag-icon" />
              </div>
            ) : null}
          </div>
          {loading ? (
            <div></div>
          ) : (
            <Book
              ref={bookRef}
              recipes={recipes}
              tableOfContents={tableOfContents}
              initialRecipeId={initialRecipeId}
            />
          )}
        </main>
      </div>
    </>
  )
}
