import { AddRecipe } from '@/components/AddRecipe'
import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'
import { Header } from '@/components/Header'
import Image from 'next/image'

const AddRecipePage = async () => {
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const hasAdminAccess = user ? await checkAdminPermission(user) : false

  // console.log('user', user)

  return (
    <div className="min-h-svh flex flex-col">
      <Header hasAdminAccess={hasAdminAccess} />
      <main className="grow flex flex-col w-full object-top object-cover relative main-gradient min-h-svh">
        <Image
          src="/bg.webp"
          alt="Description"
          layout="fill"
          objectFit="cover"
          style={{ zIndex: -1 }}
        />
        <AddRecipe userId={user?.id} />
      </main>
    </div>
  )
}

export default AddRecipePage
