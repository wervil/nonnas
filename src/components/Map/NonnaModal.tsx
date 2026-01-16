'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import ThreadList from '../Threads/ThreadList'

// Define proper Recipe type
interface Recipe {
    id: number;
    recipeTitle: string;
    history?: string;
    [key: string]: unknown;
}

interface NonnaModalProps {
    isOpen: boolean
    onClose: () => void
    region: string
    scope: 'country' | 'state'
    recipes?: Recipe[]
}

export default function NonnaModal({
    isOpen,
    onClose,
    region,
    scope,
    recipes = [],
}: NonnaModalProps) {
    const [activeTab, setActiveTab] = useState<'recipes' | 'community'>('recipes')

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{region}</h2>
                        <p className="text-sm text-gray-600">
                            {scope === 'country' ? 'Country' : 'State'} Level
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('recipes')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'recipes'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Recipes
                    </button>
                    <button
                        onClick={() => setActiveTab('community')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'community'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Community
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                    {activeTab === 'recipes' ? (
                        <div>
                            {recipes.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No recipes available for this region yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {recipes.map((recipe) => (
                                        <div
                                            key={recipe.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <h3 className="font-semibold text-gray-900 mb-2">
                                                {recipe.recipeTitle}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {recipe.history}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    // Navigate to recipe flipbook
                                                    window.location.href = `/?recipe=${recipe.id}`
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                View Recipe →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="mb-4 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Regional Discussions
                                </h3>
                                <button
                                    onClick={() => {
                                        window.location.href = `/community/create?region=${region}&scope=${scope}`
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    + Start Discussion
                                </button>
                            </div>
                            <ThreadList region={region} scope={scope} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
