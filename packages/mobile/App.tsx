import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeApp } from './src/config/firebase';
import { useAuthStore } from '@ecommerce/shared';
import { getFirebaseAuth } from '@ecommerce/shared';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserById } from '@ecommerce/shared';

export default function App() {
  const { setUser, setLoading, user } = useAuthStore();

  useEffect(() => {
    // Initialize Firebase
    try {
      initializeApp();
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setLoading(false);
      return;
    }

    // Listen to auth state changes
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid);

      if (firebaseUser) {
        try {
          // Fetch user from Firestore
          const userData = await getUserById(firebaseUser.uid);

          if (userData) {
            console.log('✅ User loaded:', userData.id);
            console.log('Name:', userData.name);
            console.log('Addresses:', userData.addresses?.length || 0);
            
            setUser(userData);
          } else {
            console.log('⚠️ User not found in Firestore');
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error fetching user:', error);
          setLoading(false);
        }
      } else {
        console.log('❌ No user signed in');
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Log user changes for debugging
  useEffect(() => {
    if (user) {
      console.log('User state updated:', {
        id: user.id,
        name: user.name,
        addressCount: user.addresses?.length || 0,
      });
    }
  }, [user]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}