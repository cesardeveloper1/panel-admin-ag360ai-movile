/** Paleta estable para avatares de iniciales (hash del seed). */
const AVATAR_COLORS = [
  '#5B8DEF',
  '#E05A6D',
  '#2A9D8F',
  '#C47A2C',
  '#6C63FF',
  '#457B9D',
  '#E76F51',
  '#3D8B6E',
  '#9B5DE5',
  '#F4A261',
  '#264653',
  '#D62828',
] as const;

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
