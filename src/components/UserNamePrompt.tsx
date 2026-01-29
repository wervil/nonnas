'use client'

import { useUser } from '@stackframe/stack'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Button from './ui/Button'
import { Loader2 } from 'lucide-react'

export const UserNamePrompt = () => {
    const user = useUser()
    const [isOpen, setIsOpen] = useState(false)
    const [name, setName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!user) return

        // Check if user has a display name
        // Sometimes Stack defaults displayName to email or ID if not set
        // We consider it "admin-defined" or "missing" if it's falsy or matches the ID
        const currentName = user.displayName
        const isMissingName = !currentName || currentName === user.id

        if (isMissingName) {
            setIsOpen(true)
        }
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !name.trim()) return

        setIsSubmitting(true)
        try {
            await user.update({
                displayName: name.trim()
            })
            toast.success('Name updated successfully!')
            setIsOpen(false)
        } catch (error) {
            console.error('Failed to update name:', error)
            toast.error('Failed to update name. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#fdfbf7] w-full max-w-md rounded-xl shadow-2xl border border-[#d4c5b5] overflow-hidden">
                <div className="p-6 border-b border-[#e6dcd2] bg-[#f8f4eb]">
                    <h2 className="text-2xl font-serif text-[#4a3b2a]">Welcome!</h2>
                    <p className="text-[#6b5d52] mt-1 text-sm">Please tell us your name to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-[#4a3b2a] mb-1">
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="displayName"
                            value={name}
                            onChange={(e) => {
                                const val = e.target.value
                                // Only allow letters and spaces (no numbers, no special chars)
                                if (/^[a-zA-Z\s]*$/.test(val)) {
                                    setName(val)
                                }
                            }}
                            className="w-full px-3 py-2 border border-[#d4c5b5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a63e2e]/20 focus:border-[#a63e2e] bg-white text-[#2c241b]"
                            placeholder="e.g. John Doe"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="w-full justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Continue'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
