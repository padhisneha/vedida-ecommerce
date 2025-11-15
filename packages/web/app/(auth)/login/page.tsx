'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseAuth } from '@ecommerce/shared';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { initializeApp } from '@/lib/firebase';
import { showToast } from '@/lib/toast';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('✅ Already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Initialize Firebase and reCAPTCHA
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initializeAuth = () => {
      try {
        // Initialize Firebase
        initializeApp();
        console.log('✅ Firebase initialized');
        
        // Check if container exists
        const container = document.getElementById('recaptcha-container');
        
        if (!container) {
          console.error('❌ recaptcha-container not found, retrying...');
          setTimeout(initializeAuth, 200);
          return;
        }
        
        // Initialize reCAPTCHA
        const auth = getFirebaseAuth();
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('✅ reCAPTCHA verified');
          },
          'expired-callback': () => {
            console.log('⚠️ reCAPTCHA expired');
          },
        });
        
        setRecaptchaVerifier(verifier);
        setInitialized(true);
        console.log('✅ reCAPTCHA initialized successfully');
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setInitialized(true);
      }
    };

    const timer = setTimeout(initializeAuth, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || phoneNumber.length !== 10) {
      showToast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (!recaptchaVerifier) {
      showToast.error('Security check is still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const formattedPhone = `+91${phoneNumber}`;

      console.log('Sending OTP to:', formattedPhone);

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier
      );

      setVerificationId(confirmation);
      showToast.success('OTP sent successfully! Check your phone.');
    } catch (error: any) {
      console.error('OTP send error:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please contact support.';
      }
      
      showToast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      showToast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      showToast.error('Please request OTP first');
      return;
    }

    setLoading(true);
    try {
      const result = await verificationId.confirm(otp);
      const firebaseUser = result.user;

      console.log('✅ OTP verified, User ID:', firebaseUser.uid);
      console.log('⏳ Waiting for AuthContext to load user data...');

      // Don't redirect immediately - let AuthContext handle it via useEffect above
      // The user data will be loaded, and the redirect will happen automatically
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP expired. Please request a new one.';
      }
      
      showToast.error(errorMessage);
      setLoading(false);
    }
    // Don't set loading to false here - let the redirect happen
  };

  // Show loading while auth is processing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse"><Image src="/logo.png" width={160} height={160} className="mx-auto object-contain drop-shadow-xl" alt="Logo" /></div>
          <div className="text-lg text-gray-600">Checking authentication...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white p-4">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container" className="fixed top-0 left-0"></div>

      {!initialized ? (
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse"><Image src="/logo.png" width={160} height={160} className="mx-auto object-contain drop-shadow-xl" alt="Logo" /></div>
          <div className="text-lg text-gray-600">Initializing security...</div>
        </div>
      ) : (
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4"><Image src="/logo.png" width="160" height={160} className="mx-auto object-contain drop-shadow-xl" alt="Logo" /></div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Vedida Farms Admin
            </h1>
            <p className="text-gray-600">
              {verificationId ? 'Enter the OTP sent to your phone' : 'Login with your phone number'}
            </p>
          </div>

          <div className="card">
            {!verificationId ? (
              <form onSubmit={sendOTP}>
                <div className="mb-6">
                  <label className="label">Phone Number</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                    <span className="px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold border-r border-gray-300">
                      +91
                    </span>
                    <input
                      type="tel"
                      className="flex-1 px-4 py-2.5 focus:outline-none"
                      placeholder="Phone Number"
                      maxLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={loading || !recaptchaVerifier}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Admin access only. Use your registered admin phone number.
                  </p>
                </div>

                {!recaptchaVerifier && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Loading security check...
                    </p>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={verifyOTP}>
                <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-1">OTP sent to</p>
                  <p className="text-lg font-semibold text-gray-900">
                    +91 {phoneNumber}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="label">Enter OTP</label>
                  <input
                    type="text"
                    className="input text-center text-2xl tracking-widest font-semibold"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {loading && (
                  <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg text-center">
                    <p className="text-sm text-primary-800">
                      ⏳ Verifying and loading your profile...
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full mb-4"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => {
                    setVerificationId(null);
                    setOtp('');
                    setLoading(false);
                  }}
                  disabled={loading}
                >
                  Change Phone Number
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Admin access only • Secured by Firebase Authentication
            </p>
          </div>
        </div>
      )}
    </div>
  );
}