import { Typography } from './ui/Typography'
import { useTranslations } from 'next-intl'

export const Footer = () => {
  const f = useTranslations('footer')

  return (
    <footer className="px-20 py-5 w-full bg-primary-hover">

      <div className="m-auto text-center">
        <Typography size="bodyS" color="primaryFocus">
          {f('copy')}
        </Typography>
      </div>
    </footer>
  )
}
