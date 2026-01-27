import React, { useState, useEffect } from 'react'
import { Control, Controller, FieldValues, Path, useWatch } from 'react-hook-form'

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

import { SearchableSelect } from './SearchableSelect'

const CountryRegionSelector = <T extends FieldValues>({
  countryName,
  regionName,
  control,
  description,
}: CountryRegionSelectorProps<T>) => {
  const selectedCountry = useWatch({
    control,
    name: countryName,
  }) as string

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
                onChange={field.onChange}
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
