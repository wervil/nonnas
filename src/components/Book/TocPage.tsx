import { useTranslations } from 'next-intl'

import { countriesReverseMap } from '../../utils/countries'
import { FlagIcon, FlagIconCode } from 'react-flag-kit'

interface Props {
  countries: [string, string][]
  height: number
  goToPage: (pageNumber: number) => void
}
export const TocPage = ({ countries, height, goToPage }: Props) => {
  const l = useTranslations('labels')

  return (
    <>
      <div
        className="description-wrap"
        style={{
          backgroundImage: "url('/bg-5-v.webp')",
          height: `${height}px`,
        }}
      >
        <h4 className="text-federant text-brown-light text-center text-m xl:text-xl mb-6">
          {l('tableOfContents')}
        </h4>
        <ul className="grid grid-cols-4 gap-4">
          {countries.map(([country, pageRange]) => (
            <li
              key={country}
              className="flex flex-col items-center cursor-pointer gap-1"
              onClick={() => goToPage(Number(pageRange.split('-')[0]))}
            >
              <FlagIcon
                code={
                  countriesReverseMap[
                    country
                  ]?.countryShortCode.toUpperCase() as FlagIconCode
                }
                size={40}
              />
              <span>{country}</span>
            </li>
          ))}
        </ul>
        <div className="corner corner--big lt" />
        <div className="corner corner--big rt" />
        <div className="corner corner--big lb" />
        <div className="corner corner--big rb" />
      </div>
    </>
  )
}
