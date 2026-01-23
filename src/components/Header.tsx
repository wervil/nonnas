'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import Button from './ui/Button'
import { usePathname } from 'next/navigation'
import { Dispatch, SetStateAction } from 'react'
import { Select } from './Select'
import { CurrentInternalUser, CurrentUser } from '@stackframe/stack'
import { MessageCircle, Settings, User } from 'lucide-react'
import DotLottieGlobe from './LottieGlobe'



export const button = (path: string, n: (key: string) => string, hasAdminAccess: boolean) => {
  if (path === '/add-recipe') {
    return (
      <Link href="/">
        <Button>{n('home')}</Button>
      </Link>
    )
  }
  if (hasAdminAccess) {
    return ("")
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
  isExplorePage?: boolean
}

export const Header = ({
  hasAdminAccess,
  countriesOptions,
  selectedCountry,
  setSelectedCountry,
  search,
  setSearch,
  user,
  isExplorePage = false,
}: Props) => {
  const n = useTranslations('navigation')
  const path = usePathname()

  // Dynamic classes based on page type
  const headerBgClass = isExplorePage ? 'bg-black/80 backdrop-blur-sm' : 'bg-white'
  // const iconColorClass = isExplorePage ? 'text-white' : 'text-gray-700'
  const imageFilterClass = isExplorePage ? 'text-white' : 'text-[#5f5f13]';
  // const logoSrc = isExplorePage ? "/logoMain.svg" : "/logoMain.svg" // Keep same logo, maybe invert if needed? assuming logo looks ok or needs specific invert

  const headerJustifyClass = isExplorePage ? 'justify-between' : 'justify-center md:justify-between'
  const navVisibilityClass = isExplorePage ? 'flex' : 'hidden md:flex'

  return (
    <header className={`flex items-center ${headerJustifyClass} px-3 md:px-20 pt-3 gap-4 ${headerBgClass}`}>
      <Link className="shrink-0" href="/">
        {/* For logo on dark background, we might want to apply a filter or use a different asset if available. 
            Using brightness/invert for now if it's SVG text-based, or keeping as is if it has its own background. 
            Assuming logoMain.svg handles dark mode or we apply filter. Let's apply partial filter for visibility if needed.
        */}
        <Image
          src="/logoMain.svg"
          width={120}
          height={90}
          alt="logo"
        />
      </Link>
      <div className={`items-center gap-1 relative ${navVisibilityClass}`}>


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
      <div className={`gap-5 ${navVisibilityClass} items-center`}>
        {/* Home Icon for Explore Page - placed next to Settings */}
        {isExplorePage && (
          <Link href="/">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`cursor-pointer hover:opacity-80 transition-opacity ${imageFilterClass}`}
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
        )}

        {/* Only show Globe icon here if NOT explore page. If explore page, Home icon moves to right. */}
        {!isExplorePage && (
          <Link href="/explore" aria-label="Explore" className="inline-flex items-center">
            <span className="inline-flex items-center justify-center w-[40px] h-[40px]">
              <DotLottieGlobe
                src="/lottie/earth-lottie.json"
                size={40}
                className="w-[40px] h-[40px] cursor-pointer hover:opacity-80 transition-opacity"
              />
            </span>
          </Link>
        )}



        {user ? (
          hasAdminAccess ? (
            <>
              <Link href="/dashboard">
                <Settings
                  className={`w-[30px] h-[30px] ${imageFilterClass}`}
                />
              </Link>
              <Link href="/profile">
              <User
                className={`w-[30px] h-[30px] ${imageFilterClass}`}
              />
            </Link>
            <Link href="/messages">
              <MessageCircle
                className={`w-[30px] h-[30px] ${imageFilterClass}`}
              />
            </Link>
           </>
          ) : (
            <>
            <Link href="/profile">
              <Settings
                className={`w-[30px] h-[30px] ${imageFilterClass}`}
              />
            </Link>
            <Link href="/messages">
              <MessageCircle
                className={`w-[30px] h-[30px] ${imageFilterClass}`}
              />
            </Link>
            </>
          )
        ) : null}
        {button(path || '', n as (key: string) => string, hasAdminAccess)}
      </div>
    </header>
  )
}
