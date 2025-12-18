// app/register/page.tsx
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const token = invite?.trim() ?? ''
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? ''

  if (!expected || token !== expected) notFound()

  redirect(`/api/private-invite/start?invite=${encodeURIComponent(token)}`)
}
