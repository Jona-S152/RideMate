import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from './ThemedView';

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
  withTabBarPadding?: boolean;
  className?: string;
  style?: ViewStyle;
}

export function Screen({
  children,
  edges = ['top'],
  withTabBarPadding = true,
  className = 'flex-1 pt-4 px-3',
  style,
}: ScreenProps) {
  const tabOverflow = useBottomTabOverflow();

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>
      <ThemedView
        lightColor={DefaultTheme.colors.background}
        darkColor={DarkTheme.colors.background}
        className={className}
        style={{ flex: 1, paddingBottom: withTabBarPadding ? tabOverflow : 0 }}
      >
        {children}
      </ThemedView>
    </SafeAreaView>
  );
}
