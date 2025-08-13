
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, View } from 'react-native';

export default function TabTwoScreen() {
  const { width } = Dimensions.get('window');
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#6ec1ff' }}>
      
      {/* Contenedor tipo "vidrio" */}
      <BlurView intensity={70} tint="light" style={{
        width: 200,
        height: 200,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      }}>
        {/* Brillo tipo reflejo */}
        <LinearGradient
          colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </BlurView>

    </View>
  );
}
