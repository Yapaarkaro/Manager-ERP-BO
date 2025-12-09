import React, { useState, useEffect, forwardRef } from 'react';
import { TextInput, TextInputProps, Platform, StyleSheet } from 'react-native';

interface CapitalizedTextInputProps extends TextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

// Consistent input styles for web focus
const inputStyles = StyleSheet.create({
  baseInput: {
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none' as any,
      },
    }),
  },
});

// Helper function to capitalize words intelligently (for web only)
// Preserves existing capital letters (e.g., "HDFC" stays "HDFC")
// Capitalizes first letter if all lowercase (e.g., "vikram" → "Vikram")
const capitalizeWords = (text: string, previousText: string = ''): string => {
  if (!text) return text;
  
  // If text is shorter than previous, user is deleting - don't modify
  if (previousText && text.length < previousText.length) {
    return text;
  }
  
  // Split by spaces and process each word
  return text
    .split(' ')
    .map((word, wordIndex) => {
      if (!word) return word;
      
      // Check if word has multiple capital letters (like "HDFC", "USA")
      const hasMultipleCaps = word.length > 1 && /^[A-Z]{2,}$/.test(word);
      
      // If word has multiple capitals, preserve it as-is
      if (hasMultipleCaps) {
        return word;
      }
      
      // Check if first letter is already capital
      const firstChar = word.charAt(0);
      const isFirstCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
      
      // If first letter is already capital, preserve the word
      if (isFirstCapital) {
        return word;
      }
      
      // Otherwise, capitalize first letter and lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const CapitalizedTextInput = forwardRef<TextInput, CapitalizedTextInputProps>(({
  value = '',
  onChangeText,
  autoCapitalize = 'words',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value);

  // Update internal value when external value changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  const handleTextChange = (text: string) => {
    let processedText = text;
    
    // On web, apply automatic capitalization if autoCapitalize is 'words'
    if (Platform.OS === 'web' && autoCapitalize === 'words') {
      processedText = capitalizeWords(text, internalValue);
    }
    
    setInternalValue(processedText);
    onChangeText?.(processedText);
  };

  // On web, use our capitalization logic; on mobile, let the keyboard handle it
  return (
    <TextInput
      ref={ref}
      {...props}
      style={[inputStyles.baseInput, props.style]}
      value={internalValue}
      onChangeText={handleTextChange}
      autoCapitalize={Platform.OS === 'web' ? 'none' : autoCapitalize} // Disable native capitalization on web since we handle it
    />
  );
});

CapitalizedTextInput.displayName = 'CapitalizedTextInput';

export default CapitalizedTextInput;
