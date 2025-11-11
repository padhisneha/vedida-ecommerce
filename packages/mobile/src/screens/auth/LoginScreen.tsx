import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useAuthStore, UserRole, getUserById, createUser } from '@ecommerce/shared';
import { getFirebaseAuth, getFirebaseApp } from '@ecommerce/shared';
import {
  PhoneAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { firebaseConfig } from '../../config/firebase';

export const LoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('9999999999'); // Default for testing
  const [otp, setOtp] = useState('123456'); // Default for testing
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const recaptchaVerifier = useRef<any>(null);

  const sendOTP = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      //Alert.alert('Error', "{phoneNumber.length}");
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const formattedPhone = `+91${phoneNumber}`;

      console.log('Sending OTP to:', formattedPhone);

      // Create phone auth provider
      const phoneProvider = new PhoneAuthProvider(auth);

      // Send verification code
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );

      setVerificationId(verificationId);
      //Alert.alert('Success', 'OTP sent successfully to your phone!');
      console.log('✅ OTP sent, Verification ID:', verificationId);
    } catch (error: any) {
      console.error('❌ OTP send error:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please contact support.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      Alert.alert('Error', 'Please request OTP first');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const formattedPhone = `+91${phoneNumber}`;

      console.log('Verifying OTP...');

      // Create credential
      const credential = PhoneAuthProvider.credential(verificationId, otp);

      // Sign in with credential
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      console.log('✅ OTP verified, User ID:', firebaseUser.uid);

      // Check if user exists in Firestore
      let user = await getUserById(firebaseUser.uid);

      // If user doesn't exist, create them
      if (!user) {
        console.log('Creating new user in Firestore...');
        user = await createUser(
          firebaseUser.uid,
          formattedPhone,
          UserRole.CUSTOMER
        );
      }

      setUser(user);
      //Alert.alert('Success', 'Welcome to Dairy Fresh!');
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid OTP code';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'OTP expired. Please request a new one.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = () => {
    setVerificationId(null);
    setOtp('');
    sendOTP();
  };

  return (
    <View style={styles.container}>
      {/* Firebase reCAPTCHA Verifier */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 300, height: 300, marginBottom: 5 }}
            resizeMode="contain"
          />
          <Text style={styles.title}>Vedida Farms</Text>
          <Text style={styles.subtitle}>
            {verificationId
              ? `Enter the OTP sent to your phone +91 ${phoneNumber}`
              : 'Login with your phone number'}
          </Text>
        </View>

        {!verificationId ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                editable={!loading}
                //autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={sendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                You will receive a one-time password on your mobile number
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* <View style={styles.phoneDisplay}>
              <Text style={styles.phoneLabel}>OTP sent to</Text>
              <Text style={styles.phoneNumber}>+91 {phoneNumber}</Text>
            </View> */}

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
              editable={!loading}
              //autoFocus
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={verifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive OTP? </Text>
              <TouchableOpacity onPress={resendOTP} disabled={loading}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.changeNumberButton}
              onPress={() => {
                setVerificationId(null);
                setOtp('');
              }}
              disabled={loading}
            >
              <Text style={styles.changeNumberText}>Change Phone Number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {/* By continuing, you agree to our Terms of Service and Privacy Policy */}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
  },
  prefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 18,
    color: '#1a1a1a',
  },
  phoneDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
  },
  phoneLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 64,
    fontSize: 20,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#fafafa',
    fontWeight: '400',
  },
  button: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  changeNumberButton: {
    padding: 12,
  },
  changeNumberText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});