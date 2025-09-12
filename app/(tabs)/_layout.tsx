import { Tabs, usePathname } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathName = usePathname();
  const hideTabBar = ['edit-profile', 'route-detail'].some(route => pathName.includes(route)); // Colocar rutas secundarias

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: hideTabBar ? { display : 'none' } : {
                position: 'absolute',
                bottom: 20,                // separación del borde inferior
                left: 20,
                right: 20,
                height: 70,                // alto del tab bar
                backgroundColor: '#001147',
                borderRadius: 35,          // hace que se vea ovalado
                borderTopWidth: 0,         // elimina borde feo default
                overflow: 'hidden',
                elevation: 5,              // sombra Android
                shadowColor: '#000',       // sombra iOS
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
                paddingBottom: 10,
                paddingTop: 10,
                marginHorizontal: 20
            },
        tabBarInactiveTintColor: '#D1D5DB',
      }}>
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <Entypo size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="available-routes"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome5 size={28} name="route" color={color}/>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="account" color={color}/>
        }}
      />
    </Tabs>
  );
}
