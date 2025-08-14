import { useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ColorScheme = 'light' | 'dark' | 'system';

export function useColorScheme() {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>('system');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadColorScheme();
  }, []);

  useEffect(() => {
    if (colorScheme === 'system') {
      setCurrentTheme(systemColorScheme || 'light');
    } else {
      setCurrentTheme(colorScheme);
    }
  }, [colorScheme, systemColorScheme]);

  const loadColorScheme = async () => {
    try {
      const savedScheme = await AsyncStorage.getItem('colorScheme');
      if (savedScheme) {
        setColorScheme(savedScheme as ColorScheme);
      }
    } catch (error) {
      console.log('Error loading color scheme:', error);
    }
  };

  const toggleColorScheme = async () => {
    const newScheme: ColorScheme = currentTheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);
    
    try {
      await AsyncStorage.setItem('colorScheme', newScheme);
    } catch (error) {
      console.log('Error saving color scheme:', error);
    }
  };

  const setColorSchemeManually = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    
    try {
      await AsyncStorage.setItem('colorScheme', scheme);
    } catch (error) {
      console.log('Error saving color scheme:', error);
    }
  };

  return {
    colorScheme: currentTheme,
    systemColorScheme,
    selectedColorScheme: colorScheme,
    toggleColorScheme,
    setColorScheme: setColorSchemeManually,
  };
}

export function useThemeColors() {
  const colorScheme = useColorScheme();
  
  return {
    primary: '#3F66AC',
    secondary: '#F5C754',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#6B7280',
    lightGray: '#F3F4F6',
    error: '#EF4444',
    success: '#10B981',
    background: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
  };
}