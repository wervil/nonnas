'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Paperclip, X, Video, Mic } from 'lucide-react'
import { upload } from '@vercel/blob/client'
import { toast } from 'sonner'
import { Attachment, AttachmentType } from '../Comments/CommentEditor'

interface CreateThreadFormProps {
    region: string
    scope: 'country' | 'state'
    onSuccess?: () => void
}

export default function CreateThreadForm({
    region,
    scope,
    onSuccess,
}: CreateThreadFormProps) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        // Simple validation
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            toast.error("File size must be less than 50MB")
            return
        }

        let type: AttachmentType | null = null
        if (file.type.startsWith('image/')) type = 'image'
        else if (file.type.startsWith('video/')) type = 'video'
        else if (file.type.startsWith('audio/')) type = 'audio'

        if (!type) {
            toast.error("Unsupported file type")
            return
        }

        setIsUploading(true)
        try {
            // Add timestamp to filename to avoid collisions
            const uniqueFilename = `${Date.now()}-${file.name}`
            const newBlob = await upload(uniqueFilename, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
            })

            setAttachments(prev => [...prev, {
                url: newBlob.url,
                type: type!,
                name: file.name
            }])
            toast.success("File attached")
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Failed to upload file")
        } finally {
            setIsUploading(false)
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (title.length > 120) {
            setError('Title must be 120 characters or less')
            return
        }

        if (content.length > 5000) {
            setError('Content must be 5000 characters or less')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    region,
                    scope,
                    title,
                    content,
                    attachments,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                // Handle validation/moderation errors gracefully without logging as system errors
                if (response.status === 400) {
                    setError(data.error || 'Invalid request')
                    setIsSubmitting(false)
                    return
                }
                throw new Error(data.error || 'Failed to create thread')
            }

            const thread = await response.json()

            // Reset form
            setTitle('')
            setContent('')
            setAttachments([])


            if (onSuccess) {
                onSuccess()
            } else {
                router.push(`/community/thread/${thread.id}`)
            }
        } catch (err) {
            console.error('Error creating thread:', err)
            const errorMessage = err instanceof Error ? err.message : 'Failed to create thread';
            setError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                    ⚠️ {error}
                </div>
            )}

            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                    Title{' '}
                    <span className={`${title.length > 100 ? 'text-amber-400' : 'text-gray-500'}`}>
                        ({title.length}/120)
                    </span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="What's your discussion about?"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all font-[var(--font-bell)]"
                />
            </div>

            {/* Content */}
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                    Content{' '}
                    <span className={`${content.length > 4500 ? 'text-amber-400' : 'text-gray-500'}`}>
                        ({content.length}/5000)
                    </span>
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={5000}
                    required
                    rows={6}
                    placeholder="Share your thoughts, questions, or stories..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none font-[var(--font-bell)]"
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-2 bg-white/5 rounded-xl border border-white/10">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative group bg-gray-800 rounded-lg overflow-hidden border border-gray-700 w-20 h-20 flex items-center justify-center">
                                {att.type === 'image' ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={att.url} alt="attachment" className="w-full h-full object-cover" />
                                ) : att.type === 'video' ? (
                                    <Video className="w-8 h-8 text-gray-400" />
                                ) : (
                                    <Mic className="w-8 h-8 text-gray-400" />
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeAttachment(i)}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* File Upload Button */}
                <div className="mt-3 flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors border border-white/10"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        Attach file
                    </button>
                    <span className="text-xs text-gray-500 italic">
                        Images, video, or audio (max 50MB)
                    </span>
                </div>
            </div>

            {/* Region and Scope Info */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-[var(--font-bell)]">
                <div className="flex items-center gap-4 text-gray-400">
                    <span>
                        <strong className="text-gray-300">Region:</strong> {region}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span>
                        <strong className="text-gray-300">Scope:</strong>{' '}
                        <span className={scope === 'country' ? 'text-blue-400' : 'text-emerald-400'}>
                            {scope === 'country' ? '🌍 Country' : '📍 State'}
                        </span>
                    </span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || !title || !content}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:shadow-none flex items-center justify-center gap-2 font-[var(--font-bell)]"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Create Discussion
                    </>
                )}
            </button>
        </form>
    )
}