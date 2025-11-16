'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@ecommerce/shared';
import { getFirebaseAuth, getUserById } from '@ecommerce/shared';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { initializeApp } from '@/lib/firebase';
import { showToast } from '@/lib/toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAdmin: false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase
    initializeApp();

    // Listen to auth state changes
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔍 Auth state changed:', firebaseUser?.uid);

      if (firebaseUser) {
        try {
          console.log('Fetching user from Firestore with UID:', firebaseUser.uid);
          
          const userData = await getUserById(firebaseUser.uid);
          
          console.log('📋 User data from Firestore:', userData);
          
          if (userData) {
            console.log('User role:', userData.role);
            
            // Check if user is admin
            if (userData.role === UserRole.ADMIN) {
              console.log('✅ User is admin, granting access');
              setUser(userData);
            } else if (userData.role === UserRole.DELIVERY_PARTNER) {
              console.log('✅ User is delivery partner, granting access');
              setUser(userData);
            } else {
              // Not an admin or delivery partner, sign out
              console.log('⚠️ User is not an admin or delivery partner. Role:', userData.role);
              setUser(null);
              await signOut(auth);
              showToast.error('Access denied. Admin or Delivery Partner privileges required.');
            }
          } else {
            console.log('❌ User document not found in Firestore for UID:', firebaseUser.uid);
            setUser(null);
            await signOut(auth);
            showToast.error('User not found. Please contact administrator.');
          }
        } catch (error) {
          console.error('❌ Error fetching user:', error);
          setUser(null);
        }
      } else {
        console.log('❌ No Firebase user signed in');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: user?.role === UserRole.ADMIN,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};