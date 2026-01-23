import { stackServerApp } from '@/stack'
import ThreadView from '@/components/Threads/ThreadView'
import { redirect } from 'next/navigation'
import { Header } from '@/components/Header'

export default async function ThreadPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const user = await stackServerApp.getUser()
    const isAuthenticated = !!user

    const { id } = await params
    const threadId = parseInt(id)

    if (isNaN(threadId)) {
        redirect('/community')
    }



    return (
        <div className="flex flex-col min-h-svh w-full relative">
            {/* <Image
                src="/bg.webp"
                alt="Background"
                layout="fill"
                objectFit="cover"
                className="z-[-1]"
                priority
            /> */}
            <div className="relative z-10 w-full bg-transparent">
                <Header
                    hasAdminAccess={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    user={user ? (user as any).toClientJson() : null}
                />
            </div>

            <main className="flex-grow w-full max-w-5xl mx-auto p-4 md:p-8 pt-4 relative z-10">
                <ThreadView
                    threadId={threadId}
                    currentUserId={user?.id || undefined}
                    isAuthenticated={isAuthenticated}
                />
            </main>
        </div>
    )
}