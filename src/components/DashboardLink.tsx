'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export const DashboardLink = () => {
  const b = useTranslations('buttons')
  
  return <Link href="/dashboard">{b('goToDashboard')}</Link>
}
