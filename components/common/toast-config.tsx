import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CustomToast = ({
  text1,
  text2,
  iconName,
  bgColor,
}: {
  text1?: string;
  text2?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  bgColor: string;
}) => {
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.contentContainer}>
        {!!text1 && <Text style={styles.text1}>{text1}</Text>}
        {!!text2 && <Text style={styles.text2}>{text2}</Text>}
      </View>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <CustomToast
      text1={props.text1}
      text2={props.text2}
      iconName="checkmark-circle"
      bgColor="#10B981"
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <CustomToast
      text1={props.text1}
      text2={props.text2}
      iconName="alert-circle"
      bgColor="#EF4444"
    />
  ),
  info: (props: ToastConfigParams<any>) => (
    <CustomToast
      text1={props.text1}
      text2={props.text2}
      iconName="information-circle"
      bgColor="#2563EB"
    />
  ),
  warning: (props: ToastConfigParams<any>) => (
    <CustomToast
      text1={props.text1}
      text2={props.text2}
      iconName="warning"
      bgColor="#F59E0B"
    />
  ),
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.9,
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  text1: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  text2: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13,
    fontWeight: '500',
  },
});
