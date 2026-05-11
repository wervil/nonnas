'use client'

import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog'
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'
import { Reply, ShieldAlert, Trash2, User } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import CommentEditor, { Attachment } from './CommentEditor'

interface Comment {
    id: number
    recipe_id: number
    parent_comment_id: number | null
    user_id: string
    author_name?: string
    content: string
    depth: number
    created_at: string
    replies: Comment[]
    attachments?: Attachment[]
}

interface CommentItemProps {
    comment: Comment
    userId?: string
    onAddReply: (reply: Comment) => void
    onDelete: (commentId: number) => void
}

export default function CommentItem({
    comment,
    userId,
    onAddReply,
    onDelete,
}: CommentItemProps) {
    const [showReplyEditor, setShowReplyEditor] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isSuperAdmin = useIsSuperAdmin()
    const isOwner = !!userId && userId === comment.user_id
    const canDelete = isOwner || isSuperAdmin
    const canReply = (comment.depth || 0) < 3

    const handleReply = async (content: string, attachments?: Attachment[]) => {
        try {
            const res = await fetch('/api/recipe-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe_id: comment.recipe_id,
                    parent_comment_id: comment.id,
                    user_id: userId,
                    content,
                    attachments,
                }),
            })

            if (res.ok) {
                const newReply = await res.json()
                onAddReply(newReply)
                setShowReplyEditor(false)
            }
        } catch (error) {
            console.error('Error adding reply:', error)
        }
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            const query = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
            const res = await fetch(`/api/recipe-comments/${comment.id}${query}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                onDelete(comment.id)
                setShowDeleteConfirm(false)
                if (isSuperAdmin && !isOwner) {
                    toast.success('Comment deleted')
                }
            } else {
                const data = await res.json().catch(() => ({}))
                toast.error(data?.error || 'Failed to delete comment')
            }
        } catch (error) {
            console.error('Error deleting comment:', error)
            toast.error('Failed to delete comment')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="w-full">
            {/* Comment Card */}
            <div className="bg-[#f4f4f4] rounded-xl p-4 w-full">
                <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between w-full">
                        <div className="flex gap-2.5 items-center">
                            <div className="bg-white rounded-full size-8 flex items-center justify-center">
                                <User size={16} className="text-[#121212]" />
                            </div>
                            <p className="font-['Inter'] font-semibold text-base leading-6 text-[#2c2c2c] whitespace-nowrap">
                                {comment.author_name || 'Alex'}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex items-center w-full">
                        <p className="flex-1 font-['Inter'] font-medium text-sm leading-[22.75px] text-[#4a5565]">
                            {comment.content}
                        </p>
                    </div>

                    {/* Attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {comment.attachments.map((attachment, index) => (
                                <div key={index} className="relative rounded-xl overflow-hidden w-35 h-50">
                                    {attachment.type === 'image' && (
                                        <Image
                                            src={attachment.url}
                                            alt={attachment.name || 'Attachment'}
                                            className="w-full h-full object-cover"
                                            width={140}
                                            height={200}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 items-center opacity-80">
                        {canReply && (
                            <button
                                onClick={() => setShowReplyEditor(!showReplyEditor)}
                                className="flex gap-2.5 items-center hover:opacity-60 transition-opacity"
                                title="Reply"
                            >
                                <Reply size={16} className="text-black" />
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isDeleting}
                                className="flex gap-1.5 items-center hover:opacity-60 transition-opacity disabled:opacity-40"
                                title={
                                    isSuperAdmin && !isOwner
                                        ? 'Delete (Super Admin)'
                                        : 'Delete'
                                }
                            >
                                <Trash2 size={16} className="text-[#D93832]" />
                                {isSuperAdmin && !isOwner && (
                                    <ShieldAlert
                                        size={12}
                                        className="text-[#D93832]"
                                    />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Reply Editor */}
            {showReplyEditor && userId && canReply && (
                <div className="mt-3 ml-8">
                    <CommentEditor
                        onSubmit={handleReply}
                        onCancel={() => setShowReplyEditor(false)}
                        placeholder="Write a reply..."
                    />
                </div>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 ml-8 space-y-3">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            userId={userId}
                            onAddReply={onAddReply}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmDeleteDialog
                open={showDeleteConfirm}
                onOpenChange={setShowDeleteConfirm}
                onConfirm={handleDelete}
                title={
                    isSuperAdmin && !isOwner
                        ? "Delete this user's comment?"
                        : 'Delete this comment?'
                }
                description={
                    isSuperAdmin && !isOwner
                        ? `You're deleting this comment as Super Admin. The comment and any replies to it will be permanently removed.`
                        : 'This will permanently remove your comment and any replies to it. This action cannot be undone.'
                }
                confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
                isLoading={isDeleting}
            />
        </div>
    )
}
