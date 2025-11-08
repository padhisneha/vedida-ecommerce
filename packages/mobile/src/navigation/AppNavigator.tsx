import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@ecommerce/shared';
import { Text } from 'react-native';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

// Home Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';

// Cart & Checkout Screens
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/checkout/CheckoutScreen';

// Subscription Screens
import { SubscriptionsScreen } from '../screens/subscriptions/SubscriptionsScreen';
import { CreateSubscriptionScreen } from '../screens/subscriptions/CreateSubscriptionScreen';
import { SubscriptionCheckoutScreen } from '../screens/subscriptions/SubscriptionCheckoutScreen';
import { SubscriptionDetailScreen } from '../screens/subscriptions/SubscriptionDetailScreen';
import { PauseSubscriptionScreen } from '../screens/subscriptions/PauseSubscriptionScreen';

// Profile Screens
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

// Address Screens
import { AddressListScreen } from '../screens/address/AddressListScreen';
import { AddEditAddressScreen } from '../screens/address/AddEditAddressScreen';
import { SelectAddressScreen } from '../screens/address/SelectAddressScreen';

// Order Screens
import { OrderHistoryScreen } from '../screens/orders/OrderHistoryScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ icon, color }: { icon: string; color: string }) => (
  <Text style={{ fontSize: 24, color }}>{icon}</Text>
);

// Home Stack Navigator
const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          title: 'Product Details',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4CAF50',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
    </Stack.Navigator>
  );
};

// Cart Stack Navigator
const CartStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CartMain"
        component={CartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          title: 'Checkout',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4CAF50',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="SelectAddress"
        component={SelectAddressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddEditAddressScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Subscriptions Stack Navigator
const SubscriptionsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="SubscriptionsList"
        component={SubscriptionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateSubscription"
        component={CreateSubscriptionScreen}
        options={{
          title: 'Create Subscription',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4CAF50',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="SubscriptionCheckout"
        component={SubscriptionCheckoutScreen}
        options={{
          title: 'Subscription Checkout',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#4CAF50',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />
      <Stack.Screen
        name="SubscriptionDetail"
        component={SubscriptionDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PauseSubscription"
        component={PauseSubscriptionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SelectAddress"
        component={SelectAddressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddEditAddressScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddressList"
        component={AddressListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddAddress"
        component={AddEditAddressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditAddress"
        component={AddEditAddressScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};


// Tab Navigator
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
          paddingTop: 4,
          paddingBottom: 30,
          height: 100,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color }) => <TabIcon icon="🛒" color={color} />,
        }}
      />
      <Tab.Screen
        name="SubscriptionsTab"
        component={SubscriptionsStack}
        options={{
          tabBarLabel: 'Subscriptions',
          tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
export const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return null;
  }

  // Check if user needs onboarding
  const needsOnboarding = isAuthenticated && user && (!user.name || user.addresses.length === 0);

  console.log('Navigation state:', {
    isAuthenticated,
    hasUser: !!user,
    userName: user?.name,
    addressCount: user?.addresses?.length || 0,
    needsOnboarding,
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};