'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from './ui/Button'
import { usePathname } from 'next/navigation'
import { Dispatch, SetStateAction } from 'react'
import { Select } from './Select'
import { CurrentInternalUser, CurrentUser } from '@stackframe/stack'

export const button = (path: string, n: (key: string) => string) => {
  if (path === '/add-recipe') {
    return (
      <Link href="/">
        <Button>{n('home')}</Button>
      </Link>
    )
  }
  return (
    <Link href="/add-recipe">
      <Button>{n('addRecipe')}</Button>
    </Link>
  )
}

type Props = {
  hasAdminAccess: boolean
  countriesOptions?: { label: string; value: string }[]
  selectedCountry?: { label: string; value: string }
  setSelectedCountry?: Dispatch<
    SetStateAction<{ label: string; value: string }>
  >
  search?: string
  setSearch?: Dispatch<SetStateAction<string>>
  user?: CurrentUser | CurrentInternalUser | null
}

export const Header = ({
  hasAdminAccess,
  countriesOptions,
  selectedCountry,
  setSelectedCountry,
  search,
  setSearch,
  user,
}: Props) => {
  const n = useTranslations('navigation')
  const path = usePathname()

  return (
    <header className="flex items-center justify-center md:justify-between px-3 md:px-20 pt-3 bg-white gap-4">
      <a className="shrink-0" href="https://nonnasoftheworld.org/">
        {/* <Image src="/logo_community.svg" width={75} height={63} alt="logo" /> */}
        <Image src="/logoMain.png" width={75} height={63} alt="logo" />
      </a>
      <div className="items-center gap-1 relative hidden md:flex">
        {setSearch ? (
          <div className="flex items-center gap-1 border-2 border-green-dark rounded-l-full pl-2">
            <Image src="/search.svg" width={20} height={20} alt="search icon" />
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
          <>
            <Select
              options={countriesOptions}
              selectedOption={selectedCountry}
              setSelectedOption={setSelectedCountry}
            />
            <div className="flag-icon" />
          </>
        ) : null}
      </div>
      <div className="gap-5 hidden md:flex items-center">
        {user ? (
          hasAdminAccess ? (
            <Link href="/dashboard">
              <Image
                src="/Gear-icon.svg"
                width={30}
                height={30}
                alt="Go to profile"
              />
            </Link>
          ) : (
            <Link href="/profile">
              <Image
                src="/Gear-icon.svg"
                width={30}
                height={30}
                alt="Go to profile"
              />
            </Link>
          )
        ) : null}
        {button(path, n as (key: string) => string)}
      </div>
    </header>
  )
}
