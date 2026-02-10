'use client'

import { X } from 'lucide-react'
import { Recipe } from '@/db/schema'
import Image from 'next/image'

import { Select } from './Select'
import { Dispatch, SetStateAction } from 'react'

interface SearchResultsModalProps {
    isOpen: boolean
    onClose: () => void
    results: Recipe[]
    onSelect: (recipeId: number) => void
    selectedCountry?: { label: string; value: string; code?: string }
    search?: string
    setSearch?: Dispatch<SetStateAction<string>>
    countriesOptions?: { label: string; value: string; code?: string }[]
    setSelectedCountry?: Dispatch<SetStateAction<{ label: string; value: string }>>
}

export const SearchResultsModal = ({
    isOpen,
    onClose,
    results,
    onSelect,
    selectedCountry,
    search,
    setSearch,
    countriesOptions,
    setSelectedCountry,
}: SearchResultsModalProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative bg-[#fdfbf7] w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-xl shadow-2xl border border-[#d4c5b5] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-[#e6dcd2] bg-[#f8f4eb] shrink-0">
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

                {/* Mobile Filters */}
                <div className="block md:hidden p-4 bg-[#f8f4eb] border-b border-[#e6dcd2] space-y-3 shrink-0">
                    {setSearch && (
                        <div className="flex items-center gap-2 border-2 border-[#5f5f13] rounded-full px-3 py-1 bg-white">
                            <Image
                                src="/search.svg"
                                width={18}
                                height={18}
                                alt="search icon"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full border-0 outline-0 italic text-gray-500 bg-transparent text-sm"
                            />
                        </div>
                    )}
                    {countriesOptions && setSelectedCountry && (
                        <div className="w-full relative bg-white rounded-[20px] border-2 border-[#5f5f13]">
                            <Select
                                options={countriesOptions}
                                selectedOption={selectedCountry}
                                setSelectedOption={setSelectedCountry}
                                placeholder="All"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Image
                                    src="/flag-icon.svg" // Assuming this is how the flag icon works in Select/Header, or using a chevron if that's what's intended. Checking Header usage suggests Select component handles it or it's a separate div. Header has <div className="flag-icon" />. Let's start with Select component only as it might have its own arrow. 
                                    // Actually looking at Header.tsx, it uses <div className="flag-icon" /> separately. Let me double check if I can just use Select.
                                    // The design shows a specific arrow/icon. 
                                    // Let's stick to the structure in Header for consistency.
                                    // In Header:
                                    // <Select ... />
                                    // <div className="flag-icon" />
                                    // I will use just Select for now and we can refine if needed.
                                    // Actually, looking at the user image, it's the "All" dropdown with a custom arrow.
                                    // I'll replicate exactly what Header does for the Select wrapper.

                                    width={12} height={12} alt="" />
                            </div>
                        </div>
                    )}
                </div>
                <div className="overflow-y-auto p-6 max-h-[calc(80vh-100px)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((recipe) => (
                        <div
                            key={recipe.id}
                            onClick={() => onSelect(recipe.id)}
                            className="group cursor-pointer bg-white rounded-lg shadow-sm border border-[#e6dcd2] hover:shadow-md hover:border-[#c2b4a3] transition-all flex flex-col"
                        >
                            <div className="relative h-48 md:h-auto md:aspect-[4/3] bg-gray-100 shrink-0">
                                {recipe.photo?.[0] ? (
                                    <Image
                                        src={recipe.photo[0]}
                                        alt={recipe.recipeTitle}
                                        fill
                                        style={{borderRadius: '10px 10px 0px 0px'}}
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col justify-between grow">
                                <div>
                                    <h3 className="font-serif text-lg text-[#2c241b] mb-1 group-hover:text-[#a63e2e] transition-colors line-clamp-2">
                                        {recipe.recipeTitle}
                                    </h3>
                                    <p className="text-sm text-[#6b5d52] italic">
                                        {recipe.grandmotherTitle ||
                                            `${recipe.firstName} ${recipe.lastName}`}
                                    </p>
                                </div>
                                <p className="text-xs text-[#8c7b6c] mt-1 uppercase tracking-wide">
                                    {recipe.country}
                                </p>
                            </div>
                        </div>
                    ))}
                    {results.length === 0 && (
                        selectedCountry ? (
                            <div className="col-span-full py-16 text-center">
                                <h3 className="text-xl font-serif text-[#4a3b2a] mb-2">
                                    No grandmother recipes found in {selectedCountry.value} yet.
                                </h3>
                                <p className="text-[#6b5d52] mb-6">
                                    Do you have a Nonna from {selectedCountry.value}? Be the first to share her story!
                                </p>
                                <a
                                    href={`/explore?country=${selectedCountry.code}&countryName=${encodeURIComponent(selectedCountry.value)}&tab=discussion`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block px-6 py-3 bg-[#a63e2e] !text-white font-medium rounded-full hover:bg-[#8c3426] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Start a Discussion in {selectedCountry.value}
                                </a>
                            </div>
                        ) : (
                            <div className="col-span-full py-10 text-center text-gray-500 italic font-serif">
                                No grandmother recipes found matching your search.
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
