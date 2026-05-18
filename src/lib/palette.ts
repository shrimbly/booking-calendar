// Curated muted earth-tone palette. All members are restricted to these 12
// hues for ribbon/avatar colours so the calendar reads as one coherent set.
export const PALETTE = [
  "#3a4e48", // deep teal
  "#5a6e4e", // deep moss
  "#4a6e5e", // forest
  "#6b7a5e", // sage-olive
  "#6b7a8b", // slate blue
  "#5d6e8b", // dusty navy
  "#8b6b7a", // mauve
  "#7a6b8b", // heather
  "#a8553c", // terracotta
  "#b8825c", // caramel
  "#8b6f47", // warm brown
  "#8e5e6b", // dusty rose
] as const;

export type PaletteColor = (typeof PALETTE)[number];

export function isPaletteColor(c: string): c is PaletteColor {
  return (PALETTE as readonly string[]).includes(c);
}
