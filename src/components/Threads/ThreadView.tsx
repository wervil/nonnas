'use client'

import React, { useEffect, useState } from 'react'
import type { Thread, Post } from '@/db/schema'
import PostItem from './PostItem'
import CommentEditor, { Attachment } from '../Comments/CommentEditor'
import LikeButton from '../LikeButton'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import AudioPlayer from '../ui/AudioPlayer'

interface ThreadViewProps {
  threadId: number
  currentUserId?: string
  isAuthenticated: boolean
  onBack?: () => void
  hideBackButton?: boolean
}

// Extended thread type with like and post data
interface EnrichedThread extends Thread {
  like_count: number
  user_has_liked: boolean
  posts: Post[]
}

type PostWithReplies = Post & { replies: PostWithReplies[] }

// ✅ Safe conversion for React children (prevents "unknown is not assignable to ReactNode")
const toText = (v: unknown, fallback = ''): string => {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v == null) return fallback
  try {
    return JSON.stringify(v)
  } catch {
    return fallback
  }
}

export default function ThreadView({
  threadId,
  currentUserId,
  isAuthenticated,
  onBack,
  hideBackButton,
}: ThreadViewProps) {
  const [thread, setThread] = useState<EnrichedThread | null>(null)
  const [posts, setPosts] = useState<PostWithReplies[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Add a key that changes each time to force refetch
  const [fetchKey, setFetchKey] = useState(Date.now())

  // Build tree structure from flat posts array
  const buildPostTree = (flatPosts: Post[]): PostWithReplies[] => {
    const postMap = new Map<number, PostWithReplies>()
    const rootPosts: PostWithReplies[] = []

    // First pass: create map of all posts with empty replies array
    flatPosts.forEach(post => {
      postMap.set(post.id, { ...post, replies: [] } as PostWithReplies)
    })

    // Second pass: build tree structure
    flatPosts.forEach(post => {
      const postWithReplies = postMap.get(post.id)!
      if (post.parent_post_id) {
        // This is a nested reply, add it to parent's replies
        const parent = postMap.get(post.parent_post_id)
        if (parent) {
          parent.replies.push(postWithReplies)
        } else {
          // Parent missing → treat as root so it still shows up
          rootPosts.push(postWithReplies)
        }
      } else {
        rootPosts.push(postWithReplies)
      }
    })

    // Sort by date: oldest first
    const sortPosts = (arr: PostWithReplies[]) => {
      arr.sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      )
      arr.forEach(p => sortPosts(p.replies))
    }

    sortPosts(rootPosts)
    return rootPosts
  }

  const fetchThread = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 1. Fetch Thread
      const threadRes = await fetch(`/api/threads?id=${threadId}`)
      if (!threadRes.ok) throw new Error('Failed to fetch thread')

      const threadDataRaw = await threadRes.json()
      // Handle array response or object wrapper
      const threadData = Array.isArray(threadDataRaw)
        ? threadDataRaw[0]
        : threadDataRaw?.threads
          ? threadDataRaw.threads[0]
          : null

      if (!threadData) {
        setError('Thread not found')
        setThread(null)
        setPosts([])
        return
      }

      setThread(threadData)

      // 2. Fetch Posts
      const postsRes = await fetch(`/api/posts?thread_id=${threadId}`)
      if (postsRes.ok) {
        const postsData = await postsRes.json()
        setPosts(buildPostTree(postsData))
      } else {
        setPosts([])
      }
    } catch (err: any) {
      console.error('Error in fetchThread:', err)
      setError(err?.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchThread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, currentUserId, fetchKey])

  const handleReply = async (content: string, attachments?: Attachment[]) => {
    if (!currentUserId || !thread) return

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread.id,
          content,
          attachments,
        }),
      })

      if (!res.ok) throw new Error('Failed to post reply')

      const newPost = await res.json()

      // Optimistically add to posts as top-level reply
      const optimisticPost: PostWithReplies = { ...newPost, replies: [] }
      setPosts(prev => [...prev, optimisticPost])

      toast.success('Reply posted!')
    } catch (err) {
      toast.error('Failed to post reply')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNestedReply = async (
    parentPostId: number,
    content: string,
    attachments?: Attachment[]
  ) => {
    if (!currentUserId || !thread) throw new Error('You must be logged in')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread.id,
          content,
          parent_post_id: parentPostId,
          attachments,
        }),
      })

      if (!res.ok) throw new Error('Failed to post reply')

      const newPost: Post = await res.json()
      toast.success('Reply posted!')
      return newPost
    } catch (err) {
      toast.error('Failed to post reply')
      console.error(err)
      throw err
    }
  }

  const handleDeletePost = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post deleted')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-main)]" />
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-danger-main)] mb-4">{error || 'Thread not found'}</p>
        {onBack && (
          <div
            onClick={onBack}
            className="text-[var(--color-primary-main)] hover:underline cursor-pointer"
          >
            Back to discussions
          </div>
        )}
      </div>
    )
  }

  // ✅ Always produce strings for React children
  const threadTitle = toText(thread?.title, 'Untitled')
  const threadContent = toText(thread?.content, '')

  return (
    <div className="bg-[var(--color-background-main)] min-h-screen font-[var(--font-bell)] pb-32">
      {/* Main Thread Post */}
      <div className="bg-gradient-to-br from-[var(--color-brown-pale)]/80 via-[var(--color-brown-pale)]/60 to-[var(--color-brown-light)]/40 border border-[var(--color-primary-border)]/30 rounded-xl p-5 mb-6 shadow-lg">
        {/* Meta info - top */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-pale)] bg-[var(--color-brown-light)]/30 px-2.5 py-1 rounded-full border border-[var(--color-primary-border)]/20">
            <span className="capitalize font-medium text-[var(--color-yellow-light)]">
              {toText(thread.scope, '')}
            </span>
            <span className="text-[var(--color-primary-border)]/40">|</span>
            <span className="capitalize">{toText(thread.region, '')}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold mb-2 text-[var(--color-yellow-light)] capitalize font-[var(--font-bell)]">
          {threadTitle}
        </h2>

        {/* Content */}
        <p className="text-[var(--color-text-pale)] text-sm whitespace-pre-wrap mb-4 leading-relaxed font-[var(--font-bell)]">
          {threadContent}
        </p>

        {/* Attachments */}
        {Array.isArray(thread.attachments) && thread.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(thread.attachments as any[]).map((att, i) => (
              <div key={i} className="max-w-md w-full">
                {att?.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.url}
                    alt="Attachment"
                    className="max-h-64 rounded-lg border border-[var(--color-primary-border)]/30 object-cover"
                  />
                ) : att?.type === 'video' ? (
                  <video
                    src={att.url}
                    controls
                    className="max-h-64 rounded-lg border border-[var(--color-primary-border)]/30"
                  />
                ) : (
                  <AudioPlayer src={att.url} className="w-full" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--color-primary-border)]/20">
          <LikeButton
            likeableId={thread.id}
            likeableType="thread"
            initialCount={thread.like_count || 0}
            initialLiked={thread.user_has_liked || false}
            isAuthenticated={isAuthenticated}
          />

          <div className="flex items-center gap-1.5 text-[var(--color-text-pale)] text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{posts.length} replies</span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--color-text-pale)] text-xs ml-auto">
            <span className="opacity-70">
              {new Date((thread as any).created_at || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Reply Input */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-[var(--color-text-main)] mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Reply to this discussion
        </h3>

        {isAuthenticated ? (
          <CommentEditor onSubmit={handleReply} onCancel={() => {}} placeholder="Share your thoughts..." />
        ) : (
          <div className="bg-[var(--color-brown-light)]/30 p-4 rounded-lg text-center text-sm text-[var(--color-text-pale)]">
            Please sign in to reply to this discussion.
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-pale)] text-sm italic opacity-60">
            No replies yet. Be the first to share your thoughts!
          </div>
        ) : (
          posts.map(post => (
            <PostItem
              key={post.id}
              post={post}
              threadId={thread.id}
              currentUserId={currentUserId}
              isAuthenticated={isAuthenticated}
              onReplySubmit={handleNestedReply}
              onDelete={handleDeletePost}
            />
          ))
        )}
      </div>
    </div>
  )
}
