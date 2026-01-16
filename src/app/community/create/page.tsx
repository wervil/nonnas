import { stackServerApp } from '@/stack'
import { redirect } from 'next/navigation'
import CreateThreadForm from '@/components/Threads/CreateThreadForm'

export default async function CreateThreadPage({
    searchParams,
}: {
    searchParams: Promise<{ region?: string; scope?: string }>
}) {
    const user = await stackServerApp.getUser()

    // Require authentication
    if (!user) {
        redirect('/handler/sign-in')
    }

    const params = await searchParams
    const region = params.region || ''
    const scope = (params.scope as 'country' | 'state') || 'country'

    if (!region) {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        Missing region parameter. Please select a region from the map.
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Start a Discussion
                </h1>
                <p className="text-gray-600 mb-8">
                    Share your thoughts, ask questions, or start a conversation about{' '}
                    {region}.
                </p>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <CreateThreadForm region={region} scope={scope} />
                </div>
            </div>
        </div>
    )
}