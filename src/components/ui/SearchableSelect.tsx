import React, { useState, useEffect, useRef } from 'react'
import { Typography } from './Typography'

export interface SearchableSelectProps {
    options: { value: string; label: string; flag?: string }[]
    value: string
    onChange: (value: string) => void
    placeholder: string
    disabled?: boolean
    error?: string
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    disabled,
    error,
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const selectedOption = options.find((opt) => opt.value === value)

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full px-3 py-4 border rounded-lg cursor-pointer flex items-center justify-between text-base font-[var(--font-merriweather)] ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-primary-hover text-text-pale'
                    } ${error ? 'border-danger-main' : 'border-primary-main'}`}
            >
                <span className="truncate">
                    {selectedOption ? (
                        <span className="flex items-center gap-2">
                            {selectedOption.flag && <span>{selectedOption.flag}</span>}
                            {selectedOption.label}
                        </span>
                    ) : (
                        placeholder
                    )}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-[#2e1d15] border border-primary-main rounded-lg shadow-lg">
                    <div className="p-2 border-b border-primary-main/30">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-primary-hover border border-primary-border rounded text-text-pale focus:outline-none focus:border-primary-focus placeholder-text-pale/50"
                            placeholder="Search..."
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <ul className="max-h-[150px] overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value)
                                        setIsOpen(false)
                                        setSearchTerm('')
                                    }}
                                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-primary-main hover:text-white transition-colors text-text-pale ${value === option.value ? 'bg-primary-focus/20' : ''
                                        }`}
                                >
                                    {option.flag && <span>{option.flag}</span>}
                                    {option.label}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-sm text-text-pale/50 text-center">No options found</li>
                        )}
                    </ul>
                </div>
            )}
            {error && (
                <Typography size="bodyXS" color="dangerMain" className="mt-2">
                    {error}
                </Typography>
            )}
        </div>
    )
}
