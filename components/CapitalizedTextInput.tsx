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
    // Simply pass through - let the keyboard handle capitalization
    setInternalValue(text);
    onChangeText?.(text);
  };

  // Use native autoCapitalize on both platforms - let the keyboard handle it
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
});

CapitalizedTextInput.displayName = 'CapitalizedTextInput';

export default CapitalizedTextInput;
