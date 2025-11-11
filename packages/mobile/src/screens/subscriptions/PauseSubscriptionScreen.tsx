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
} from '@ecommerce/shared';

export const PauseSubscriptionScreen = ({ route, navigation }: any) => {
  const { subscriptionId } = route.params;

  // Pause starts tomorrow
  const pauseStartDate = new Date();
  pauseStartDate.setDate(pauseStartDate.getDate() + 1);
  pauseStartDate.setHours(0, 0, 0, 0);

  // Default resume date: 7 days from pause start
  const defaultResumeDate = new Date(pauseStartDate);
  defaultResumeDate.setDate(defaultResumeDate.getDate() + 7);

  const [resumeDate, setResumeDate] = useState<Date>(defaultResumeDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculatePauseDays = () => {
    const diffTime = resumeDate.getTime() - pauseStartDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (selectedDate) {
      if (selectedDate <= pauseStartDate) {
        Alert.alert('Invalid Date', 'Resume date must be after the pause start date');
        return;
      }

      setResumeDate(selectedDate);
    }
  };

  const handlePauseSubscription = async () => {
    if (resumeDate <= pauseStartDate) {
      Alert.alert('Invalid Date', 'Resume date must be after tomorrow');
      return;
    }

    const days = calculatePauseDays();

    Alert.alert(
      'Confirm Pause',
      `Your subscription will be paused from ${pauseStartDate.toLocaleDateString('en-IN')} and will automatically resume on ${resumeDate.toLocaleDateString('en-IN')}.\n\nTotal pause duration: ${days} ${days === 1 ? 'day' : 'days'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Pause',
          onPress: async () => {
            setLoading(true);
            try {
              await updateSubscriptionStatus(
                subscriptionId,
                SubscriptionStatus.PAUSED,
                resumeDate
              );

              Alert.alert(
                'Subscription Paused! ⏸️',
                `Your subscription will be paused for ${days} ${days === 1 ? 'day' : 'days'}.`,
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
          <Text style={styles.backButton}>‹</Text>
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
            Your subscription will automatically resume on the date you choose
          </Text>
        </View>

        {/* Pause Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Pause Schedule</Text>

          {/* Pause Start Date (Read-only) */}
          <View style={styles.dateInfoCard}>
            <Text style={styles.dateInfoLabel}>Pause From</Text>
            <View style={styles.dateInfoValue}>
              <Text style={styles.dateInfoIcon}>📅</Text>
              <Text style={styles.dateInfoText}>
                {pauseStartDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <Text style={styles.dateInfoSubtext}>
              (Tomorrow - Deliveries will stop from this date)
            </Text>
          </View>

          {/* Resume Date (Selectable) */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateLabel}>Resume On</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>
                  {resumeDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.dateSubtext}>Tap to change</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={resumeDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date(pauseStartDate.getTime() + 24 * 60 * 60 * 1000)}
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
          <Text style={styles.sectionTitle}>📝 Important Information</Text>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              • Pause starts from tomorrow - no deliveries during this period
            </Text>
            <Text style={styles.noteText}>
              • Your subscription will automatically resume on the selected date
            </Text>
            <Text style={styles.noteText}>
              • You can manually resume or cancel anytime from subscription details
            </Text>
            <Text style={styles.noteText}>
              • No charges will be deducted during the pause period
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Pause Button */}
      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pause starts</Text>
            <Text style={styles.summaryValue}>Tomorrow</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Resume on</Text>
            <Text style={styles.summaryValue}>
              {resumeDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Duration</Text>
            <Text style={styles.totalValue}>
              {pauseDays} {pauseDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
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
    fontSize: 32,
    color: '#FF9800',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 32,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
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
  dateInfoCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 20,
  },
  dateInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  dateInfoValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateInfoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  dateInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  dateInfoSubtext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
    borderColor: '#FF9800',
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
    color: '#FF9800',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
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
    fontSize: 24,
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
    marginBottom: 10,
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
  footerSummary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
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