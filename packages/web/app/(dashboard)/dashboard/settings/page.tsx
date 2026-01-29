'use client';

import { useState, useEffect } from 'react';
import {
  getAppSettings,
  updateAppSettings,
  getAllDeliveryAreas,
  addDeliveryArea,
  deleteDeliveryArea,
  toggleDeliveryArea,
  updateDeliveryAreaSlots,
  AppSettings,
  DeliveryArea,
  DeliverySlot,
  DELIVERY_SLOT_LABELS,
  getAllUsers,
  User,
  UserRole,
  formatDate,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

type TabType = 'fees' | 'delivery' | 'support' | 'users';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('fees');

  // Fee Configuration
  const [platformFee, setPlatformFee] = useState(5);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [minimumOrderAmount, setMinimumOrderAmount] = useState(0);

  // Delivery Settings
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(10);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPincode, setNewAreaPincode] = useState('');
  const [editingSlots, setEditingSlots] = useState<string | null>(null);
  const [slotConfig, setSlotConfig] = useState<{
    morning: boolean;
    evening: boolean;
  }>({ morning: true, evening: true });

  // Support Contact
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportWhatsApp, setSupportWhatsApp] = useState('');
  

  useEffect(() => {
    loadSettings();
    loadDeliveryAreas();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getAppSettings();
      setSettings(data);
      
      // Populate form fields
      setPlatformFee(data.platformFee);
      setDeliveryFee(data.deliveryFee);
      setMinimumOrderAmount(data.minimumOrderAmount);
      setMaxDeliveryDistance(data.maxDeliveryDistance);
      setSupportEmail(data.supportEmail);
      setSupportPhone(data.supportPhone);
      setSupportWhatsApp(data.supportWhatsApp);
      
      console.log('✅ Loaded settings');
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryAreas = async () => {
    try {
      const areas = await getAllDeliveryAreas();
      setDeliveryAreas(areas);
      console.log('✅ Loaded delivery areas:', areas.length);
    } catch (error) {
      console.error('Error loading delivery areas:', error);
      showToast.error('Failed to load delivery areas');
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSaveFees = async () => {
    if (platformFee < 0 || deliveryFee < 0 || minimumOrderAmount < 0) {
      showToast.error('Fees cannot be negative');
      return;
    }

    setSaving(true);
    try {
      await updateAppSettings({
        platformFee,
        deliveryFee,
        minimumOrderAmount,
      });
      
      showToast.success('Fee configuration updated successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving fees:', error);
      showToast.error('Failed to save fee configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDelivery = async () => {
    if (maxDeliveryDistance <= 0) {
      showToast.error('Maximum delivery distance must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await updateAppSettings({
        maxDeliveryDistance,
      });
      
      showToast.success('Delivery settings updated successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      showToast.error('Failed to save delivery settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDeliveryArea = async () => {
    if (!newAreaName.trim() || !newAreaPincode.trim()) {
      showToast.error('Please enter area name and pincode');
      return;
    }

    if (newAreaPincode.length !== 6) {
      showToast.error('Pincode must be 6 digits');
      return;
    }

    setSaving(true);
    try {
      await addDeliveryArea({
        name: newAreaName.trim(),
        pincode: newAreaPincode.trim(),
      });
      
      setNewAreaName('');
      setNewAreaPincode('');
      showToast.success('Delivery area added successfully!');
      await loadDeliveryAreas();
    } catch (error: any) {
      console.error('Error adding delivery area:', error);
      showToast.error(error.message || 'Failed to add delivery area');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDeliveryArea = async (areaId: string, areaName: string) => {
    if (!confirm(`Remove delivery area "${areaName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    try {
      await deleteDeliveryArea(areaId);
      showToast.success('Delivery area removed successfully!');
      await loadDeliveryAreas();
    } catch (error) {
      console.error('Error removing delivery area:', error);
      showToast.error('Failed to remove delivery area');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeliveryArea = async (areaId: string) => {
    setSaving(true);
    try {
      await toggleDeliveryArea(areaId);
      showToast.success('Delivery area status updated!');
      await loadDeliveryAreas();
    } catch (error) {
      console.error('Error toggling delivery area:', error);
      showToast.error('Failed to toggle delivery area');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSlots = (area: DeliveryArea) => {
    setEditingSlots(area.id);
    setSlotConfig({
      morning: area.slots.morning.enabled,
      evening: area.slots.evening.enabled,
    });
  };

  const handleSaveSlots = async (areaId: string) => {
    // Validate: At least one slot must be enabled
    if (!slotConfig.morning && !slotConfig.evening) {
      showToast.error('At least one delivery slot must be enabled');
      return;
    }

    setSaving(true);
    try {
      await updateDeliveryAreaSlots(areaId, {
        morning: { enabled: slotConfig.morning },
        evening: { enabled: slotConfig.evening },
      });
      
      setEditingSlots(null);
      showToast.success('Delivery slots updated successfully!');
      await loadDeliveryAreas();
    } catch (error) {
      console.error('Error updating slots:', error);
      showToast.error('Failed to update delivery slots');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSlots(null);
    setSlotConfig({ morning: true, evening: true });
  };

  const handleSaveSupport = async () => {
    if (!supportEmail.trim() || !supportPhone.trim() || !supportWhatsApp.trim()) {
      showToast.error('All support contact fields are required');
      return;
    }

    setSaving(true);
    try {
      await updateAppSettings({
        supportEmail: supportEmail.trim(),
        supportPhone: supportPhone.trim(),
        supportWhatsApp: supportWhatsApp.trim(),
      });
      
      showToast.success('Support contact updated successfully!');
      await loadSettings();
    } catch (error) {
      console.error('Error saving support contact:', error);
      showToast.error('Failed to save support contact');
    } finally {
      setSaving(false);
    }
  };

  const getRoleUsers = (role: UserRole) => {
    return users.filter((user) => user.role === role);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⚙️</div>
          <div className="text-lg text-gray-600">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your business configuration</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('fees')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'fees'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            💰 Fee Configuration
          </button>

          <button
            onClick={() => setActiveTab('delivery')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'delivery'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            🚚 Delivery Settings
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'support'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            📞 Support Contact
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            👥 User Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'fees' && (
        <div className="max-w-3xl">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              💰 Fee Configuration
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="label">Platform Fee (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Fixed fee charged per order
                </p>
              </div>

              <div>
                <label className="label">Delivery Fee (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Delivery charge per order (0 for free delivery)
                </p>
              </div>

              <div>
                <label className="label">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={minimumOrderAmount}
                  onChange={(e) => setMinimumOrderAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum order value required (0 for no minimum)
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveFees}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : '💾 Save Fee Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'delivery' && (
        <div className="max-w-4xl space-y-6">
          {/* Max Distance */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              🚚 Delivery Configuration
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="label">Maximum Delivery Distance (km)</label>
                <input
                  type="number"
                  className="input max-w-xs"
                  value={maxDeliveryDistance}
                  onChange={(e) => setMaxDeliveryDistance(parseFloat(e.target.value) || 0)}
                  min="1"
                  step="0.1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum distance for deliveries from your location
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveDelivery}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : '💾 Save Delivery Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Areas */}
          {/* Delivery Areas Section */}
          <div className="max-w-5xl space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                📍 Delivery Areas & Time Slots
              </h2>
              
              {/* Add New Area */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <h3 className="font-semibold text-gray-900 mb-4">Add New Delivery Area</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Area Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Janapriya Nile Valley Block 1, Ameenpur"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include apartment/building name and locality
                    </p>
                  </div>
                  <div>
                    <label className="label">Pincode</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., 502032"
                      maxLength={6}
                      value={newAreaPincode}
                      onChange={(e) => setNewAreaPincode(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Note:</strong> Both delivery slots (Morning & Evening) will be enabled by default. 
                    You can customize them after adding the area.
                  </p>
                </div>
                <button
                  onClick={handleAddDeliveryArea}
                  disabled={saving}
                  className="btn-primary mt-4"
                >
                  ➕ Add Delivery Area
                </button>
              </div>

              {/* Areas List */}
              {deliveryAreas.length > 0 ? (
                <div className="space-y-3">
                  {deliveryAreas.map((area) => (
                    <div
                      key={area.id}
                      className={`border-2 rounded-lg ${
                        editingSlots === area.id 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Area Header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Active Toggle */}
                          <button
                            onClick={() => handleToggleDeliveryArea(area.id)}
                            disabled={saving || editingSlots === area.id}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              area.active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            title={area.active ? 'Area Active' : 'Area Inactive'}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                              area.active ? 'translate-x-6' : 'translate-x-0.5'
                            }`}></div>
                          </button>

                          {/* Area Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{area.name}</p>
                              {!area.active && (
                                <span className="badge badge-warning text-xs">Inactive</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">Pincode: {area.pincode}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {editingSlots !== area.id && (
                            <button
                              onClick={() => handleEditSlots(area)}
                              disabled={saving}
                              className="btn-secondary text-sm"
                            >
                              🕐 Edit Slots
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveDeliveryArea(area.id, area.name)}
                            disabled={saving || editingSlots === area.id}
                            className="text-red-600 hover:text-red-700 font-medium text-sm px-3 py-1"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>

                      {/* Slot Configuration */}
                      {editingSlots === area.id ? (
                        // Edit Mode
                        <div className="px-4 pb-4 border-t border-blue-200">
                          <div className="bg-white rounded-lg p-4 mt-3">
                            <h4 className="font-semibold text-gray-900 mb-3">
                              Configure Delivery Slots
                            </h4>
                            
                            <div className="space-y-3">
                              {/* Morning Slot */}
                              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={slotConfig.morning}
                                  onChange={(e) => setSlotConfig({ ...slotConfig, morning: e.target.checked })}
                                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">🌅</span>
                                    <div>
                                      <p className="font-medium text-gray-900">Morning Delivery</p>
                                      <p className="text-sm text-gray-500">6 AM - 12 PM</p>
                                    </div>
                                  </div>
                                </div>
                              </label>

                              {/* Evening Slot */}
                              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={slotConfig.evening}
                                  onChange={(e) => setSlotConfig({ ...slotConfig, evening: e.target.checked })}
                                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">🌆</span>
                                    <div>
                                      <p className="font-medium text-gray-900">Evening Delivery</p>
                                      <p className="text-sm text-gray-500">4 PM - 8 PM</p>
                                    </div>
                                  </div>
                                </div>
                              </label>
                            </div>

                            {/* Validation Warning */}
                            {!slotConfig.morning && !slotConfig.evening && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                  ⚠️ At least one delivery slot must be enabled
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleSaveSlots(area.id)}
                                disabled={saving || (!slotConfig.morning && !slotConfig.evening)}
                                className="btn-primary flex-1"
                              >
                                {saving ? 'Saving...' : '💾 Save Slots'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="btn-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="px-4 pb-4 border-t border-gray-200">
                          <div className="flex items-center gap-4 mt-3">
                            <p className="text-sm font-medium text-gray-700">
                              Available Slots:
                            </p>
                            <div className="flex items-center gap-2">
                              {area.slots.morning.enabled && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                  🌅 Morning (6 AM - 12 PM)
                                </span>
                              )}
                              {area.slots.evening.enabled && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  🌆 Evening (4 PM - 8 PM)
                                </span>
                              )}
                              {!area.slots.morning.enabled && !area.slots.evening.enabled && (
                                <span className="text-sm text-red-600 font-medium">
                                  ⚠️ No slots enabled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-4xl mb-4">📍</p>
                  <p className="text-gray-600 font-medium">No delivery areas added yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Add your first delivery area to start accepting orders
                  </p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'support' && (
        <div className="max-w-3xl">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              📞 Support Contact Information
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="label">Support Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="support@dairyfresh.com"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Support Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+919876543210"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="label">WhatsApp Number (without +)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="919876543210"
                  value={supportWhatsApp}
                  onChange={(e) => setSupportWhatsApp(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter without + sign (e.g., 919876543210 for +91 9876543210)
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSupport}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : '💾 Save Support Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="max-w-5xl space-y-6">
          {/* Admins */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                👑 Administrators ({getRoleUsers(UserRole.ADMIN).length})
              </h2>
              <button className="btn-secondary text-sm" disabled>
                ➕ Add Admin (Coming Soon)
              </button>
            </div>
            
            <div className="space-y-2">
              {getRoleUsers(UserRole.ADMIN).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name || 'Admin User'}</p>
                      <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="badge badge-info">Admin</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Since {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operators */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                💼 Operators
              </h2>
              <button className="btn-secondary text-sm" disabled>
                ➕ Add Operator (Coming Soon)
              </button>
            </div>
            
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4 text-4xl">🚧</p>
              <p>Operator management coming soon</p>
              <p className="text-sm mt-2">You&apos;ll be able to add and manage operators with limited permissions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}