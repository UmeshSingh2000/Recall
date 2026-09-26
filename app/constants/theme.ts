export type ThemeColors = {
  ink: string;
  muted: string;
  canvas: string;
  surface: string;
  line: string;
  green: string;
  greenSoft: string;
  orange: string;
  orangeSoft: string;
  red: string;
  redSoft: string;
  blue: string;
  blueSoft: string;
  violet: string;
  violetSoft: string;
  charcoal: string;
  overlay: string;
  hero: string;
  heroText: string;
  heroSubtext: string;
  heroBorder: string;
  heroKicker: string;
};

export const lightColors: ThemeColors = {
  ink: '#17212B',
  muted: '#71808E',
  canvas: '#F7F8F6',
  surface: '#FFFFFF',
  line: '#E4E9E6',
  green: '#158A67',
  greenSoft: '#DDF4EA',
  orange: '#D97728',
  orangeSoft: '#FFF0DE',
  red: '#C65353',
  redSoft: '#FBE4E3',
  blue: '#4775A8',
  blueSoft: '#E5EFF9',
  violet: '#7669A8',
  violetSoft: '#EEEAFE',
  charcoal: '#26343D',
  overlay: 'rgba(23, 33, 43, 0.48)',
  hero: '#26343D',
  heroText: '#FFFFFF',
  heroSubtext: '#AAB9BE',
  heroBorder: '#405059',
  heroKicker: '#88D9B8',
};

export const darkColors: ThemeColors = {
  ink: '#E8EDF1',
  muted: '#8A9AA8',
  canvas: '#0E1216',
  surface: '#171D24',
  line: '#2A343E',
  green: '#3CB88E',
  greenSoft: '#1A3329',
  orange: '#F0A04E',
  orangeSoft: '#3D2C1A',
  red: '#E07070',
  redSoft: '#3D2222',
  blue: '#6B9AD4',
  blueSoft: '#1E2A3D',
  violet: '#A898E0',
  violetSoft: '#2A2640',
  charcoal: '#C5CED6',
  overlay: 'rgba(0, 0, 0, 0.62)',
  hero: '#1C252E',
  heroText: '#E8EDF1',
  heroSubtext: '#8A9AA8',
  heroBorder: '#2F3A45',
  heroKicker: '#3CB88E',
};

/** @deprecated Use `useTheme().colors` for theme-aware UI. */
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const tabBarInset = 108;
