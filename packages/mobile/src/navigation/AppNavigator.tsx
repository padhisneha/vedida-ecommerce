import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@ecommerce/shared';
import { Text } from "react-native";

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { SubscriptionsScreen } from '../screens/subscriptions/SubscriptionsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color }) => <TabIcon icon="🛒" color={color} />,
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          tabBarLabel: 'Subscriptions',
          tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const TabIcon = ({ icon, color }: { icon: string; color: string }) => (
  <Text style={{ fontSize: 24, color }}>{icon}</Text>
);

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};