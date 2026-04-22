// app/register/page.tsx
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const token = invite?.trim() ?? ''

  redirect(`/api/private-invite/start?invite=${encodeURIComponent(token)}`)
}
