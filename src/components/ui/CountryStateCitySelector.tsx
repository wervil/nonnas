import { City, Country, State } from 'country-state-city'
import { useEffect, useState } from 'react'
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
  const selectedCountry = useWatch({
    control,
    name: countryName,
  }) as string

  const selectedState = useWatch({
    control,
    name: stateName,
  }) as string

  const [countries, setCountries] = useState<Option[]>([])
  const [states, setStates] = useState<Option[]>([])
  const [cities, setCities] = useState<Option[]>([])

  // Load countries on mount
  useEffect(() => {
    const countryList = Country.getAllCountries()
    const countryOptions: Option[] = countryList.map((country) => ({
      value: country.isoCode,
      label: country.name,
    }))
    setCountries(countryOptions)
  }, [])

  // Load states when country changes
  useEffect(() => {
    if (selectedCountry) {
      console.log('Selected country:', selectedCountry)
      try {
        const stateList = State.getStatesOfCountry(selectedCountry)
        console.log('States for country:', stateList)

        const stateOptions: Option[] = stateList.map((state) => ({
          value: state.isoCode,
          label: state.name,
        }))
        setStates(stateOptions)

        // Clear cities when country changes
        setCities([])
      } catch (error) {
        console.error('Error getting states:', error)
        setStates([])
        setCities([])
      }
    } else {
      setStates([])
      setCities([])
    }
  }, [selectedCountry])

  // Load cities when state changes
  useEffect(() => {
    if (selectedCountry && selectedState) {
      console.log('Selected state:', selectedState)
      try {
        const cityList = City.getCitiesOfState(selectedCountry, selectedState)
        console.log('Cities for state:', cityList)

        const cityOptions: Option[] = cityList.map((city) => ({
          value: city.name,
          label: city.name,
        }))
        setCities(cityOptions)
      } catch (error) {
        console.error('Error getting cities:', error)
        setCities([])
      }
    } else {
      setCities([])
    }
  }, [selectedCountry, selectedState])

  const handleCityChange = (selectedCity: string) => {
    // Find the city object to get coordinates
    if (selectedCountry && selectedState) {
      try {
        const cityList = City.getCitiesOfState(selectedCountry, selectedState)
        const city = cityList.find((c) => c.name === selectedCity)

        if (city) {
          const coordinates = `${city.latitude},${city.longitude}`
          console.log('Setting coordinates:', coordinates)
          setValue(coordinatesName, coordinates)
        }
      } catch (error) {
        console.error('Error getting city coordinates:', error)
      }
    }
  }

  return (
    <div className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country Selector */}
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
                onChange={field.onChange}
                placeholder="Select country"
                error={fieldState.error?.message}
                variant='light'
              />
            )}
          />
        </div>

        {/* State/Region Selector */}
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
                onChange={field.onChange}
                placeholder={selectedCountry ? 'Select state' : 'Select country first'}
                disabled={!selectedCountry}
                error={fieldState.error?.message}
                variant='light'
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* City Selector */}
        <div>
          <Typography as="label" color="black" className="mb-2">
            City
          </Typography>
          <Controller
            name={cityName}
            control={control}
            render={({ field, fieldState }) => {
              // Filter cities by region if possible (this is a basic approach)
              let filteredCities = cities;
              if (selectedState && selectedState !== countryName) {
                // Try to filter by region name in city data
                const regionFiltered = cities.filter((city: Option) =>
                  city.label && (
                    city.label.toLowerCase().includes(selectedState.toLowerCase()) ||
                    selectedState.toLowerCase().includes(city.label.toLowerCase())
                  )
                );

                // If region filtering finds cities, use them. Otherwise, show all cities.
                if (regionFiltered.length > 0) {
                  filteredCities = regionFiltered;
                  console.log('Filtered cities by region:', filteredCities);
                } else {
                  console.log('Region filtering found no matches, showing all cities for country');
                }
              }
              return (
                <SearchableSelect
                  options={filteredCities}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value)
                    handleCityChange(value)
                  }}
                  placeholder={selectedState ? 'Select city' : 'Select state first'}
                  disabled={!selectedState}
                  error={fieldState.error?.message}
                  variant='light'
                />
              )
            }}
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
