'use client'

import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const verifyPayment = async (
  setLoading: Dispatch<SetStateAction<boolean>>,
  sessionId?: string
) => {
  if (!sessionId) {
    return { error: 'Invalid checkout session', data: null }
  }

  try {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to verify payment')
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    console.error('Error verifying checkout:', err)
    return {
      error:
        'There was an error verifying your purchase. Please contact support.',
      data: null,
    }
  } finally {
    setLoading(false)
  }
}

export const PaymentVerify = ({ sessionId }: { sessionId?: string }) => {
  const d = useTranslations('descriptions')

  const b = useTranslations('buttons')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    payment_intent_id: string
    amount: number
  } | null>(null)

  useEffect(() => {
    const verify = async () => {
      const { error, data } = await verifyPayment(setLoading, sessionId)
      setError(error)
      setData(data)
    }
    verify()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{d('verifyingPurchase')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {d('somethingWentWrong')}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button>{b('returnHome')}</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {d('paymentSuccessful')}
            </h1>
            <p className="text-gray-600 mt-2">{d('thankYouForYourPurchase')}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">
              {d('orderSummary')}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {d('amount')}:
                </span>
                <span className="font-medium">
                  ${(data.amount / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {d('orderId')}:
                </span>
                <span className="font-mono text-xs">
                  {data.payment_intent_id}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full">
                {b('returnToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
