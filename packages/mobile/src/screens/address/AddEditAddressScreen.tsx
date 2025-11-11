import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  useAuthStore,
  addUserAddress,
  updateUserAddress,
  UserAddress,
} from '@ecommerce/shared';

export const AddEditAddressScreen = ({ route, navigation }: any) => {
  const { address } = route.params || {};
  const isEdit = !!address;
  
  const { user, setUser } = useAuthStore();
  
  const [label, setLabel] = useState(address?.label || '');
  const [apartment, setApartment] = useState(address?.apartment || '');
  const [street, setStreet] = useState(address?.street || '');
  const [city, setCity] = useState(address?.city || '');
  const [state, setState] = useState(address?.state || '');
  const [pincode, setPincode] = useState(address?.pincode || '');
  const [landmark, setLandmark] = useState(address?.landmark || '');
  const [isDefault, setIsDefault] = useState(address?.isDefault || false);
  const [saving, setSaving] = useState(false);

  const validateInputs = () => {
    if (!label.trim()) {
      Alert.alert('Error', 'Please enter address label (e.g., Home, Office)');
      return false;
    }
    if (!street.trim()) {
      Alert.alert('Error', 'Please enter street address');
      return false;
    }
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter city');
      return false;
    }
    if (!state.trim()) {
      Alert.alert('Error', 'Please enter state');
      return false;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      Alert.alert('Error', 'Please enter valid 6-digit pincode');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to save address');
      return;
    }

    if (!validateInputs()) return;

    setSaving(true);
    try {
      const addressData = {
        label: label.trim(),
        apartment: apartment.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        isDefault,
      };

      if (isEdit) {
        await updateUserAddress(user.id, address.id, addressData);
        Alert.alert('Success', 'Address updated successfully');
      } else {
        await addUserAddress(user.id, addressData);
        Alert.alert('Success', 'Address added successfully');
      }

      // Refresh user data (in a real app, you'd fetch from Firestore)
      // For now, navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Address' : 'Add Address'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* Label */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Label *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Home, Office"
              value={label}
              onChangeText={setLabel}
              autoCapitalize="words"
            />
          </View>

          {/* Apartment/House */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Flat / House No. / Building</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Flat 301, Tower A"
              value={apartment}
              onChangeText={setApartment}
            />
          </View>

          {/* Street */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MG Road, Sector 12"
              value={street}
              onChangeText={setStreet}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Hyderabad"
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
          </View>

          {/* State */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Telangana"
              value={state}
              onChangeText={setState}
              autoCapitalize="words"
            />
          </View>

          {/* Pincode */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pincode *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 500050"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          {/* Landmark */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Near City Mall"
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>

          {/* Default Toggle */}
          <View style={styles.switchContainer}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchLabelText}>Set as default address</Text>
              <Text style={styles.switchSubtext}>
                This will be your primary delivery address
              </Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEdit ? 'Update Address' : 'Save Address'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 12,
    color: '#999',
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});