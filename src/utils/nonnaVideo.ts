export const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);

/** Treat null, empty, and literal "null"/"undefined" strings as no video. */
export const normalizeVideoUrl = (
  url: string | null | undefined,
): string | null => {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (
    !trimmed ||
    /^null$/i.test(trimmed) ||
    /^undefined$/i.test(trimmed) ||
    trimmed === "[]" ||
    trimmed === "{}"
  ) {
    return null;
  }
  return trimmed;
};

/** True when the URL is non-empty and looks like a watchable video file. */
export const hasPlayableNonnaVideo = (
  url: string | null | undefined,
): boolean => {
  const normalized = normalizeVideoUrl(url);
  return Boolean(normalized && isVideoUrl(normalized));
};

export const resolveNonnaVideoUrl = (recipe: {
  nonna_video?: string | null;
  recipe_image?: string[] | null;
}): string | null => {
  const dedicated = normalizeVideoUrl(recipe.nonna_video);
  if (dedicated && isVideoUrl(dedicated)) return dedicated;

  for (const raw of recipe.recipe_image ?? []) {
    const candidate = normalizeVideoUrl(raw);
    if (candidate && isVideoUrl(candidate)) return candidate;
  }

  return null;
};
