import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readAppearance, readPalette, writeAppearance, writePalette } from '../lib/appearance';
import { StyleSheet, useColorScheme as useSystemColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { getThemeColors, type PalettePreference, type ThemeColors } from '../constants/theme';

export type AppearancePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  appearance: AppearancePreference;
  setAppearance: (preference: AppearancePreference) => Promise<void>;
  palette: PalettePreference;
  setPalette: (palette: PalettePreference) => Promise<void>;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseAppearance(value: string | undefined): AppearancePreference | null {
  if (value === 'system' || value === 'light' || value === 'dark') return value;
  return null;
}

function parsePalette(value: string | undefined): PalettePreference | null {
  if (value === 'lime' || value === 'ocean' || value === 'rose' || value === 'violet') return value;
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>('system');
  const [palette, setPaletteState] = useState<PalettePreference>('lime');

  useEffect(() => {
    let active = true;
    Promise.all([readAppearance(), readPalette()])
      .then(([appearanceValue, paletteValue]) => {
        if (!active) return;
        const parsedAppearance = parseAppearance(appearanceValue ?? undefined);
        const parsedPalette = parsePalette(paletteValue ?? undefined);
        if (parsedAppearance) setAppearanceState(parsedAppearance);
        if (parsedPalette) setPaletteState(parsedPalette);
      })
      .catch((error) => {
        console.warn('Unable to load appearance preference:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  const setAppearance = useCallback(async (preference: AppearancePreference) => {
    setAppearanceState(preference);
    await writeAppearance(preference);
  }, []);

  const setPalette = useCallback(async (nextPalette: PalettePreference) => {
    setPaletteState(nextPalette);
    await writePalette(nextPalette);
  }, []);

  const colorScheme: 'light' | 'dark' =
    appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearance,
      setAppearance,
      palette,
      setPalette,
      colorScheme,
      isDark: colorScheme === 'dark',
      colors: getThemeColors(colorScheme, palette),
    }),
    [appearance, colorScheme, palette, setAppearance, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}

export const appearanceLabels: Record<AppearancePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

export const appearanceOptions: AppearancePreference[] = ['system', 'light', 'dark'];

export const paletteLabels: Record<PalettePreference, string> = {
  lime: 'Lime',
  ocean: 'Ocean',
  rose: 'Rose',
  violet: 'Violet',
};

export const paletteOptions: PalettePreference[] = ['lime', 'ocean', 'rose', 'violet'];
