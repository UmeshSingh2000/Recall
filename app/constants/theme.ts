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

export type PalettePreference = 'lime' | 'ocean' | 'rose' | 'violet';

export const workloadColors = {
  active: '#2D9CDB',
  paused: '#F2A33A',
  done: '#31B894',
} as const;

export const lightColors: ThemeColors = {
  ink: '#0B100D',
  muted: '#65716A',
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  line: '#D8E0DA',
  green: '#C2D83F',
  greenSoft: '#E8F0C8',
  orange: '#F2A33A',
  orangeSoft: '#FFF0DE',
  red: '#E56B6B',
  redSoft: '#FCEAEA',
  blue: '#65A7D9',
  blueSoft: '#E8F2FA',
  violet: '#65A7D9',
  violetSoft: '#EEF0EC',
  charcoal: '#465149',
  overlay: 'rgba(11, 16, 13, 0.48)',
  hero: '#0B100D',
  heroText: '#E8ECE8',
  heroSubtext: '#8A968F',
  heroBorder: '#182019',
  heroKicker: '#31B894',
};

export const darkColors: ThemeColors = {
  ink: '#E8ECE8',
  muted: '#8A968F',
  canvas: '#050805',
  surface: '#0B100D',
  line: '#1D2922',
  green: '#C2D83F',
  greenSoft: '#18200D',
  orange: '#F2A33A',
  orangeSoft: '#241C0F',
  red: '#E56B6B',
  redSoft: '#241414',
  blue: '#65A7D9',
  blueSoft: '#101611',
  violet: '#65A7D9',
  violetSoft: '#141B16',
  charcoal: '#65716A',
  overlay: 'rgba(5, 8, 5, 0.72)',
  hero: '#141B16',
  heroText: '#E8ECE8',
  heroSubtext: '#8A968F',
  heroBorder: '#182019',
  heroKicker: '#31B894',
};

const paletteColors: Record<PalettePreference, { light: Partial<ThemeColors>; dark: Partial<ThemeColors> }> = {
  lime: {
    light: {},
    dark: {},
  },
  ocean: {
    light: {
      green: '#2D9CDB',
      greenSoft: '#DFF2FC',
      heroKicker: '#2D9CDB',
    },
    dark: {
      green: '#56B4E9',
      greenSoft: '#102532',
      heroKicker: '#56B4E9',
    },
  },
  rose: {
    light: {
      green: '#D95D8A',
      greenSoft: '#FBE5EF',
      heroKicker: '#D95D8A',
    },
    dark: {
      green: '#E987AB',
      greenSoft: '#2B1721',
      heroKicker: '#E987AB',
    },
  },
  violet: {
    light: {
      green: '#8B6DD6',
      greenSoft: '#EEE8FC',
      heroKicker: '#8B6DD6',
    },
    dark: {
      green: '#A994E6',
      greenSoft: '#211A35',
      heroKicker: '#A994E6',
    },
  },
};

export function getThemeColors(colorScheme: 'light' | 'dark', palette: PalettePreference): ThemeColors {
  const base = colorScheme === 'dark' ? darkColors : lightColors;
  return { ...base, ...paletteColors[palette][colorScheme] };
}

/** @deprecated Use `useTheme().colors` for theme-aware UI. */
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const tabBarInset = 108;
