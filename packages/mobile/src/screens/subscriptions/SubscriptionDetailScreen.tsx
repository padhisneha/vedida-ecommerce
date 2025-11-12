import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import {
    getSubscriptionById,
    getSubscriptionWithProducts,
    updateSubscriptionStatus,
    Subscription,
    SubscriptionStatus,
    SubscriptionFrequency,
    formatCurrency,
    formatDate,
} from '@ecommerce/shared';
import DateTimePicker from '@react-native-community/datetimepicker';

export const SubscriptionDetailScreen = ({ route, navigation }: any) => {
    const { subscriptionId } = route.params;
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadSubscription();
    }, [subscriptionId]);

    const loadSubscription = async () => {
        try {
            const data = await getSubscriptionWithProducts(subscriptionId);
            setSubscription(data);
        } catch (error) {
            console.error('Error loading subscription:', error);
            Alert.alert('Error', 'Failed to load subscription details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: SubscriptionStatus) => {
        switch (status) {
            case SubscriptionStatus.ACTIVE:
            return '#4CAF50';
            case SubscriptionStatus.PAUSED:
            return '#FF9800';
            case SubscriptionStatus.COMPLETED:
            return '#2196F3';
            case SubscriptionStatus.CANCELLED:
            return '#f44336';
            default:
            return '#999';
        }
    };

    const getStatusText = (status: SubscriptionStatus) => {
        switch (status) {
            case SubscriptionStatus.ACTIVE:
            return 'Active';
            case SubscriptionStatus.PAUSED:
            return 'Paused';
            case SubscriptionStatus.COMPLETED:
            return 'Completed';
            case SubscriptionStatus.CANCELLED:
            return 'Cancelled';
            default:
            return status;
        }
    };

    const getStatusIcon = (status: SubscriptionStatus) => {
        switch (status) {
            case SubscriptionStatus.ACTIVE:
            return '✅';
            case SubscriptionStatus.PAUSED:
            return '⏸️';
            case SubscriptionStatus.COMPLETED:
            return '🎉';
            case SubscriptionStatus.CANCELLED:
            return '❌';
            default:
            return '📋';
        }
    };

    const getFrequencyText = (frequency: SubscriptionFrequency) => {
        switch (frequency) {
            case SubscriptionFrequency.DAILY:
                return 'Daily';
            case SubscriptionFrequency.ALTERNATE_DAYS:
                return 'Alternate Days';
            case SubscriptionFrequency.WEEKLY:
                return 'Weekly';
            default:
                return frequency;
        }
    };

    const handlePauseSubscription = () => {
        navigation.navigate('PauseSubscription', {
            subscriptionId: subscription?.id,
        });
    };

    const pauseSubscription = async (days: number) => {
        setActionLoading(true);
        try {
            const pauseUntil = new Date();
            pauseUntil.setDate(pauseUntil.getDate() + days);

            await updateSubscriptionStatus(
                subscriptionId,
                SubscriptionStatus.PAUSED,
                pauseUntil
            );

            Alert.alert('Success', `Subscription paused for ${days} days`);
            await loadSubscription();
        } catch (error) {
            console.error('Error pausing subscription:', error);
            Alert.alert('Error', 'Failed to pause subscription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResumeSubscription = async () => {
        Alert.alert(
            'Resume Subscription',
            'Are you sure you want to resume this subscription?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Resume',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await updateSubscriptionStatus(subscriptionId, SubscriptionStatus.ACTIVE);
                            Alert.alert('Success', 'Subscription resumed successfully');
                            //await loadSubscription();
                            navigation.navigate('SubscriptionsTab', { screen: 'SubscriptionsList'})
                        } catch (error) {
                            console.error('Error resuming subscription:', error);
                            Alert.alert('Error', 'Failed to resume subscription');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancelSubscription = async () => {
        Alert.alert(
            'Cancel Subscription',
            'Are you sure you want to cancel this subscription? This action cannot be undone.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await updateSubscriptionStatus(
                                subscriptionId,
                                SubscriptionStatus.CANCELLED
                            );
                            Alert.alert('Success', 'Subscription cancelled');
                            await loadSubscription();
                        } catch (error) {
                            console.error('Error cancelling subscription:', error);
                            Alert.alert('Error', 'Failed to cancel subscription');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    if (!subscription) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorEmoji}>😕</Text>
                <Text style={styles.errorTitle}>Subscription Not Found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusColor = getStatusColor(subscription.status);
    const statusIcon = getStatusIcon(subscription.status);

    return (
        <View style={styles.container}>
            {/* Header */}
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backIcon}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Subscription Details</Text>
                <View style={styles.placeholder} />
            </View> */}

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    {/* <Text style={styles.statusIcon}>{statusIcon}</Text> */}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{getStatusText(subscription.status)}</Text>
                    </View>
                    <Text style={styles.subscriptionId}>#{subscription.id.slice(0, 8)}</Text>
                    <Text style={styles.frequency}>{getFrequencyText(subscription.frequency)}</Text>
                </View>

                {/* Subscription Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Subscription Information</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Frequency</Text>
                            <Text style={styles.infoValue}>
                                {getFrequencyText(subscription.frequency)}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Start Date</Text>
                            <Text style={styles.infoValue}>
                                {formatDate(subscription.startDate)}
                            </Text>
                        </View>
                        {subscription.endDate && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>End Date</Text>
                                <Text style={styles.infoValue}>
                                    {formatDate(subscription.endDate)}
                                </Text>
                            </View>
                        )}
                        {subscription.pausedUntil && subscription.status === SubscriptionStatus.PAUSED && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Paused Until</Text>
                                <Text style={[styles.infoValue, { color: '#FF9800' }]}>
                                    {formatDate(subscription.pausedUntil)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={[styles.infoValue, { color: statusColor }]}>
                                {getStatusText(subscription.status)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Subscription Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📦 Items ({subscription.items.length})</Text>
                    {subscription.items.map((item, index) => (
                        <View key={index} style={styles.itemCard}>
                            <View style={styles.itemPlaceholder}>
                                <Text style={styles.itemPlaceholderText}>📦</Text>
                            </View>
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>
                                    {item.product?.name || 'Product'}
                                </Text>
                                <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                                {item.product && (
                                    <Text style={styles.itemPrice}>
                                        {formatCurrency(item.product.price)} × {item.quantity} ={' '}
                                        {formatCurrency(item.product.price * item.quantity)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
                    <View style={styles.addressCard}>
                        <Text style={styles.addressLabel}>{subscription.deliveryAddress.label}</Text>
                        <Text style={styles.addressText}>
                            {subscription.deliveryAddress.apartment &&
                                `${subscription.deliveryAddress.apartment}, `}
                            {subscription.deliveryAddress.street}
                        </Text>
                        <Text style={styles.addressText}>
                            {subscription.deliveryAddress.city}, {subscription.deliveryAddress.state} -{' '}
                            {subscription.deliveryAddress.pincode}
                        </Text>
                        {subscription.deliveryAddress.landmark && (
                            <Text style={styles.landmarkText}>
                                📍 {subscription.deliveryAddress.landmark}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                {subscription.status !== SubscriptionStatus.CANCELLED && 
                subscription.status !== SubscriptionStatus.COMPLETED && (
                <View style={styles.section}>
                    {/* <Text style={styles.sectionTitle}>⚙️ Actions</Text> */}
                    <View style={styles.actionsContainer}>
                    {subscription.status === SubscriptionStatus.ACTIVE && (
                        <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.pauseButton]}
                            onPress={handlePauseSubscription}
                            disabled={actionLoading}
                        >
                            <Text style={styles.pauseButtonText}>⏸️ Pause Subscription</Text>
                        </TouchableOpacity>
                        {/* <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancelSubscription}
                            disabled={actionLoading}
                        >
                            <Text style={styles.cancelButtonText}>❌ Cancel Subscription</Text>
                        </TouchableOpacity> */}
                        </>
                    )}

                    {subscription.status === SubscriptionStatus.PAUSED && (
                        <>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.resumeButton]}
                            onPress={handleResumeSubscription}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                            ) : (
                            <Text style={styles.resumeButtonText}>▶️ Resume Subscription</Text>
                            )}
                        </TouchableOpacity>
                        {/* <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={handleCancelSubscription}
                            disabled={actionLoading}
                        >
                            <Text style={styles.cancelButtonText}>❌ Cancel Subscription</Text>
                        </TouchableOpacity> */}
                        </>
                    )}
                    </View>
                </View>
                )}

                {/* Show info for completed/cancelled */}
                {subscription.status === SubscriptionStatus.COMPLETED && (
                <View style={styles.section}>
                    <View style={styles.completedCard}>
                    <Text style={styles.completedIcon}>🎉</Text>
                    <Text style={styles.completedTitle}>Subscription Completed</Text>
                    <Text style={styles.completedText}>
                        This subscription has ended as per the scheduled end date.
                    </Text>
                    </View>
                </View>
                )}

                {subscription.status === SubscriptionStatus.CANCELLED && (
                <View style={styles.section}>
                    <View style={styles.cancelledCard}>
                    <Text style={styles.cancelledIcon}>❌</Text>
                    <Text style={styles.cancelledTitle}>Subscription Cancelled</Text>
                    <Text style={styles.cancelledText}>
                        This subscription was cancelled and is no longer active.
                    </Text>
                    </View>
                </View>
                )}                

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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
    backIcon: {
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
    statusCard: {
        backgroundColor: '#fff',
        padding: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    statusIcon: {
        fontSize: 60,
        marginBottom: 16,
    },
    statusBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    subscriptionId: {
        fontSize: 16,
        color: '#999',
        marginBottom: 8,
    },
    frequency: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
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
    infoCard: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    itemCard: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        marginBottom: 12,
    },
    itemPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemPlaceholderText: {
        fontSize: 24,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    itemQuantity: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 12,
        color: '#999',
    },
    addressCard: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
    },
    addressNote: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    addressSubnote: {
        fontSize: 12,
        color: '#999',
    },
    actionsContainer: {
        gap: 12,
    },
    actionButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
    },
    pauseButton: {
        borderColor: '#FF9800',
        backgroundColor: '#fff',
    },
    pauseButtonText: {
        color: '#FF9800',
        fontSize: 16,
        fontWeight: '600',
    },
    resumeButton: {
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50',
    },
    resumeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        borderColor: '#f44336',
        backgroundColor: '#fff',
    },
    cancelButtonText: {
        color: '#f44336',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: 40,
    },
    errorEmoji: {
        fontSize: 80,
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    addressLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    addressText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    landmarkText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    datePickerContainer: {
        backgroundColor: '#f9f9f9',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    datePickerButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    datePickerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    completedCard: {
        backgroundColor: '#e3f2fd',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2196F3',
        alignItems: 'center',
    },
    completedIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    completedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1565C0',
        marginBottom: 8,
    },
    completedText: {
        fontSize: 14,
        color: '#1976D2',
        textAlign: 'center',
    },
    cancelledCard: {
        backgroundColor: '#ffebee',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f44336',
        alignItems: 'center',
    },
    cancelledIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    cancelledTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#c62828',
        marginBottom: 8,
    },
    cancelledText: {
        fontSize: 14,
        color: '#d32f2f',
        textAlign: 'center',
    },
});