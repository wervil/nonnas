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
import { Typography } from '@/components/ui/Typography'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
// import WorldGrandmasView from '@/components/globe/GlobeComponent'
// import HomeShell from '@/components/globe/HomeShell'
// import GithubStyleGlobe from '@/components/globe/GithubStyleGlobe'

// import Globe2D3DShell from "@/components/globe/Globe2D3DShell";

// import { useMemo, useState } from 'react'



export type ClusterPoint = {
  id: string;
  lat: number;
  lng: number;
  weight?: number; // optional
};

export default function Recipes() {
  const n = useTranslations('navigation')
  const l = useTranslations('labels')
  const countries = useCountries()
  const path = usePathname()
  const searchParams = useSearchParams()
  
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

    // 🔹 Dummy clustered points
    // const points = useMemo<ClusterPoint[]>(() => {
    //   return [
    //     // Islamabad
    //     { id: "1", lat: 33.6844, lng: 73.0479, weight: 5 },
    //     { id: "2", lat: 33.6849, lng: 73.0485, weight: 3 },
    //     { id: "3", lat: 33.6838, lng: 73.0465, weight: 4 },
  
    //     // Lahore
    //     { id: "4", lat: 31.5204, lng: 74.3587, weight: 6 },
    //     { id: "5", lat: 31.5210, lng: 74.3595, weight: 4 },
  
    //     // Karachi
    //     { id: "6", lat: 24.8607, lng: 67.0011, weight: 7 },
    //     { id: "7", lat: 24.8615, lng: 67.0020, weight: 5 },
  
    //     // NYC
    //     { id: "8", lat: 40.7128, lng: -74.006, weight: 6 },
    //     { id: "9", lat: 40.7135, lng: -74.005, weight: 4 },
    //   ];
    // }, []);
  
    // // 🔹 Dummy center (start position)
    // const [center, setCenter] = useState<{ lat: number; lng: number }>({
    //   lat: 33.6844,
    //   lng: 73.0479,
    // });
  
    // // 🔹 Dummy zoom
    // const [zoom, setZoom] = useState<number>(6);

  const {
    loading,
    recipes,
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

  return (
    <>
      {/* <div className="flex justify-end items-center gap-2 py-4 px-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="border rounded px-2 py-1 w-full max-w-md"
        />
      </div> */}
      {/* <div className="flex justify-end items-center gap-2 py-4 px-8">
        <label htmlFor="lang-select" className="font-medium">
          {l('language')}:
        </label>
        <select
          id="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {availableLanguages.map((l) => (
            <option key={l.lang} value={l.lang}>
              {l.name}
            </option>
          ))}
        </select>
      </div> */}

      {/* <WorldGrandmasView /> */}

      {/* <HomeShell /> */}

      {/* <Globe2D3DShell /> */}


      <div className="min-h-svh flex flex-col overflow-hidden">
        <Header
          hasAdminAccess={hasPermissions}
          countriesOptions={countriesOptions}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          search={search}
          setSearch={setSearch}
          user={user}
        />
        <main className="grow flex flex-col w-full object-top object-cover relative main-gradient min-h-svh">
          <Image
            src="/bg.webp"
            alt="Description"
            layout="fill"
            objectFit="cover"
            style={{ zIndex: -1 }}
          />
          <div className="items-center relative flex flex-col md:hidden p-8 w-full gap-3">
            <div className="page-first cover page-first--mobile">
              <div className="info-wrap">
                <Typography size="h6" weight="bold" color="white">
                  {l('infoTitle')}
                </Typography>
                <Typography size="body" color="white" className="mt-4">
                  {l('infoDescr')}
                </Typography>
                <Typography size="body" color="white" className="mt-4">
                  {l('infoDescrAdd')}
                </Typography>
              </div>
            </div>
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
