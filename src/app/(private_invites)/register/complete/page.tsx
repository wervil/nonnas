import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy URL — provisioning runs in the route handler (cookies can be cleared there). */
export default function Page() {
  redirect('/api/private-invite/complete')
}
