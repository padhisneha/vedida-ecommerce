import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeApp } from './src/config/firebase';
import { useAuthStore } from '@ecommerce/shared';
import { getFirebaseAuth, getUserById } from '@ecommerce/shared';
import { onAuthStateChanged } from 'firebase/auth';


export default function App() {
  const { setUser, setLoading } = useAuthStore();

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
          const user = await getUserById(firebaseUser.uid);

          if (user) {
            console.log('✅ User loaded:', user.id);
            setUser(user);
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

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}