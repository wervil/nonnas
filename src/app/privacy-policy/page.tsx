// import { stackServerApp } from '@/stack'
// import { redirect } from 'next/navigation'

export default async function PrivacyPage() {
  // const user = await stackServerApp.getUser({ or: 'return-null' })

  // if (user) {
  //   redirect('/') // or '/'
  // }

  return (
    <div className="max-w-3xl mx-auto py-10 md:py-20 px-4 md:px-0">
      <p className="sm:text-5xl text-2xl font-semibold mb-4">Privacy Policy</p>
      <p className="text-muted-foreground">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      </p>
    </div>
  )
}
