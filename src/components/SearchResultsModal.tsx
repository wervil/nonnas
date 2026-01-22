'use client'

import { X } from 'lucide-react'
import { Recipe } from '@/db/schema'
import Image from 'next/image'

interface SearchResultsModalProps {
    isOpen: boolean
    onClose: () => void
    results: Recipe[]
    onSelect: (recipeId: number) => void
}

export const SearchResultsModal = ({
    isOpen,
    onClose,
    results,
    onSelect,
}: SearchResultsModalProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-[#fdfbf7] w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl shadow-2xl border border-[#d4c5b5]">
                <div className="flex items-center justify-between p-6 border-b border-[#e6dcd2] bg-[#f8f4eb]">
                    <h2 className="text-2xl font-serif text-[#4a3b2a]">
                        Search Results ({results.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#ebdccb] rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-[#8c7b6c]" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 max-h-[calc(80vh-100px)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((recipe) => (
                        <div
                            key={recipe.id}
                            onClick={() => onSelect(recipe.id)}
                            className="group cursor-pointer bg-white rounded-lg shadow-sm border border-[#e6dcd2] overflow-hidden hover:shadow-md hover:border-[#c2b4a3] transition-all"
                        >
                            <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                                {recipe.photo?.[0] ? (
                                    <Image
                                        src={recipe.photo[0]}
                                        alt={recipe.recipeTitle}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-serif text-lg text-[#2c241b] mb-1 group-hover:text-[#a63e2e] transition-colors">
                                    {recipe.recipeTitle}
                                </h3>
                                <p className="text-sm text-[#6b5d52] italic">
                                    {recipe.grandmotherTitle ||
                                        `${recipe.firstName} ${recipe.lastName}`}
                                </p>
                                <p className="text-xs text-[#8c7b6c] mt-1 uppercase tracking-wide">
                                    {recipe.country}
                                </p>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-500 italic font-serif">
                            No grandmother recipes found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
