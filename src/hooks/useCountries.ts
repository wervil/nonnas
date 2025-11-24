import { useState, useEffect } from 'react'

export function useCountries() {
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    const fetchCountries = async () => {
      const res = await fetch('/api/countries')
      const data = await res.json()
      setCountries(data.countries.map((c: { country: string }) => c.country))
    }
    fetchCountries()
  }, [])

  return countries
}
