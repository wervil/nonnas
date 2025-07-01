import { getRequestConfig } from 'next-intl/server'
import { getUserLocale } from '../services/locale'

export default getRequestConfig(async () => {
  const locale = await getUserLocale()

  return {
    locale: locale as 'en' | 'es' | 'fr',
    messages: (
      await import(`../messages/${locale as 'en' | 'es' | 'fr'}.json`)
    ).default,
  }
})
