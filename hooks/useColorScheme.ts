import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  return useNativeColorScheme();
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