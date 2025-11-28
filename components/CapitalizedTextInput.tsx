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
        outlineStyle: 'none',
      },
    }),
  },
});

const CapitalizedTextInput = forwardRef<TextInput, CapitalizedTextInputProps>(({
  value = '',
  onChangeText,
  autoCapitalize = 'words',
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState(value);
  const [userTypedValue, setUserTypedValue] = useState(value);

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
    setUserTypedValue(value);
  }, [value]);

  // Function to capitalize words consistently across platforms
  const capitalizeWords = (text: string): string => {
    if (!text) return text;
    
    // Compare with user's actual input to detect continuous capitals
    const userWords = userTypedValue.split(' ');
    const currentWords = text.split(' ');
    
    return text
      .split(' ')
      .map((word, index) => {
        if (!word) return word;
        
        const userWord = userWords[index] || '';
        
        // If the user typed uppercase letters and the current word matches their input,
        // preserve the user's capitalization
        if (userWord === word && userWord !== userWord.toLowerCase()) {
          return word;
        }
        
        // If the word is all uppercase (like AA, USA, IBM), keep it as is
        if (word === word.toUpperCase() && word.length > 1) {
          return word;
        }
        
        // If the word is all lowercase, capitalize the first letter
        if (word === word.toLowerCase()) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        // For mixed case words, preserve the existing case
        // This allows users to type things like "iPhone", "eBay", etc.
        return word;
      })
      .join(' ');
  };

  // Function to capitalize sentences
  const capitalizeSentences = (text: string): string => {
    if (!text) return text;
    
    return text
      .split('. ')
      .map(sentence => {
        if (!sentence) return sentence;
        return sentence.charAt(0).toUpperCase() + sentence.slice(1);
      })
      .join('. ');
  };

  // Function to capitalize characters
  const capitalizeCharacters = (text: string): string => {
    return text.toUpperCase();
  };

  const handleTextChange = (text: string) => {
    // Store the user's raw input
    setUserTypedValue(text);
    
    let processedText = text;
    
    // Apply capitalization based on autoCapitalize prop
    if (autoCapitalize === 'words') {
      processedText = capitalizeWords(text);
    } else if (autoCapitalize === 'sentences') {
      processedText = capitalizeSentences(text);
    } else if (autoCapitalize === 'characters') {
      processedText = capitalizeCharacters(text);
    }
    
    setInternalValue(processedText);
    onChangeText?.(processedText);
  };

  // For iOS, we can rely on native autoCapitalize behavior
  // For Android, we use our custom capitalization logic
  if (Platform.OS === 'ios') {
    return (
      <TextInput
        ref={ref}
        {...props}
        style={[inputStyles.baseInput, props.style]}
        value={internalValue}
        onChangeText={handleTextChange}
        autoCapitalize={autoCapitalize}
      />
    );
  }

  // For Android, disable native autoCapitalize and use our custom logic
  return (
    <TextInput
      ref={ref}
      {...props}
      style={[inputStyles.baseInput, props.style]}
      value={internalValue}
      onChangeText={handleTextChange}
      autoCapitalize="none"
    />
  );
});

CapitalizedTextInput.displayName = 'CapitalizedTextInput';

export default CapitalizedTextInput;
