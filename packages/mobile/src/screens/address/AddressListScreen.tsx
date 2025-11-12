import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  useAuthStore,
  UserAddress,
  deleteUserAddress,
  updateUserProfile,
  getUserById,
} from '@ecommerce/shared';

export const AddressListScreen = ({ navigation }: any) => {
  const { user, setUser } = useAuthStore();

  // Add useEffect to refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUserData();
    });

    return unsubscribe;
  }, [navigation, user]);

  const refreshUserData = async () => {
    if (!user) return;

    try {
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        console.log('✅ Addresses refreshed:', updatedUser.addresses.length);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    try {
      const updatedAddresses = user.addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addressId,
      }));

      await updateUserProfile(user.id, { addresses: updatedAddresses });

      // Refresh user data
      await refreshUserData();

      Alert.alert('Success', 'Default address updated');
    } catch (error) {
      console.error('Error setting default:', error);
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const handleDeleteAddress = async (addressId: string, label: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserAddress(user.id, addressId);
              
              // Refresh user data
              await refreshUserData();

              Alert.alert('Success', 'Address deleted');
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const renderAddress = ({ item }: { item: UserAddress }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <Text style={styles.addressLabel}>{item.label}</Text>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>DEFAULT</Text>
          </View>
        )}
      </View>

      <Text style={styles.addressText}>
        {item.apartment && `${item.apartment}, `}
        {item.street}
      </Text>
      <Text style={styles.addressText}>
        {item.city}, {item.state} - {item.pincode}
      </Text>
      {item.landmark && (
        <Text style={styles.landmarkText}>📍 {item.landmark}</Text>
      )}

      <View style={styles.addressActions}>
        {!item.isDefault && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(item.id)}
          >
            <Text style={styles.actionButtonText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditAddress', { address: item })}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAddress(item.id, item.label)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Please login to manage addresses</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user.addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>No Addresses</Text>
          <Text style={styles.emptySubtitle}>
            Add a delivery address to get started
          </Text>
          <TouchableOpacity
            style={styles.addAddressButton}
            onPress={() => navigation.navigate('AddAddress')}
          >
            <Text style={styles.addAddressButtonText}>+ Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={user.addresses}
            renderItem={renderAddress}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Floating Add Button */}
          <TouchableOpacity
            style={styles.floatingAddButton}
            onPress={() => navigation.navigate('AddAddress')}
          >
            <Text style={styles.floatingAddIcon}>+</Text>
            <Text style={styles.floatingAddText}>Add New Address</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for floating button
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  landmarkText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 12,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  editButton: {
    borderColor: '#2196F3',
  },
  editButtonText: {
    color: '#2196F3',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  addAddressButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addAddressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingAddIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  floatingAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});