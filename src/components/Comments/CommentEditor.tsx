'use client'

import { Loader2, Mic, Paperclip, User } from 'lucide-react'
import { useState } from 'react'

export interface Attachment {
    type: 'image' | 'video' | 'audio'
    url: string
    name?: string
}

interface CommentEditorProps {
    onSubmit: (content: string, attachments?: Attachment[]) => void | Promise<void>
    onCancel: () => void
    placeholder?: string
}

export default function CommentEditor({
    onSubmit,
    placeholder = "Share your thoughts about this recipe...",
}: CommentEditorProps) {
    const [content, setContent] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return
        setIsSubmitting(true)
        try {
            await onSubmit(content, attachments.length > 0 ? attachments : undefined)
            setContent('')
            setAttachments([])
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClear = () => {
        setContent('')
        setAttachments([])
    }

    return (
        <div className="flex gap-3 items-start w-full">
            {/* Avatar */}
            <div className="bg-[#f4f4f4] rounded-full shrink-0 size-9 flex items-center justify-center">
                <User size={20} className="text-[#121212]" />
            </div>

            {/* Input Container */}
            <div className="flex-1 flex flex-col gap-3">
                {/* Text Input with Icons */}
                <div className="flex gap-3 items-center">
                    <div className="flex-1 bg-[#f4f4f4] rounded-lg px-3 py-2.5 flex items-center">
                        <input
                            type="text"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                            placeholder={placeholder}
                            disabled={isSubmitting}
                            className="w-full bg-transparent border-none outline-none text-sm text-[#0a0a0a] placeholder:text-[rgba(10,10,10,0.5)] font-['Inter'] font-normal leading-6 disabled:opacity-60"
                        />
                    </div>

                    {/* Icons */}
                    <div className="flex gap-1 items-center">
                        <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors" disabled={isSubmitting}>
                            <Paperclip size={16} className="text-[#121212] opacity-70" />
                        </button>
                        <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors" disabled={isSubmitting}>
                            <Mic size={16} className="text-[#121212] opacity-70" />
                        </button>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 items-center justify-end">
                    <button
                        onClick={handleClear}
                        disabled={isSubmitting}
                        className="bg-[#f4f4f4] px-4 py-2 text-[#364153] font-['Inter'] font-medium text-sm leading-6 hover:bg-gray-200 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                        className="bg-[#ffccc8] px-4 py-2 text-[#121212] font-['Inter'] font-medium text-sm leading-6 hover:bg-[#ffb8b3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Posting...
                            </>
                        ) : (
                            'Post Comment'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
