import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { SUPPORT_CONTACT } from '@ecommerce/shared';

export const HelpSupportScreen = ({ navigation }: any) => {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                      Constants.expoConfig?.android?.versionCode || '1';

  const handleEmailPress = async () => {
    const email = SUPPORT_CONTACT.email;
    const subject = 'Support Request - Vedida Farms App';
    const body = `\n\n---\nApp Version: ${appVersion}\nBuild: ${buildNumber}\nDevice: ${Constants.deviceName || 'Unknown'}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email app');
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert('Error', 'Failed to open email app');
    }
  };

  const handlePhonePress = async () => {
    const url = `tel:${SUPPORT_CONTACT.phone}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to make phone call');
      }
    } catch (error) {
      console.error('Error opening phone:', error);
      Alert.alert('Error', 'Failed to make phone call');
    }
  };

  const handleWhatsAppPress = async () => {
    const message = `Hi, I need help with my Vedida Farms order.\n\nApp Version: ${appVersion}`;
    const url = `whatsapp://send?phone=${SUPPORT_CONTACT.whatsapp}&text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to use this feature or contact us via email/phone.'
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View> */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>❓</Text>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Our support team is here to assist you
          </Text>
        </View>

        {/* Contact Methods */}
        <View style={styles.section}>
          {/* <Text style={styles.sectionTitle}>📞 Contact Us</Text> */}

          {/* WhatsApp */}
          <TouchableOpacity
            style={[styles.contactCard, styles.whatsappCard]}
            onPress={handleWhatsAppPress}
          >
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>💬</Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactTitle}>WhatsApp Support</Text>
              <Text style={styles.contactSubtitle}>
                Chat with us instantly
              </Text>
              <Text style={styles.contactValue}>{SUPPORT_CONTACT.phoneDisplay}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Phone */}
          <TouchableOpacity
            style={[styles.contactCard, styles.phoneCard]}
            onPress={handlePhonePress}
          >
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📞</Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactSubtitle}>
                Speak with our support team
              </Text>
              <Text style={styles.contactValue}>{SUPPORT_CONTACT.phoneDisplay}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Email */}
          <TouchableOpacity
            style={[styles.contactCard, styles.emailCard]}
            onPress={handleEmailPress}
          >
            <View style={styles.contactIconContainer}>
              <Text style={styles.contactIcon}>📧</Text>
            </View>
            <View style={styles.contactDetails}>
              <Text style={styles.contactTitle}>Email Us</Text>
              <Text style={styles.contactSubtitle}>
                We'll respond within 24 hours
              </Text>
              <Text style={styles.contactValue}>{SUPPORT_CONTACT.email}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕒 Working Hours</Text>
          <View style={styles.hoursCard}>
            <Text style={styles.hoursText}>{SUPPORT_CONTACT.workingHours}</Text>
            <Text style={styles.hoursSubtext}>
              We're available to help you during these hours
            </Text>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Common Questions</Text>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>How do I track my order?</Text>
            <Text style={styles.faqAnswer}>
              Go to Profile → Order History to view all your orders and their status.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>Can I modify my subscription?</Text>
            <Text style={styles.faqAnswer}>
              Yes! Go to Subscriptions → Select your subscription → You can pause, resume anytime.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>What are the delivery timings?</Text>
            <Text style={styles.faqAnswer}>
              We deliver fresh products daily between 6 AM to 8 AM at your doorstep.
            </Text>
          </View>

          <View style={styles.faqCard}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              Currently we accept Cash on Delivery (COD). Online payment options coming soon!
            </Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About Vedida Farms</Text>
          <View style={styles.aboutCard}>
            {/* <Text style={styles.aboutIcon}>🥛</Text> */}
            <Text style={styles.aboutText}>
              We deliver farm-fresh dairy products to your doorstep every day.
              Quality and hygiene are our top priorities.
            </Text>
            <View style={styles.versionContainer}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Version:</Text>
                <Text style={styles.versionValue}>{appVersion}</Text>
              </View>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Build:</Text>
                <Text style={styles.versionValue}>{buildNumber}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    color: '#4CAF50',
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
  heroSection: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  heroIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  whatsappCard: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  phoneCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  emailCard: {
    backgroundColor: '#fff3e0',
    borderColor: '#FF9800',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactIcon: {
    fontSize: 28,
  },
  contactDetails: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  hoursCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  hoursSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  faqCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  aboutCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 20,
  },
  versionContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  versionLabel: {
    fontSize: 13,
    color: '#666',
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bottomSpacer: {
    height: 40,
  },
});