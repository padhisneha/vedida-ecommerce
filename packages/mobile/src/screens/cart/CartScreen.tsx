import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export const CartScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping Cart</Text>
      <Text style={styles.subtitle}>Your cart items will appear here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});