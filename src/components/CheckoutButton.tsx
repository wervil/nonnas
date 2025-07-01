'use client'

import { useState } from 'react'
import Button from './ui/Button'
import { useUser } from '@stackframe/stack'
import { useTranslations } from 'next-intl'

export const CheckoutButton = () => {
  const [loading, setLoading] = useState(false)
  const user = useUser()
  const b = useTranslations('buttons')

  const onClick = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save recipe')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('There was an error processing your checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <Button onClick={onClick}>{loading ? b('loading') : b('pay')}</Button>
}
