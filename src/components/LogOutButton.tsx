'use client'

import { useUser } from '@stackframe/stack'
import Button from './ui/Button'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export const LogOutButton = () => {
  const user = useUser()
  const b = useTranslations('buttons')
  const n = useTranslations('navigation')

  return (
    <>
      {user ? (
        <Button onClick={() => user?.signOut()}>
          {b('logOut')}
        </Button>
      ) : (
        <Link href="/handler/sign-in">
          <Button variant="outline">{n('login')}</Button>
        </Link>
      )}
    </>
  )
}
