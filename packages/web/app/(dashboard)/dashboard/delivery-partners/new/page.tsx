'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createDeliveryPartner } from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function NewDeliveryPartnerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    vehicleType: 'bike',
    vehicleNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error('Please enter partner name');
      return;
    }

    if (!formData.phoneNumber.trim() || formData.phoneNumber.length !== 10) {
      showToast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setSaving(true);
    const toastId = showToast.loading('Creating delivery partner...');

    try {
      const formattedPhone = `+91${formData.phoneNumber}`;
      
      await createDeliveryPartner(formattedPhone, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
      });

      showToast.dismiss(toastId);
      showToast.success('Delivery partner created successfully!');
      router.push('/dashboard/delivery-partners');
    } catch (error: any) {
      console.error('Error creating delivery partner:', error);
      showToast.dismiss(toastId);
      showToast.error(`Failed to create delivery partner: ${error.message || 'Unknown error'}`);
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/delivery-partners"
          className="text-primary-600 hover:text-primary-700 font-medium text-sm mb-4 inline-flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to Delivery Partners</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Add Delivery Partner</h1>
        <p className="text-gray-600 mt-2">Create a new delivery partner account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👤 Personal Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Rajesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Phone Number *</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                    <span className="px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold border-r border-gray-300">
                      +91
                    </span>
                    <input
                      type="tel"
                      className="flex-1 px-4 py-2.5 focus:outline-none"
                      placeholder="Phone Number"
                      maxLength={10}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/[^0-9]/g, '') })}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be used for login
                  </p>
                </div>

                <div>
                  <label className="label">Email (Optional)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                🚗 Vehicle Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Vehicle Type *</label>
                  <select
                    className="input"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  >
                    <option value="bike">🏍️ Bike/Scooter</option>
                    <option value="car">🚗 Car</option>
                    <option value="bicycle">🚲 Bicycle</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>

                <div>
                  <label className="label">Vehicle Number</label>
                  <input
                    type="text"
                    className="input uppercase"
                    placeholder="e.g., KA01AB1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Actions */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                👁️ Preview
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {formData.name.charAt(0).toUpperCase() || 'D'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formData.name || 'Partner Name'}
                    </p>
                    <p className="text-sm text-gray-600">Delivery Partner</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    📞 {formData.phoneNumber ? `+91 ${formData.phoneNumber}` : 'Phone number'}
                  </p>
                  {formData.email && (
                    <p className="text-gray-600">📧 {formData.email}</p>
                  )}
                  <p className="text-gray-600">
                    🚗 {formData.vehicleType.charAt(0).toUpperCase() + formData.vehicleType.slice(1)}
                  </p>
                  {formData.vehicleNumber && (
                    <p className="text-gray-600 font-mono">
                      🔢 {formData.vehicleNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="card">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full mb-3"
              >
                {saving ? 'Creating Partner...' : '✅ Create Delivery Partner'}
              </button>
              <Link
                href="/dashboard/delivery-partners"
                className="block text-center btn-secondary w-full"
              >
                Cancel
              </Link>
            </div>

            {/* Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Important</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Partner will use phone number for login</li>
                <li>• They can update order delivery status</li>
                <li>• Vehicle info helps in route planning</li>
                <li>• You can suspend partners anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}