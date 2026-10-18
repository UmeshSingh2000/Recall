import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readAppearance, writeAppearance } from '../lib/appearance';
import { StyleSheet, useColorScheme as useSystemColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '../constants/theme';

export type AppearancePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  appearance: AppearancePreference;
  setAppearance: (preference: AppearancePreference) => Promise<void>;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function parseAppearance(value: string | undefined): AppearancePreference | null {
  if (value === 'system' || value === 'light' || value === 'dark') return value;
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>('system');

  useEffect(() => {
    let active = true;
    readAppearance()
      .then((value) => {
        if (!active) return;
        const parsed = parseAppearance(value ?? undefined);
        if (parsed) setAppearanceState(parsed);
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

  const colorScheme: 'light' | 'dark' =
    appearance === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : appearance;

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearance,
      setAppearance,
      colorScheme,
      isDark: colorScheme === 'dark',
      colors: colorScheme === 'dark' ? darkColors : lightColors,
    }),
    [appearance, colorScheme, setAppearance],
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
