"use client";

import { normalizeVideoUrl } from "@/utils/nonnaVideo";
import { upload } from "@vercel/blob/client";
import { Loader2, PlayCircle, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Props {
  recipeId: number;
  /** True when the currently signed-in user owns this recipe entry. */
  isOwner: boolean;
  /**
   * Initial video URL (from `recipe.nonna_video`, with a fallback to any
   * legacy video URL still living in `recipe_image`).
   */
  initialVideoUrl: string | null;
  /** Opens the in-page video modal in Book.tsx. */
  onWatch: (url: string) => void;
}

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Renders the per-recipe video controls that sit under the flag on page 1:
 *
 *   • Non-owner, video present  → "Watch Video"
 *   • Non-owner, no video       → nothing
 *   • Owner, video present      → "Watch Video"  +  small "Replace" pill
 *   • Owner, no video           → "Upload Video of Nonna"
 *
 * The owner can pick a new video file inline; it's uploaded via the same
 * Vercel Blob handler the rest of the app uses, then PATCHed onto the recipe.
 * Local state is updated immediately so the new video is watchable without a
 * page reload.
 */
export default function NonnaVideoActions({
  recipeId,
  isOwner,
  initialVideoUrl,
  onWatch,
}: Props) {
  const [videoUrl, setVideoUrl] = useState<string | null>(() =>
    normalizeVideoUrl(initialVideoUrl),
  );
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVideoUrl(normalizeVideoUrl(initialVideoUrl));
  }, [initialVideoUrl]);

  const playableVideoUrl = normalizeVideoUrl(videoUrl);

  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be 50 MB or smaller.");
      return;
    }

    setIsUploading(true);
    try {
      const blob = await upload(`${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      const res = await fetch("/api/recipes", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipeId, nonna_video: blob.url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save the video");
      }

      setVideoUrl(blob.url);
      toast.success("Video uploaded.");
    } catch (err) {
      console.error("Nonna video upload failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload video.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // No video, not the owner → render nothing (no extra space under the flag).
  if (!playableVideoUrl && !isOwner) return null;

  return (
    <div
      className="mt-1 flex flex-col items-center gap-1.5"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {playableVideoUrl && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWatch(playableVideoUrl);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#6D2924] text-white px-3 py-1.5 text-[11px] xl:text-xs font-semibold shadow-md hover:bg-[#561e1a] transition-colors"
          title="Watch a video of Nonna in the kitchen"
        >
          <PlayCircle size={14} />
          Watch Video
        </button>
      )}

      {isOwner && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            aria-label="Upload a video of Nonna in the kitchen"
            title="Upload a video of Nonna in the kitchen"
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={openPicker}
            disabled={isUploading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] xl:text-xs font-semibold shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              playableVideoUrl
                ? "bg-white text-[#6D2924] border border-[#6D2924] hover:bg-[#FFE7D0]"
                : "bg-[#6D2924] text-white hover:bg-[#561e1a]"
            }`}
            title={
              playableVideoUrl
                ? "Replace the uploaded video"
                : "Upload a video of Nonna in the kitchen"
            }
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : playableVideoUrl ? (
              <RotateCcw size={14} />
            ) : (
              <Upload size={14} />
            )}
            {isUploading
              ? "Uploading…"
              : playableVideoUrl
                ? "Replace Video"
                : "Upload Video"}
          </button>
        </>
      )}
    </div>
  );
}
