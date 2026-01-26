import React, { useState, useEffect, useRef } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'

import { useTranslations } from 'next-intl'
import { Typography } from './Typography'
import { countriesData } from '@/utils/countries'

export interface CountryRegionSelectorProps<T extends FieldValues> {
  countryName: Path<T>
  regionName: Path<T>
  control: Control<T>
  label?: string
  description?: string
  error?: string
}

const countries = Object.keys(countriesData)

interface SearchableSelectProps {
  options: { value: string; label: string; flag?: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  error?: string
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  error,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-4 border rounded-lg cursor-pointer flex items-center justify-between text-base font-[var(--font-merriweather)] ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-primary-hover text-text-pale'
          } ${error ? 'border-danger-main' : 'border-primary-main'}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.flag && <span>{selectedOption.flag}</span>}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-[#2e1d15] border border-primary-main rounded-lg shadow-lg">
          <div className="p-2 border-b border-primary-main/30">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-primary-hover border border-primary-border rounded text-text-pale focus:outline-none focus:border-primary-focus placeholder-text-pale/50"
              placeholder="Search..."
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-[150px] overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                    setSearchTerm('')
                  }}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-primary-main hover:text-white transition-colors text-text-pale ${value === option.value ? 'bg-primary-focus/20' : ''
                    }`}
                >
                  {option.flag && <span>{option.flag}</span>}
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-text-pale/50 text-center">No options found</li>
            )}
          </ul>
        </div>
      )}
      {error && (
        <Typography size="bodyXS" color="dangerMain" className="mt-2">
          {error}
        </Typography>
      )}
    </div>
  )
}

const CountryRegionSelector = <T extends FieldValues>({
  countryName,
  regionName,
  control,
  description,
}: CountryRegionSelectorProps<T>) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [regions, setRegions] = useState<string[]>([])
  const l = useTranslations('labels')

  useEffect(() => {
    if (
      selectedCountry &&
      countriesData[selectedCountry as keyof typeof countriesData]
    ) {
      setRegions(
        countriesData[selectedCountry as keyof typeof countriesData].regions
      )
    } else {
      setRegions([])
    }
  }, [selectedCountry])

  const countryOptions = countries.map((country) => ({
    value: country,
    label: countriesData[country as keyof typeof countriesData].name,
    flag: countriesData[country as keyof typeof countriesData].flag,
  }))

  const regionOptions = regions.map((region) => ({
    value: region,
    label: region,
  }))

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
        <div>
          <Typography as="label" color="primaryFocus" className="mb-2">
            {`${l('country')}*`}
          </Typography>
          <Controller
            name={countryName}
            control={control}
            render={({ field, fieldState }) => (
              <SearchableSelect
                options={countryOptions}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  setSelectedCountry(value)
                }}
                placeholder={l('country')}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>

        {/* Region Selector */}
        <div>
          <Typography as="label" color="primaryFocus" className="mb-2">
            {l('region')}*
          </Typography>

          <Controller
            name={regionName}
            control={control}
            render={({ field, fieldState }) => (
              <SearchableSelect
                options={regionOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder={selectedCountry ? l('region') : `${l('country')} ${l('first')}`}
                disabled={!selectedCountry}
                error={fieldState.error?.message}
              />
            )}
          />
        </div>
      </div>
      {description ? (
        <Typography size="bodyXS" color="primaryFocus" className="mt-2">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}



export default CountryRegionSelector
