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
import { usePathname } from 'next/navigation'

export default function Recipes() {
  const n = useTranslations('navigation')
  const l = useTranslations('labels')
  const countries = useCountries()
  const path = usePathname()

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
            {button(path, n as (key: string) => string)}
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
            <Book recipes={recipes} tableOfContents={tableOfContents} />
          )}
        </main>
      </div>
    </>
  )
}
