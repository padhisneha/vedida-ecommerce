// AddEditAddressScreen.tsx
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
  Switch,
  Modal,
} from 'react-native';
import {
  useAuthStore,
  addUserAddress,
  updateUserAddress,
  UserAddress,
  getUserById,
  getActiveDeliveryAreas,
  DeliveryArea,
  DELIVERY_SLOT_ICONS,
} from '@ecommerce/shared';
import { showToast } from '../../utils/toast';

export const AddEditAddressScreen = ({ route, navigation }: any) => {
  const { address } = route.params || {};
  const isEdit = !!address;
  
  const { user, setUser } = useAuthStore();
  
  // Form fields
  const [label, setLabel] = useState(address?.label || '');
  const [apartment, setApartment] = useState(address?.apartment || '');
  const [street, setStreet] = useState(address?.street || '');
  const [selectedLocation, setSelectedLocation] = useState(address?.location || '');
  const [city, setCity] = useState(address?.city || '');
  const [state, setState] = useState(address?.state || '');
  const [pincode, setPincode] = useState(address?.pincode || '');
  const [landmark, setLandmark] = useState(address?.landmark || '');
  const [isDefault, setIsDefault] = useState(address?.isDefault || false);
  
  // Delivery areas
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [showAreaModal, setShowAreaModal] = useState(false);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDeliveryAreas();
  }, []);

  const loadDeliveryAreas = async () => {
    setLoadingAreas(true);
    try {
      const areas = await getActiveDeliveryAreas();
      setDeliveryAreas(areas);
      console.log('✅ Loaded active delivery areas:', areas.length);
      
      // If editing and location exists, verify it's still active
      if (isEdit && address?.location) {
        const locationExists = areas.some(area => area.name === address.location);
        if (!locationExists) {
          showToast.error('Your selected area is no longer available. Please select a new one.');
          setSelectedLocation('');
        }
      }
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
    setState('Telangana'); // You can make this dynamic if needed
    setPincode(area.pincode);
    setShowAreaModal(false);
  };

  const validateInputs = () => {
    if (!label.trim()) {
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

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to save address');
      return;
    }

    if (!validateInputs()) return;

    setSaving(true);
    try {
      const addressData: Partial<UserAddress> = {
        label: label.trim(),
        apartment: apartment.trim(),
        street: street.trim(),
        location: selectedLocation,  // Store selected delivery area name
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        isDefault,
      };

      if (isEdit) {
        await updateUserAddress(user.id, address.id, addressData);
        showToast.success('Address updated successfully');
      } else {
        await addUserAddress(user.id, addressData);
        showToast.success('Address added successfully');
      }

      // Refresh user data from Firestore
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        console.log('✅ User data refreshed after address save');
      }

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const selectedArea = getSelectedArea();

  return (
    <View style={styles.container}>
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
                        <Text style={styles.selectedAreaText}>{selectedLocation}</Text>
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
                  No delivery areas available yet. Please contact support.
                </Text>
              </View>
            )}
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

          {/* City (Auto-filled, editable) */}
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

          {/* State (Auto-filled, editable) */}
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

          {/* Pincode (Auto-filled, editable) */}
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
          style={[
            styles.saveButton,
            (saving || deliveryAreas.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || deliveryAreas.length === 0}
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
                          {!area.slots.morning.enabled && !area.slots.evening.enabled && (
                            <Text style={styles.noSlotsText}>No slots</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  noSlotsText: {
    fontSize: 11,
    color: '#f44336',
    fontStyle: 'italic',
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