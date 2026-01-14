import { colors } from './colors';
import { typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  colors: typeof colors.light | typeof colors.dark;
  typography: typeof typography;
}

export const getTheme = (mode: ThemeMode): ThemeConfig => ({
  mode,
  colors: colors[mode],
  typography,
});

export const defaultTheme: ThemeConfig = getTheme('light');

