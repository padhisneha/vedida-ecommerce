// packages/web/components/delivery/DeliverySheetPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Order } from '@ecommerce/shared';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#228B22',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 15,
    borderRadius: 4,
  },
  metaItem: {
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#228B22',
  },
  orderCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#fff',
  },
  orderCardAlt: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  amountBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#228B22',
  },
  customerSection: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  contactInfo: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  addressSection: {
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 3,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 3,
  },
  addressText: {
    fontSize: 9,
    color: '#333',
    lineHeight: 1.4,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemsHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#228B22',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemName: {
    fontSize: 9,
    width: '60%',
  },
  itemQty: {
    fontSize: 9,
    width: '20%',
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 9,
    width: '20%',
    textAlign: 'right',
  },
  signatureSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
    marginBottom: 20,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 3,
  },
  signatureText: {
    fontSize: 8,
    color: '#666',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
  },
});

interface DeliverySheetPDFProps {
  orders: Order[];
  deliveryDate: string;
  deliveryPartner?: string;
  deliveryArea?: string;
  deliverySlot?: string;
}

const formatCurrencyPDF = (amount: number): string => {
  const formatted = amount.toFixed(2);
  const [integer, decimal] = formatted.split('.');
  const lastThree = integer.substring(integer.length - 3);
  const otherNumbers = integer.substring(0, integer.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return `₹${formattedInteger}.${decimal}`;
};

export const DeliverySheetPDF1: React.FC<DeliverySheetPDFProps> = ({ 
  orders, 
  deliveryDate, 
  deliveryPartner,
  deliveryArea,
  deliverySlot,
}) => {
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const codOrders = orders.filter(o => o.paymentMethod === 'cod').length;
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid').length;
  const codAmount = orders
    .filter(o => o.paymentMethod === 'cod')
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>DELIVERY SHEET</Text>
          <Text style={styles.subtitle}>Vedida Farms - Fresh Dairy Products</Text>
        </View>

        {/* Meta Information */}
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DELIVERY DATE</Text>
            <Text style={styles.metaValue}>{deliveryDate}</Text>
          </View>
          {deliveryPartner && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DELIVERY PARTNER</Text>
              <Text style={styles.metaValue}>{deliveryPartner}</Text>
            </View>
          )}
          {deliveryArea && deliveryArea !== 'all' && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DELIVERY AREA</Text>
              <Text style={styles.metaValue}>{deliveryArea}</Text>
            </View>
          )}
          {deliverySlot && deliverySlot !== 'all' && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>DELIVERY SLOT</Text>
              <Text style={styles.metaValue}>
                {deliverySlot === 'morning' ? '🌅 Morning (6 AM - 12 PM)' :
                 deliverySlot === 'evening' ? '🌆 Evening (4 PM - 8 PM)' :
                 'Flexible'}
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TOTAL ORDERS</Text>
            <Text style={styles.metaValue}>{totalOrders}</Text>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          backgroundColor: '#E8F5E9',
          padding: 10,
          marginBottom: 15,
          borderRadius: 4,
        }}>
          <View>
            <Text style={{ fontSize: 9, color: '#666' }}>Total Amount</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#228B22' }}>
              {formatCurrencyPDF(totalAmount)}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: '#666' }}>COD Orders</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FF8C00' }}>
              {codOrders} ({formatCurrencyPDF(codAmount)})
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 9, color: '#666' }}>Paid Orders</Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#228B22' }}>
              {paidOrders}
            </Text>
          </View>
        </View>

        {/* Orders List */}
        {orders.map((order, index) => (
          <View key={order.id} style={index % 2 === 0 ? styles.orderCard : styles.orderCardAlt}>
            {/* Order Header */}
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumber}>#{index + 1}. {order.orderNumber}</Text>
                <Text style={{ fontSize: 8, color: '#999', marginTop: 2 }}>
                  {order.deliverySlotLabel || 'No slot specified'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountBadge}>{formatCurrencyPDF(order.totalAmount)}</Text>
                <Text style={{ 
                  fontSize: 8, 
                  color: order.paymentMethod === 'cod' ? '#FF8C00' : '#228B22',
                  fontWeight: 'bold',
                  marginTop: 2,
                }}>
                  {order.paymentMethod === 'cod' ? '💵 COD' : 
                   order.paymentMethod === 'upi' ? '📱 UPI' : '💳 PAID'}
                </Text>
              </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerSection}>
              <Text style={styles.customerName}>
                {order.deliveryAddress.label}
              </Text>
              <Text style={styles.contactInfo}>
                📱 Contact: {/* You'll need to get customer phone from userId */}
                {order.userId.slice(0, 8)}... {/* Show customer ID or fetch phone */}
              </Text>
            </View>

            {/* Delivery Address */}
            <View style={styles.addressSection}>
              <Text style={styles.addressLabel}>DELIVERY ADDRESS:</Text>
              <Text style={styles.addressText}>
                {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                {order.deliveryAddress.street}
              </Text>
              <Text style={styles.addressText}>
                {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
              </Text>
              {order.deliveryAddress.landmark && (
                <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
                  📍 {order.deliveryAddress.landmark}
                </Text>
              )}
            </View>

            {/* Order Items */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsHeader}>ITEMS:</Text>
              {order.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.product?.name || 'Product'}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrencyPDF(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Signature Section */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Customer Signature:</Text>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureText}>_____________________</Text>
                </View>
              </View>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Delivery Partner:</Text>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureText}>_____________________</Text>
                </View>
              </View>
            </View>

            {/* Delivery Notes */}
            {order.deliveryNotes && (
              <View style={{ 
                marginTop: 8, 
                padding: 6, 
                backgroundColor: '#FFF9C4',
                borderRadius: 3,
              }}>
                <Text style={{ fontSize: 8, color: '#666', marginBottom: 2 }}>
                  📝 DELIVERY NOTES:
                </Text>
                <Text style={{ fontSize: 8, color: '#333' }}>
                  {order.deliveryNotes}
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.pageFooter}>
          <Text>
            Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
          </Text>
          <Text style={{ marginTop: 3 }}>
            Vedida Farms • Fresh Dairy Delivered Daily
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default DeliverySheetPDF1;