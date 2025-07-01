'use client'

import { useUser } from '@stackframe/stack'
import Button from './ui/Button'
import { useTranslations } from 'next-intl'

export const LogOutButton = () => {
  const user = useUser()
  const b = useTranslations('buttons')

  if (!user) {
    return null
  }

  return <Button className="mt-4" onClick={() => user?.signOut()}>{b('logOut')}</Button>
}
