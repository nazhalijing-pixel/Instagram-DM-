/**
 * Utility functions for consistent avatar resolution across AutoReply.io
 */

export interface AvatarResolvable {
  avatar_url?: string | null;
  profile_pic_url?: string | null;
  from_avatar?: string | null;
  photoURL?: string | null;
}

/**
 * Normalizes and extracts a clean avatar URL from any object or string,
 * filtering out generic cartoon/dicebear placeholders so our high-end colorful typography
 * fallback takes precedence unless an authentic photograph is present.
 */
export function resolveAvatarUrl(
  source?: AvatarResolvable | string | null
): string | null {
  if (!source) return null;

  let rawUrl: string | null = null;
  if (typeof source === 'string') {
    rawUrl = source;
  } else if (typeof source === 'object') {
    rawUrl =
      source.profile_pic_url ||
      source.avatar_url ||
      source.from_avatar ||
      source.photoURL ||
      null;
  }

  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Filter out legacy generic cartoon dicebear placeholders
  if (trimmed.includes('api.dicebear.com')) {
    return null;
  }

  return trimmed;
}
