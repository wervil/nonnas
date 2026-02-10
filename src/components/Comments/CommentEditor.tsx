import { useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Paperclip, X, Image as ImageIcon, Video, Mic, LogOut, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import AudioRecorder from './AudioRecorder'
import AudioPlayer from '../ui/AudioPlayer'

export type AttachmentType = 'image' | 'video' | 'audio'

export interface Attachment {
    url: string
    type: AttachmentType
    name?: string
}

interface CommentEditorProps {
    onSubmit: (content: string, attachments?: Attachment[]) => Promise<void>
    onCancel: () => void
    placeholder?: string
    isReply?: boolean
}

export default function CommentEditor({
    onSubmit,
    onCancel,
    placeholder = "Share your thoughts on this recipe...",
    isReply = false,
}: CommentEditorProps) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isRecordingMode, setIsRecordingMode] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

        // Upload logic reused
        await uploadFile(file, type)
    }

    const uploadFile = async (file: File | Blob, type: AttachmentType) => {
        setIsUploading(true)
        try {
            // Add timestamp to filename to avoid collisions
            const filename = (file as File).name || `recording-${Date.now()}.webm`
            const uniqueFilename = `${Date.now()}-${filename}`

            const newBlob = await upload(uniqueFilename, file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
            })

            setAttachments(prev => [...prev, {
                url: newBlob.url,
                type: type,
                name: filename
            }])
            toast.success("File attached")
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Failed to upload file")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleAudioSave = async (blob: Blob) => {
        setIsRecordingMode(false)
        await uploadFile(blob, 'audio')
    }

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!content.trim() && attachments.length === 0) return

        setLoading(true)
        try {
            await onSubmit(content, attachments)
            setContent('')
            setAttachments([])
        } catch (error) {
            console.error('Error submitting comment:', error)
        } finally {
            setLoading(false)
        }
    }

    const remaining = 2000 - content.length

    return (
        <div className={`comment-editor relative ${isReply ? 'mt-3' : ''}`}>
            {/* Decorative corner flourishes */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--color-primary-border)] rounded-tl-sm opacity-60" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[var(--color-primary-border)] rounded-tr-sm opacity-60" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[var(--color-primary-border)] rounded-bl-sm opacity-60" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--color-primary-border)] rounded-br-sm opacity-60" />

            <div className={`bg-[var(--color-primary-secondary)] border border-[var(--color-primary-border)] rounded-lg p-4 shadow-sm ${isRecordingMode || attachments.some(a => a.type === 'audio') ? 'pb-2' : ''}`}>
                {!(isRecordingMode || attachments.some(a => a.type === 'audio')) ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={placeholder}
                        className="w-full p-3 bg-white/80 border border-[var(--color-primary-border)] rounded-md 
                                 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-border)] 
                                 focus:border-transparent transition-all duration-200
                                 font-[var(--font-bell)] text-[var(--color-primary-main)] placeholder:text-[var(--color-text-pale)]
                                 placeholder:italic"
                        rows={isReply ? 3 : 4}
                        maxLength={2000}
                        autoFocus
                    />
                ) : null}

                {/* Audio Playing State (Exclusive) */}
                {attachments.map((att, i) => {
                    if (att.type === 'audio') {
                        return (
                            <div key={i} className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[var(--color-text-pale)] uppercase tracking-wider flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-main)] animate-pulse"></div>
                                        Voice Note Attached
                                    </span>
                                    <button
                                        onClick={() => removeAttachment(i)}
                                        className="p-1 hover:bg-red-50 text-[var(--color-text-pale)] hover:text-red-500 rounded-full transition-colors"
                                        title="Remove Audio"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <AudioPlayer src={att.url} className="w-full" />
                            </div>
                        )
                    }
                    return null
                })}

                {/* Attachments Preview (Non-Audio) */}
                {attachments.length > 0 && !attachments.some(a => a.type === 'audio') && (
                    <div className="flex flex-wrap gap-2 mt-3 p-2 bg-white/50 rounded-md border border-[var(--color-primary-border)]/20">
                        {attachments.map((att, i) => (
                            <div key={i} className="relative group bg-gray-100 rounded-md overflow-hidden border border-gray-200 w-16 h-16 flex items-center justify-center">
                                {att.type === 'image' ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={att.url} alt="attachment" className="w-full h-full object-cover" />
                                ) : att.type === 'video' ? (
                                    <Video className="w-8 h-8 text-gray-400" />
                                ) : null}
                                <button
                                    onClick={() => removeAttachment(i)}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between mt-3 pt-3 border-t border-[var(--color-primary-border)]/30 gap-y-2">
                    <div className="flex items-center gap-2">
                        {isRecordingMode ? (
                            <AudioRecorder
                                onSave={handleAudioSave}
                                onCancel={() => setIsRecordingMode(false)}
                            />
                        ) : (
                            // Only show controls if no audio attachment exists
                            !attachments.some(a => a.type === 'audio') ? (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        accept="image/*,video/*,audio/*"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading || loading}
                                        className="p-1.5 text-[var(--color-primary-main)] hover:bg-[var(--color-primary-focus)] rounded-full transition-colors"
                                        title="Attach file"
                                    >
                                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                    </button>
                                    {/* Audio Button - Hidden if text or files present */}
                                    {!content.trim() && attachments.length === 0 && (
                                        <button
                                            onClick={() => {
                                                // Enforce exclusivity: Clear existing content
                                                setContent('')
                                                setAttachments([])
                                                setIsRecordingMode(true)
                                            }}
                                            disabled={isUploading || loading}
                                            className="p-1.5 text-[var(--color-primary-main)] hover:bg-[var(--color-primary-focus)] rounded-full transition-colors"
                                            title="Record audio"
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )}
                                    <span className="text-sm text-[var(--color-text-pale)] italic font-[var(--font-bell)] ml-2">
                                        {remaining} chars
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-[var(--color-success-main)] flex items-center gap-1 font-medium bg-[var(--color-success-main)]/10 px-2 py-0.5 rounded-full">
                                    <Check className="w-3 h-3" /> Audio Ready
                                </span>
                            )
                        )}
                    </div>


                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-[var(--color-primary-main)] hover:bg-[var(--color-primary-focus)] 
                                     rounded-md transition-colors duration-200 font-[var(--font-bell)] text-sm"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-5 py-2 bg-[var(--color-primary-main)] text-white rounded-md 
                                     hover:bg-[var(--color-primary-hover)] disabled:opacity-50 
                                     disabled:cursor-not-allowed transition-all duration-200
                                     font-[var(--font-bell)] text-sm shadow-sm hover:shadow-md
                                     flex items-center gap-2"
                            disabled={loading || isUploading || (!content.trim() && attachments.length === 0)}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    <span>Posting...</span>
                                </>
                            ) : (
                                <span>{isReply ? 'Reply' : 'Post'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
