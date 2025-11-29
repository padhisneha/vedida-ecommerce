// OnboardingScreen.tsx
import React, { useState, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import {
  useAuthStore,
  updateUserProfile,
  addUserAddress,
  getUserById,
  getActiveDeliveryAreas,
  DeliveryArea,
  DELIVERY_SLOT_ICONS,
} from '@ecommerce/shared';
import { showToast } from '../../utils/toast';

export const OnboardingScreen = ({ navigation }: any) => {
  const { user, setUser } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Address fields
  const [addressLabel, setAddressLabel] = useState('');
  const [apartment, setApartment] = useState('');
  const [street, setStreet] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  
  // Delivery areas
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Profile, 2: Address

  // Load delivery areas when moving to step 2
  useEffect(() => {
    if (step === 2) {
      loadDeliveryAreas();
    }
  }, [step]);

  const loadDeliveryAreas = async () => {
    setLoadingAreas(true);
    try {
      const areas = await getActiveDeliveryAreas();
      setDeliveryAreas(areas);
      console.log('✅ Loaded active delivery areas:', areas.length);
    } catch (error) {
      console.error('Error loading delivery areas:', error);
      showToast.error('Failed to load delivery areas');
    } finally {
      setLoadingAreas(false);
    }
  };

  const getSelectedArea = (): DeliveryArea | null => {
    return deliveryAreas.find(area => area.name === selectedLocation) || null;
  };

  const handleSelectArea = (area: DeliveryArea) => {
    setSelectedLocation(area.name);
    // Auto-fill city, state, pincode from selected area
    setCity(area.name.split(',').pop()?.trim() || '');
    setState('Telangana');
    setPincode(area.pincode);
    setShowAreaModal(false);
  };

  const validateProfile = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
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
    if (!selectedLocation) {
      Alert.alert('Error', 'Please select a delivery area');
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
              const updatedUser = await getUserById(user.id);
              
              if (updatedUser) {
                setUser(updatedUser);
                console.log('✅ User state updated after skip');
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
          email: email.trim(),
        });

        const updatedUser = await getUserById(user.id);
        if (updatedUser) {
          setUser(updatedUser);
        }

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
          location: selectedLocation,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          landmark: landmark.trim(),
          isDefault: true,
        };

        await addUserAddress(user.id, addressData);

        const updatedUser = await getUserById(user.id);
        
        if (updatedUser) {
          setUser(updatedUser);
          
          console.log('✅ User state updated after address:', {
            name: updatedUser.name,
            addressCount: updatedUser.addresses.length,
          });

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

  const selectedArea = getSelectedArea();

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
          <Text style={styles.progressText}>Step {step} of 2</Text>
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
                <Text style={styles.label}>Email</Text>
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

              {/* Delivery Area Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Delivery Area *</Text>
                {loadingAreas ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.loadingText}>Loading areas...</Text>
                  </View>
                ) : deliveryAreas.length > 0 ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.areaSelector,
                        selectedLocation && styles.areaSelectorSelected,
                      ]}
                      onPress={() => setShowAreaModal(true)}
                    >
                      {selectedLocation ? (
                        <View style={styles.selectedAreaContent}>
                          <View style={styles.selectedAreaInfo}>
                            <Text style={styles.selectedAreaText}>
                              {selectedLocation}
                            </Text>
                            {/* {selectedArea && (
                              <View style={styles.slotsInfo}>
                                {selectedArea.slots.morning.enabled && (
                                  <Text style={styles.slotBadge}>
                                    {DELIVERY_SLOT_ICONS.morning} Morning
                                  </Text>
                                )}
                                {selectedArea.slots.evening.enabled && (
                                  <Text style={styles.slotBadge}>
                                    {DELIVERY_SLOT_ICONS.evening} Evening
                                  </Text>
                                )}
                              </View>
                            )} */}
                          </View>
                          <Text style={styles.chevron}>›</Text>
                        </View>
                      ) : (
                        <View style={styles.placeholderContent}>
                          <Text style={styles.placeholderText}>
                            Tap to select delivery area
                          </Text>
                          <Text style={styles.chevron}>›</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.helpText}>
                      Select the area where you want deliveries
                    </Text>
                  </>
                ) : (
                  <View style={styles.noAreasCard}>
                    <Text style={styles.noAreasIcon}>📍</Text>
                    <Text style={styles.noAreasText}>
                      No delivery areas available. Please contact support.
                    </Text>
                  </View>
                )}
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
        {/* {step === 2 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipAddress}
            disabled={saving}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        )} */}

        <TouchableOpacity
          style={[
            styles.nextButton,
            (saving || (step === 2 && deliveryAreas.length === 0)) && styles.buttonDisabled,
          ]}
          onPress={handleNext}
          disabled={saving || (step === 2 && deliveryAreas.length === 0)}
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

      {/* Delivery Area Selection Modal */}
      <Modal
        visible={showAreaModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAreaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Area</Text>
              <TouchableOpacity onPress={() => setShowAreaModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Areas List */}
            <ScrollView style={styles.modalScroll}>
              {deliveryAreas.map((area) => {
                const isSelected = selectedLocation === area.name;
                
                return (
                  <TouchableOpacity
                    key={area.id}
                    style={[
                      styles.areaCard,
                      isSelected && styles.areaCardSelected,
                    ]}
                    onPress={() => handleSelectArea(area)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.areaCardContent}>
                      <View style={styles.areaCardLeft}>
                        <Text style={styles.areaName}>{area.name}</Text>
                        <Text style={styles.areaPincode}>Pincode: {area.pincode}</Text>
                        
                        {/* Available Slots */}
                        {/* <View style={styles.areaSlotsRow}>
                          <Text style={styles.areaSlotsLabel}>Available slots:</Text>
                          {area.slots.morning.enabled && (
                            <View style={styles.areaSlotChip}>
                              <Text style={styles.areaSlotText}>
                                {DELIVERY_SLOT_ICONS.morning} Morning
                              </Text>
                            </View>
                          )}
                          {area.slots.evening.enabled && (
                            <View style={styles.areaSlotChip}>
                              <Text style={styles.areaSlotText}>
                                {DELIVERY_SLOT_ICONS.evening} Evening
                              </Text>
                            </View>
                          )}
                        </View> */}
                      </View>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Text style={styles.checkMark}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  areaSelector: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    minHeight: 56,
  },
  areaSelectorSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  selectedAreaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedAreaInfo: {
    flex: 1,
  },
  selectedAreaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  slotsInfo: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  slotBadge: {
    fontSize: 11,
    color: '#4CAF50',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  placeholderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  noAreasCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  noAreasIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noAreasText: {
    fontSize: 13,
    color: '#F57F17',
    textAlign: 'center',
    lineHeight: 18,
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalClose: {
    fontSize: 28,
    color: '#999',
  },
  modalScroll: {
    padding: 16,
  },
  areaCard: {
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  areaCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  areaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  areaCardLeft: {
    flex: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  areaPincode: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  areaSlotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  areaSlotsLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  areaSlotChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  areaSlotText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkMark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});