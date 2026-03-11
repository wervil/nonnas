'use client'

import Button from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type UserWithUpdate = {
  id: string
  displayName: string | null
  primaryEmail?: string | null
  profileImageUrl?: string | null
  update: (data: { displayName?: string }) => Promise<void>
}

type ProfileFormProps = {
  user: UserWithUpdate
  onSuccess?: () => void
}

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return

    setSaving(true)
    try {
      await user.update({ displayName: displayName.trim() })
      toast.success('Profile updated successfully')
      onSuccess?.()
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className=" mx-auto">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-base font-light text-gray-700 mb-3 font-(--font-bell)"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            value={displayName}
            onChange={(e) => {
              const val = e.target.value
              if (val.length <= 100) setDisplayName(val)
            }}
            maxLength={100}
            className="w-full px-4 py-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFCCC8]/50 focus:border-[#FFCCC8]/50 font-(--font-bell) transition-all text-base"
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-base font-light text-gray-700 mb-3 font-(--font-bell)"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user?.primaryEmail || ''}
            disabled
            className="w-full px-4 py-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 font-(--font-bell) cursor-not-allowed text-base"
            placeholder="Email"
          />
          <p className="mt-2 text-sm text-gray-400 font-(--font-bell)">
            Email cannot be changed here. Use your account settings.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="bg-[#F5F5F5]! hover:bg-[#F5F5F5]! text-black text-[16px] px-6 rounded-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
