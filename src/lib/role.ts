/**
 * Single source of truth for role identity helpers.
 *
 * IMPORTANT: The `slugifyRole` algorithm here is mirrored in
 * `supabase/functions/generate-pathway/index.ts` because edge functions can't
 * import from `src/`. If you change the algorithm here, update the edge
 * function to match — client- and server-generated slugs MUST agree.
 */

export const slugifyRole = (role: string | null | undefined): string => {
  if (!role) return "";
  return role
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const deslugifyRole = (slug: string | null | undefined): string => {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const normalizeRoleName = (role: string | null | undefined): string => {
  if (!role) return "";
  const trimmed = role.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
