import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  return (
    <LinearGradient
      start={{ x: 0.8, y: 0.2 }}
      end={{ x: 0.5, y: 1.0 }}
      locations={[0.3, 1]}
      colors={["rgba(53, 35, 26, 1)", "rgba(105, 90, 82, 0.89) " ]}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Liquid Glass */}
      <BlurView intensity={50} tint="light" style={{
        position: 'absolute',
        height: 525,
        width: 160,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.93)',
        shadowColor: 'rgba(0, 0, 0, 1)',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        borderTopLeftRadius: 30,
        borderBottomEndRadius: 30,
        borderTopRightRadius: 200,
        borderBottomLeftRadius: 200,
        borderBottomRightRadius: 30,
        transform: [{ scaleX: 2.0 }],
        overflow: 'hidden',
      }}>
        <LinearGradient
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0.5, y: 1.0 }}
          locations={[0.1, 0.9]}
          colors={["rgba(255, 255, 255, 0.05)", "rgba(255,255,255,0.1)"]}
          style={{ flex: 1 }}
        />

      </BlurView>

      <View style={{ position: 'relative', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 50, fontWeight: 'bold', marginBottom: 10}}>
          RideMate
        </Text>
        <TextInput placeholder='Correo electrónico' placeholderTextColor={'white'} style={{ shadowColor: '#8f8f8fff', height: 50}}/>
        <TouchableOpacity style={{ backgroundColor: '#95514F', borderRadius: 10, padding: 10}}>
          <Text style={{ color: 'white' }}>
            Iniciar sesion
          </Text>
        </TouchableOpacity>
        {/* <Button title="Presioname" onPress={() => alert('¡Click!')} /> */}
      </View>

      <StatusBar translucent backgroundColor="transparent" />
    </LinearGradient>
  );
}


