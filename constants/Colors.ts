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
    text: '#EAE9E7',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};
