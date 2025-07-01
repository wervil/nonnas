// eslint-disable-next-line @typescript-eslint/no-unused-vars
const locales = ['en', 'es', 'fr'] as const
import messages from './messages/en.json'

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages
    Locale: (typeof locales)[number]
  }
}
