// import { stackServerApp } from '@/stack'
// import { redirect } from 'next/navigation'

export default async function TermsOfUsePage() {
  // const user = await stackServerApp.getUser({ or: 'return-null' })

  // // Logged in? kick them out
  // if (user) {
  //   redirect('/') // or '/'
  // }

  return (
    <div className="max-w-3xl mx-auto py-10 md:py-20 px-4 md:px-0">
      <p className="sm:text-5xl text-2xl font-semibold mb-4">Terms of Use</p>
      <p className="text-muted-foreground">
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Non dolorum sint laborum, distinctio voluptates natus nihil ab repellat fugiat autem architecto, iure dignissimos! Praesentium a magnam vel dignissimos, culpa accusamus!
      </p>
    </div>
  )
}
