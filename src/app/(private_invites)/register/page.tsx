import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  // ✅ Next.js 15: must await searchParams
  const { invite } = await searchParams

  const token = invite?.trim() ?? ''
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? ''

  if (!expected || token !== expected) {
    notFound()
  }

  // ✅ redirect to route handler that sets cookie (Next 15 requires cookie set in route handler)
  redirect(`/api/private-invite/start?invite=${encodeURIComponent(token)}`)
}
