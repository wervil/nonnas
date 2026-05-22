'use client'

import { geocodeCityInBrowser } from '@/lib/geocodeClient'
import { City, Country, State } from 'country-state-city'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Control, Controller, FieldValues, Path, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { SearchableSelect } from './SearchableSelect'
import { Typography } from './Typography'

export interface CountryStateCitySelectorProps<T extends FieldValues> {
  countryName: Path<T>
  stateName: Path<T>
  cityName: Path<T>
  coordinatesName: Path<T>
  control: Control<T>
  setValue: (name: Path<T>, value: unknown) => void
  label?: string
  description?: string
  error?: string
}

interface Option {
  value: string
  label: string
}

const CountryStateCitySelector = <T extends FieldValues>({
  countryName,
  stateName,
  cityName,
  coordinatesName,
  control,
  setValue,
  description,
}: CountryStateCitySelectorProps<T>) => {
  const selectedCountry = useWatch({ control, name: countryName }) as string
  const selectedState = useWatch({ control, name: stateName }) as string
  const selectedCity = useWatch({ control, name: cityName }) as string
  const [isGeocoding, setIsGeocoding] = useState(false)
  const geocodeRequestId = useRef(0)

  const countries = useMemo<Option[]>(
    () =>
      Country.getAllCountries().map((country) => ({
        value: country.isoCode,
        label: country.name,
      })),
    [],
  )

  const states = useMemo<Option[]>(() => {
    if (!selectedCountry) return []
    return State.getStatesOfCountry(selectedCountry).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }))
  }, [selectedCountry])

  const cityRecords = useMemo(() => {
    if (!selectedCountry || !selectedState) return []
    return City.getCitiesOfState(selectedCountry, selectedState)
  }, [selectedCountry, selectedState])

  const cities = useMemo<Option[]>(
    () =>
      cityRecords.map((city) => ({
        value: city.name,
        label: city.name,
      })),
    [cityRecords],
  )

  const clearDependentFields = (...fields: Path<T>[]) => {
    for (const field of fields) {
      setValue(field, '')
    }
  }

  const updateCoordinates = async (cityName: string) => {
    const countryName = Country.getCountryByCode(selectedCountry)?.name
    const regionName = State.getStateByCodeAndCountry(
      selectedState,
      selectedCountry,
    )?.name

    if (!countryName) return

    const requestId = ++geocodeRequestId.current
    setIsGeocoding(true)
    setValue(coordinatesName, '')

    try {
      const coordinates = await geocodeCityInBrowser(
        cityName,
        regionName,
        countryName,
        selectedCountry,
      )

      if (requestId !== geocodeRequestId.current) return

      if (coordinates) {
        setValue(coordinatesName, coordinates)
      } else {
        toast.error(
          'Could not locate this city on the map. Try selecting the city again or check your connection.',
        )
      }
    } catch (err) {
      if (requestId !== geocodeRequestId.current) return
      console.error('[CountryStateCitySelector] geocode failed:', err)
      toast.error('Map lookup failed. Please try again.')
    } finally {
      if (requestId === geocodeRequestId.current) {
        setIsGeocoding(false)
      }
    }
  }

  // Re-geocode when editing an existing recipe (form reset fills city before coordinates)
  useEffect(() => {
    if (selectedCity && selectedCountry && selectedState) {
      void updateCoordinates(selectedCity)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when location selection changes
  }, [selectedCountry, selectedState, selectedCity])

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Typography as="label" color="black" className="mb-2">
            Country
          </Typography>
          <Controller
            name={countryName}
            control={control}
            render={({ field, fieldState }) => (
              <SearchableSelect
                options={countries}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  clearDependentFields(stateName, cityName, coordinatesName)
                }}
                placeholder="Select country"
                error={fieldState.error?.message}
                variant="light"
              />
            )}
          />
        </div>

        <div>
          <Typography as="label" color="black" className="mb-2">
            State/Region
          </Typography>
          <Controller
            name={stateName}
            control={control}
            render={({ field, fieldState }) => (
              <SearchableSelect
                options={states}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  clearDependentFields(cityName, coordinatesName)
                }}
                placeholder={selectedCountry ? 'Select state' : 'Select country first'}
                disabled={!selectedCountry}
                error={fieldState.error?.message}
                variant="light"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Typography as="label" color="black" className="mb-2">
            City
          </Typography>
          <Controller
            name={cityName}
            control={control}
            render={({ field, fieldState }) => (
              <SearchableSelect
                options={cities}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value)
                  void updateCoordinates(value)
                }}
                placeholder={selectedState ? 'Select city' : 'Select state first'}
                disabled={!selectedState || isGeocoding}
                error={fieldState.error?.message}
                variant="light"
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

export default CountryStateCitySelector
