/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';

import { useTheme } from './ThemeProvider';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: 'text' | 'background' | 'tint' | 'tabIconDefault' | 'tabIconSelected',
) {
  const { colorScheme, colors } = useTheme();
  const theme = colorScheme;
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  const themedColors = {
    text: colors.ink,
    background: colors.canvas,
    tint: colors.green,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.green,
  };
  return themedColors[colorName];
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
