import { City, Country, State } from 'country-state-city'
import { useMemo } from 'react'
import { Control, Controller, FieldValues, Path, useWatch } from 'react-hook-form'

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

  const updateCoordinates = (cityName: string) => {
    const city = cityRecords.find((c) => c.name === cityName)
    if (city) {
      setValue(coordinatesName, `${city.latitude},${city.longitude}`)
    }
  }

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
                  updateCoordinates(value)
                }}
                placeholder={selectedState ? 'Select city' : 'Select state first'}
                disabled={!selectedState}
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
