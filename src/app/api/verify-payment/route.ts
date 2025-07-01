import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { payments } from '@/db/schema'

const db = drizzle(process.env.DATABASE_URL!)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! || '')

export async function POST(request: Request) {
  const { sessionId } = (await request.json()) as {
    sessionId: string
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'payment_intent'],
    })
    if (!session) {
      return new Response(
        JSON.stringify({
          error: 'Invalid session',
        }),
        {
          status: 400,
        }
      )
    }
    const paymentIntent = session.payment_intent as Stripe.PaymentIntent

    const paymentIntentId = paymentIntent?.id
    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({
          error: 'Payment intent not found',
        }),
        {
          status: 400,
        }
      )
    }
    const paymentIntentStatus = paymentIntent?.status
    if (paymentIntentStatus !== 'succeeded') {
      return new Response(
        JSON.stringify({
          error: 'Payment not successful',
        }),
        {
          status: 400,
        }
      )
    }
    const amount = session.amount_total || 0

    const customer = await stripe.customers.retrieve(
      (session.customer as Stripe.Customer)?.id
    )

    const userId = (customer as Stripe.Customer).metadata?.userId

    await db.insert(payments).values({
      user_id: userId,
      amount: amount,
      status: paymentIntentStatus || 'canceled',
    })

    return NextResponse.json(
      {
        message: 'Payment verified successfully',
        payment_intent_id: paymentIntentId,
        amount: amount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { message: 'Payment verification error' },
      { status: 500 }
    )
  }
}
