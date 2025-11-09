// Mapping of binyan keys to Hebrew names
export const BINYAN_HEBREW_NAMES: Record<string, string> = {
  'PAAL': 'פָּעַל',
  'PIEL': 'פִּעֵל',
  'HITPAEL': 'הִתְפַּעֵל',
  'PUAL': 'פֻּעַל',
  'NIFAL': 'נִפְעַל',
  'HIFIL': 'הִפְעִיל',
  'HUFAL': 'הֻפְעַל',
  'HITCIL': 'הִתְצַעֵי',
  'OTHER': 'אחר'
};

/**
 * Get Hebrew name for a binyan key
 * @param binyan - The binyan key (e.g., 'PAAL', 'PIEL')
 * @returns Hebrew name or the original value if not found
 */
export function getBinyanHebrewName(binyan: string | null | undefined): string | null {
  if (!binyan) return null;
  return BINYAN_HEBREW_NAMES[binyan.toUpperCase()] || binyan;
}
