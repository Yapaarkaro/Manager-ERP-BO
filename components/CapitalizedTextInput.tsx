import React, { useState, useEffect, useRef, forwardRef } from 'react';
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
// Capitalizes first letter of words immediately when typed
// Preserves existing capital letters (e.g., "HDFC" stays "HDFC")
const capitalizeWords = (text: string, previousText: string = ''): string => {
  if (!text) return text;
  
  // If text is shorter than previous, user is deleting - don't modify
  if (previousText && text.length < previousText.length) {
    return text;
  }
  
  // Split text into words and process each one
  const words = text.split(' ');
  let modified = false;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word || word.length === 0) continue;
    
    // Check if word has multiple capital letters (like "HDFC", "USA")
    const hasMultipleCaps = word.length > 1 && /^[A-Z]{2,}$/.test(word);
    
    // If word has multiple capitals, preserve it as-is
    if (hasMultipleCaps) {
      continue;
    }
    
    // Check if first letter is already capital
    const firstChar = word.charAt(0);
    const isFirstCapital = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();
    
    // If first letter is already capital, preserve the word (no change needed)
    if (isFirstCapital) {
      continue;
    }
    
    // First letter is lowercase - capitalize it immediately
    // This only changes the first character, rest stays as user typed
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
    modified = true;
  }
  
  // Return modified text if changes were made, otherwise return original
  // This prevents unnecessary re-renders when text doesn't need capitalization
  return modified ? words.join(' ') : text;
};

const CapitalizedTextInput = forwardRef<TextInput, CapitalizedTextInputProps>(({
  value = '',
  onChangeText,
  autoCapitalize = 'words',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value);
  const isUserTypingRef = useRef<boolean>(false);
  const lastTextRef = useRef<string>(value);

  // Update internal value when external value changes (but not when user is typing)
  useEffect(() => {
    if (!isUserTypingRef.current && value !== internalValue && value !== lastTextRef.current) {
      setInternalValue(value);
      lastTextRef.current = value;
    }
  }, [value, internalValue]);

  const handleTextChange = (text: string) => {
    isUserTypingRef.current = true;
    lastTextRef.current = text;
    
    // On web, apply automatic capitalization if autoCapitalize is 'words'
    // BUT: Only capitalize when user is typing at the very end of the text
    // This prevents cursor jumping when editing in the middle
    if (Platform.OS === 'web' && autoCapitalize === 'words') {
      const isTypingAtEnd = text.length >= internalValue.length && text.toLowerCase().startsWith(internalValue.toLowerCase());
      
      if (isTypingAtEnd) {
        // User is typing at the end - safe to capitalize
        const processedText = capitalizeWords(text, internalValue);
        
        // Only update state if capitalization actually changed something
        // This prevents unnecessary re-renders that cause cursor jumping
        if (processedText !== text) {
          setInternalValue(processedText);
          onChangeText?.(processedText);
        } else {
          // No capitalization needed - only update if value actually changed
          if (text !== internalValue) {
            setInternalValue(text);
          }
          onChangeText?.(text);
        }
      } else {
        // User is editing in the middle or deleting - don't modify to preserve cursor position
        // Only update state if value actually changed to prevent unnecessary re-renders
        if (text !== internalValue) {
          setInternalValue(text);
        }
        onChangeText?.(text);
      }
    } else {
      // Not web or not words capitalization - pass through as-is
      // Only update state if value actually changed
      if (text !== internalValue) {
        setInternalValue(text);
      }
      onChangeText?.(text);
    }
    
    // Reset typing flag after a short delay
    setTimeout(() => {
      isUserTypingRef.current = false;
    }, 50);
  };

  const handleBlur = (e: any) => {
    if (autoCapitalize === 'words' && internalValue.trim()) {
      const titleCase = internalValue
        .split(/\s+/)
        .map((word) => {
          if (!word) return word;
          if (word.length > 1 && /^[A-Z0-9.&]+$/.test(word)) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
      if (titleCase !== internalValue) {
        setInternalValue(titleCase);
        lastTextRef.current = titleCase;
        onChangeText?.(titleCase);
      }
    }
    props.onBlur?.(e);
  };

  return (
    <TextInput
      ref={ref}
      {...props}
      style={[inputStyles.baseInput, props.style]}
      value={internalValue}
      onChangeText={handleTextChange}
      onBlur={handleBlur}
      autoCapitalize={Platform.OS === 'web' ? 'sentences' : autoCapitalize}
    />
  );
});

CapitalizedTextInput.displayName = 'CapitalizedTextInput';

export default CapitalizedTextInput;
