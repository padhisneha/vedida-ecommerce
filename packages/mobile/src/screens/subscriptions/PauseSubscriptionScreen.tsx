import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  updateSubscriptionStatus,
  SubscriptionStatus,
  dateToTimestamp,
} from '@ecommerce/shared';

export const PauseSubscriptionScreen = ({ route, navigation }: any) => {
  const { subscriptionId } = route.params;

  // Calculate default dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const oneWeekLater = new Date(tomorrow);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  const [startDate, setStartDate] = useState<Date>(tomorrow);
  const [endDate, setEndDate] = useState<Date>(oneWeekLater);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculatePauseDays = () => {
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const quickOptions = [
    { label: '1 Week', days: 7, icon: '📅' },
    { label: '2 Weeks', days: 14, icon: '📆' },
    { label: '1 Month', days: 30, icon: '🗓️' },
  ];

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() + 1);

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    setStartDate(start);
    setEndDate(end);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');

    if (selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        Alert.alert('Invalid Date', 'Start date must be in the future');
        return;
      }

      setStartDate(selectedDate);

      // Adjust end date if it's before the new start date
      if (selectedDate >= endDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setDate(newEndDate.getDate() + 7);
        setEndDate(newEndDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');

    if (selectedDate) {
      if (selectedDate <= startDate) {
        Alert.alert('Invalid Date', 'End date must be after start date');
        return;
      }

      setEndDate(selectedDate);
    }
  };

  const handlePauseSubscription = async () => {
    if (endDate <= startDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date');
      return;
    }

    const days = calculatePauseDays();

    Alert.alert(
      'Confirm Pause',
      `Pause subscription from ${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}?\n\nTotal: ${days} days`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await updateSubscriptionStatus(
                subscriptionId,
                SubscriptionStatus.PAUSED,
                endDate
              );

              Alert.alert(
                'Subscription Paused! ⏸️',
                `Your subscription will be paused for ${days} days.`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error pausing subscription:', error);
              Alert.alert('Error', 'Failed to pause subscription');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const pauseDays = calculatePauseDays();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pause Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>⏸️</Text>
          <Text style={styles.infoTitle}>Temporarily Pause Deliveries</Text>
          <Text style={styles.infoSubtitle}>
            Your subscription will be automatically resumed after the pause period
          </Text>
        </View>

        {/* Quick Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Options</Text>
          <View style={styles.quickOptionsContainer}>
            {quickOptions.map((option) => (
              <TouchableOpacity
                key={option.days}
                style={[
                  styles.quickOption,
                  pauseDays === option.days && styles.quickOptionActive,
                ]}
                onPress={() => handleQuickSelect(option.days)}
              >
                <Text style={styles.quickOptionIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.quickOptionLabel,
                    pauseDays === option.days && styles.quickOptionLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Custom Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Custom Pause Period</Text>

          {/* Start Date */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateLabel}>Pause From</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateSubtext}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* End Date */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateLabel}>Resume On</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateSubtext}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              minimumDate={tomorrow}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              minimumDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
            />
          )}

          {/* Duration Display */}
          <View style={styles.durationCard}>
            <Text style={styles.durationIcon}>⏱️</Text>
            <View style={styles.durationContent}>
              <Text style={styles.durationLabel}>Total Pause Duration</Text>
              <Text style={styles.durationValue}>
                {pauseDays} {pauseDays === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Important Notes</Text>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              • No deliveries will be made during the pause period
            </Text>
            <Text style={styles.noteText}>
              • Your subscription will automatically resume on the end date
            </Text>
            <Text style={styles.noteText}>
              • You can resume or cancel anytime from subscription details
            </Text>
            <Text style={styles.noteText}>
              • No charges will be deducted during pause
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Pause Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Duration</Text>
          <Text style={styles.footerValue}>
            {pauseDays} {pauseDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.pauseButton, loading && styles.buttonDisabled]}
          onPress={handlePauseSubscription}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.pauseButtonText}>⏸️ Pause Subscription</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 28,
    color: '#FF9800',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 28,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickOption: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  quickOptionActive: {
    backgroundColor: '#fff3e0',
    borderColor: '#FF9800',
  },
  quickOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickOptionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  quickOptionLabelActive: {
    color: '#FF9800',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginHorizontal: 16,
  },
  dateSelector: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  dateIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dateSubtext: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    marginTop: 8,
  },
  durationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  durationContent: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  noteCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  noteText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 16,
    color: '#666',
  },
  footerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});