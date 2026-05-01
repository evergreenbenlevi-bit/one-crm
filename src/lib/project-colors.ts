// Deterministic color assignment for projects — ADHD-friendly, high-contrast palette
// 12 distinct colors that work in both light and dark mode

export const PROJECT_COLOR_PALETTE = [
  { bar: '#FF6B6B', bg: 'rgba(255,107,107,0.12)', text: '#CC3333' },  // coral-red
  { bar: '#4ECDC4', bg: 'rgba(78,205,196,0.12)',  text: '#1A8A82' },  // teal
  { bar: '#45B7D1', bg: 'rgba(69,183,209,0.12)',  text: '#1A7A9A' },  // sky-blue
  { bar: '#96CEB4', bg: 'rgba(150,206,180,0.12)', text: '#2D7A56' },  // sage
  { bar: '#F7DC6F', bg: 'rgba(247,220,111,0.12)', text: '#9A7D00' },  // amber
  { bar: '#DDA0DD', bg: 'rgba(221,160,221,0.12)', text: '#8B008B' },  // plum
  { bar: '#F1948A', bg: 'rgba(241,148,138,0.12)', text: '#B03A2E' },  // salmon
  { bar: '#82E0AA', bg: 'rgba(130,224,170,0.12)', text: '#1E8449' },  // mint-green
  { bar: '#85C1E9', bg: 'rgba(133,193,233,0.12)', text: '#1A5F8C' },  // light-blue
  { bar: '#BB8FCE', bg: 'rgba(187,143,206,0.12)', text: '#7D3C98' },  // lavender
  { bar: '#F0B27A', bg: 'rgba(240,178,122,0.12)', text: '#A04000' },  // orange
  { bar: '#73C6B6', bg: 'rgba(115,198,182,0.12)', text: '#117A65' },  // aqua
]

const NO_PROJECT_COLOR = {
  bar: '#9CA3AF',
  bg: 'rgba(156,163,175,0.10)',
  text: '#6B7280',
}

function hashString(s: string): number {
  return s.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0x7fffffff, 0)
}

export function getProjectColor(projectId: string | null | undefined) {
  if (!projectId) return NO_PROJECT_COLOR
  const idx = hashString(projectId) % PROJECT_COLOR_PALETTE.length
  return PROJECT_COLOR_PALETTE[idx]
}

// Shorthand for just the bar color (4px left strip)
export function projectBarColor(projectId: string | null | undefined): string {
  return getProjectColor(projectId).bar
}
