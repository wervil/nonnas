import Stripe from 'stripe'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! || '')

async function getOrCreateCustomerForUser(userId: string): Promise<string> {
  // Lookup your user in the database
  const user = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
  })
  if (user.data.length > 0) {
    return user.data[0].id
  }
  const customer = await stripe.customers.create({ metadata: { userId } })

  return customer.id
}

export async function POST(request: Request) {
  const { userId, successUrl, cancelUrl } = (await request.json()) as {
    userId?: string
    successUrl?: string
    cancelUrl?: string
  }
  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId in request body' },
      { status: 401 }
    )
  }

  try {
    const customerId = await getOrCreateCustomerForUser(userId)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Print payment',
            },
            unit_amount: 1000,
          },
          quantity: 1,
        },
      ],
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        user_id: customerId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 401 }
    )
  }
}
