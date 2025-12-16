import { PaymentVerify } from '@/components/PaymentVerify'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  return <PaymentVerify sessionId={sessionId} />
}
