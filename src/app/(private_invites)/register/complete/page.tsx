import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy URL — invite provisioning runs in middleware, then user lands on home. */
export default function Page() {
  redirect('/')
}
