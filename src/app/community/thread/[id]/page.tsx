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
        <div className="flex flex-col min-h-svh w-full relative bg-white">
            <div className="relative z-10 w-full">
                <Header
                    hasAdminAccess={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    user={user ? (user as any).toClientJson() : null}
                    className="!bg-white/80 border-b border-gray-200 backdrop-blur-md"
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