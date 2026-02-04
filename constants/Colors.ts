/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


const tintColorLight = '#DAAD29';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    primary: '#000D3A',
    secondary: '#FCA311',
    tird: '#E5E5E5',
    text: '#E5E5E5',
    textBlack: '#000000',
    background: '#E5E5E5',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    historyCard: {
      background: '#D9D9D9',
      activeBackground: '#FCA311'
    }
  },
  dark: {
    text: '#ECEDEE', // Light text for dark bg
    textBlack: '#000000', // Keeps black text for light badges in dark mode
    background: '#020617', // Very dark slate/blue
    primary: '#0B1647', // Slightly lighter navy for components
    secondary: '#FCA311', // Orange (Same as light)
    tird: '#A0A0A0', // Dimmed gray for secondary backgrounds/badges
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    historyCard: {
      background: '#2C2C2C',
      activeBackground: '#FCA311'
    }
  },
};
