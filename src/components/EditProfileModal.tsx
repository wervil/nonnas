'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type UserWithUpdate = {
  id: string
  displayName: string | null
  primaryEmail?: string | null
  update: (data: { displayName?: string }) => Promise<void>
}

type EditProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserWithUpdate
  onSuccess?: () => void
}

export function EditProfileModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditProfileModalProps) {
  const t = useTranslations('buttons')
  const l = useTranslations('labels')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName ?? '')
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return

    setSaving(true)
    try {
      await user.update({ displayName: displayName.trim() })
      toast.success('Profile updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error('Failed to update profile:', err)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--color-brown-pale)] border-[var(--color-primary-border)]/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-yellow-light)] font-[var(--font-bell)] text-xl">
            Edit profile
          </DialogTitle>
          <DialogDescription className="text-[var(--color-text-pale)] font-[var(--font-bell)]">
            Update your display name. This is how you appear across the app.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div>
            <label
              htmlFor="edit-displayName"
              className="block text-sm font-medium text-[var(--color-yellow-light)] mb-1.5 font-[var(--font-bell)]"
            >
              {l('fullName')}
            </label>
            <input
              id="edit-displayName"
              type="text"
              value={displayName}
              onChange={(e) => {
                const val = e.target.value
                if (val.length <= 100) setDisplayName(val)
              }}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-primary-border)]/40 bg-[var(--color-brown-dark)]/50 text-[var(--color-yellow-light)] placeholder:text-[var(--color-text-pale)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 focus:border-[var(--color-success-main)] font-[var(--font-bell)]"
              placeholder="Your name"
              required
            />
            <p className="mt-1 text-xs text-[var(--color-text-pale)]/80 font-[var(--font-bell)]">
              {displayName.length}/100
            </p>
          </div>

          {user?.primaryEmail != null && user.primaryEmail !== '' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-pale)] mb-1.5 font-[var(--font-bell)]">
                Email
              </label>
              <p className="text-sm text-[var(--color-text-pale)]/90 font-[var(--font-bell)]">
                {user.primaryEmail}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-pale)]/60 font-[var(--font-bell)]">
                Email cannot be changed here. Use your account settings.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="border-[var(--color-primary-border)]/40 text-[var(--color-text-pale)] hover:bg-[var(--color-brown-dark)]/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="bg-[var(--color-brown-light)] hover:opacity-90 text-[var(--color-yellow-light)]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
