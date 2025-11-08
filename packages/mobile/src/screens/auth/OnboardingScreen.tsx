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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  useAuthStore,
  updateUserProfile,
  addUserAddress,
  getUserById,
} from '@ecommerce/shared';

export const OnboardingScreen = ({ navigation }: any) => {
  const { user, setUser } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Address fields
  const [addressLabel, setAddressLabel] = useState('');
  const [apartment, setApartment] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Profile, 2: Address

  const validateProfile = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateAddress = () => {
    if (!addressLabel.trim()) {
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

  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      // Fetch updated user data from Firestore
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        console.log('✅ User data refreshed:', updatedUser);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

const handleSkipAddress = async () => {
  if (!user) return;

  Alert.alert(
    'Skip Address',
    'You can add your delivery address later from your profile.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: async () => {
          setSaving(true);
          try {
            // Fetch the updated user data from Firestore
            const updatedUser = await getUserById(user.id);
            
            if (updatedUser) {
              // Update the user state - this will trigger AppNavigator to re-render
              // and navigate to MainApp automatically
              setUser(updatedUser);
              
              console.log('✅ User state updated after skip:', {
                name: updatedUser.name,
                addressCount: updatedUser.addresses.length,
              });
            }
          } catch (error) {
            console.error('Error fetching user:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]
  );
};

const handleNext = async () => {
  if (!user) return;

  if (step === 1) {
    if (!validateProfile()) return;
    
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
        name: name.trim(),
        email: email.trim() || undefined,
      });

      // Fetch updated user data
      const updatedUser = await getUserById(user.id);
      
      if (updatedUser) {
        // Update local state
        setUser(updatedUser);
      }

      // Move to address step
      setStep(2);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  } else {
    if (!validateAddress()) return;
    
    setSaving(true);
    try {
      const addressData = {
        label: addressLabel.trim(),
        apartment: apartment.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        isDefault: true,
      };

      await addUserAddress(user.id, addressData);

      // Fetch the complete updated user
      const updatedUser = await getUserById(user.id);
      
      if (updatedUser) {
        // Update user state - this triggers navigation to MainApp
        setUser(updatedUser);
        
        console.log('✅ User state updated after address:', {
          name: updatedUser.name,
          addressCount: updatedUser.addresses.length,
        });

        // Show success message
        Alert.alert(
          'Welcome! 🎉',
          'Your profile is all set up. Start shopping now!'
        );
      }
    } catch (error) {
      console.error('Error adding address:', error);
      Alert.alert('Error', 'Failed to add address');
    } finally {
      setSaving(false);
    }
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: step === 1 ? '50%' : '100%' },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {step} of 2
          </Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>{step === 1 ? '👤' : '📍'}</Text>
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Tell us about yourself' : 'Add your address'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 1
              ? "Let's personalize your experience"
              : 'Where should we deliver your orders?'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 1 ? (
            <>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>
                  We'll send order updates to this email
                </Text>
              </View>

              {/* Phone (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.readOnlyInput}>
                  <Text style={styles.readOnlyText}>{user?.phoneNumber}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* Address Label */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Label *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Home, Office"
                  value={addressLabel}
                  onChangeText={setAddressLabel}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              {/* Apartment/House */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Flat / House No.</Text>
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

              {/* City & State */}
              <View style={styles.rowGroup}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Mumbai"
                    value={city}
                    onChangeText={setCity}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>State *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Maharashtra"
                    value={state}
                    onChangeText={setState}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Pincode */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit pincode"
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
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step === 2 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipAddress}
            disabled={saving}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, saving && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 1 ? 'Next' : 'Complete'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
  },
  verifiedBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  bottomSpacer: {
    height: 120,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  nextButton: {
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
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});