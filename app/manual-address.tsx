import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft,
  Check,
} from 'lucide-react-native';

const Colors = {
  background: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  primary: '#3f66ac',
  secondary: '#ffc754',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  grey: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
  }
};

export default function ManualAddressScreen() {
  const { type } = useLocalSearchParams<{ type: 'branch' | 'warehouse' }>();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });

  useEffect(() => {
    if (!type) {
      Alert.alert('Error', 'Address type not specified');
      router.back();
    }
  }, [type]);

  const handleBackPress = () => {
    router.back();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAddress = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }
    
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter the street address');
      return;
    }
    
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter the city');
      return;
    }
    
    if (!formData.pincode.trim()) {
      Alert.alert('Error', 'Please enter the pincode');
      return;
    }

    // TODO: Save address to backend
    console.log('Saving manual address:', { 
      type, 
      ...formData 
    });
    
    Alert.alert(
      'Success', 
      `${type === 'branch' ? 'Branch' : 'Warehouse'} address added successfully!`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const getTypeColor = () => {
    return type === 'branch' ? Colors.primary : Colors.secondary;
  };

  const getTypeLabel = () => {
    return type === 'branch' ? 'Branch' : 'Warehouse';
  };

  const isFormValid = () => {
    return formData.name.trim() && 
           formData.address.trim() && 
           formData.city.trim() && 
           formData.pincode.trim();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Manual Address Entry</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Enter {getTypeLabel()} Details</Text>
          
          <Text style={styles.fieldLabel}>Location Name *</Text>
          <TextInput
            style={styles.input}
            placeholder={`${getTypeLabel()} Name`}
            placeholderTextColor={Colors.textLight}
            value={formData.name}
            onChangeText={(text) => handleInputChange('name', text)}
          />

          <Text style={styles.fieldLabel}>Street Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            placeholderTextColor={Colors.textLight}
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.fieldLabel}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="City"
            placeholderTextColor={Colors.textLight}
            value={formData.city}
            onChangeText={(text) => handleInputChange('city', text)}
          />

          <Text style={styles.fieldLabel}>State</Text>
          <TextInput
            style={styles.input}
            placeholder="State"
            placeholderTextColor={Colors.textLight}
            value={formData.state}
            onChangeText={(text) => handleInputChange('state', text)}
          />

          <Text style={styles.fieldLabel}>Pincode *</Text>
          <TextInput
            style={styles.input}
            placeholder="Pincode"
            placeholderTextColor={Colors.textLight}
            value={formData.pincode}
            onChangeText={(text) => handleInputChange('pincode', text)}
            keyboardType="numeric"
            maxLength={6}
          />

          <Text style={styles.fieldLabel}>Landmark (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nearby landmark or reference point"
            placeholderTextColor={Colors.textLight}
            value={formData.landmark}
            onChangeText={(text) => handleInputChange('landmark', text)}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: isFormValid() ? getTypeColor() : Colors.grey[300],
            }
          ]}
          onPress={handleSaveAddress}
          disabled={!isFormValid()}
          activeOpacity={0.7}
        >
          <Check size={20} color={Colors.background} />
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  formSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 50,
    borderColor: Colors.grey[300],
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[100],
  },
  saveButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

