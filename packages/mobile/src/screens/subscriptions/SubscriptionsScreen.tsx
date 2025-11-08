import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SubscriptionsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Subscriptions</Text>
      <Text style={styles.subtitle}>Your active subscriptions will appear here</Text>
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