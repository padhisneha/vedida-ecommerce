// packages/web/components/delivery/DeliverySheetPDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Order } from '@ecommerce/shared';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#228B22',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 3,
  },
  companyTagline: {
    fontSize: 8,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 3,
  },
  headerInfo: {
    fontSize: 9,
    color: '#333',
    marginBottom: 2,
  },
  headerInfoBold: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#228B22',
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 8,
    marginBottom: 12,
    borderRadius: 3,
  },
  summaryItem: {
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: 7,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#228B22',
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#228B22',
    padding: 6,
    color: 'white',
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 6,
    fontSize: 8,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 6,
    fontSize: 8,
    backgroundColor: '#f9f9f9',
  },
  colSNo: {
    width: '5%',
  },
  colOrderNo: {
    width: '15%',
  },
  colAddress: {
    width: '25%',
  },
  colItems: {
    width: '30%',
  },
  colAmount: {
    width: '15%',
    textAlign: 'right',
  },
  colPayment: {
    width: '10%',
    textAlign: 'center',
  },
  itemsList: {
    fontSize: 7,
    lineHeight: 1.3,
  },
  codBadge: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  addressCompact: {
    fontSize: 7,
    lineHeight: 1.3,
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 7,
    color: '#999',
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
  const formatted = amount.toFixed(0);
  const lastThree = formatted.substring(formatted.length - 3);
  const otherNumbers = formatted.substring(0, formatted.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return `Rs ${formattedInteger}`;
};

const DeliverySheetPDF: React.FC<DeliverySheetPDFProps> = ({ 
  orders, 
  deliveryDate, 
  deliveryPartner,
  deliveryArea,
  deliverySlot,
}) => {
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const codOrders = orders.filter(o => o.paymentMethod === 'cod');
  const codCount = codOrders.length;
  const codAmount = codOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const paidCount = orders.filter(o => o.paymentStatus === 'paid').length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>DELIVERY SHEET</Text>
             <Text style={styles.companyName}>Vedida Farms</Text>
            {/* <Text style={styles.companyTagline}>Fresh Dairy Products Delivered Daily</Text> */}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerInfo}>
              <Text style={styles.headerInfoBold}>Date: </Text>
              {deliveryDate}
            </Text>

            {deliveryPartner && (
              <Text style={styles.headerInfo}>
                <Text style={styles.headerInfoBold}>Delivery Partner: </Text>
                {deliveryPartner}
              </Text>
            )}
            {deliverySlot && deliverySlot !== 'all' && (
              <Text style={styles.headerInfo}>
                <Text style={styles.headerInfoBold}>Slot: </Text>
                {deliverySlot === 'morning' ? 'Morning (6 AM - 12 PM)' :
                 deliverySlot === 'evening' ? 'Evening (4 PM - 8 PM)' :
                 'Flexible'}
              </Text>
            )}
            {/* <Text style={styles.headerInfo}>
              <Text style={styles.headerInfoBold}>Total Orders: </Text>
              {totalOrders}
            </Text> */}
          </View>
        </View>

        {/* Summary Stats Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPDF(totalAmount)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>COD ORDERS</Text>
            <Text style={styles.summaryValue}>{codCount} ({formatCurrencyPDF(codAmount)})</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>PAID ORDERS</Text>
            <Text style={styles.summaryValue}>{paidCount}</Text>
          </View>
          {deliveryArea && deliveryArea !== 'all' && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>AREA</Text>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#228B22' }}>
                {deliveryArea}
              </Text>
            </View>
          )}
        </View>

        {/* Orders Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colSNo}>S.No</Text>
            <Text style={styles.colOrderNo}>Order #</Text>
            <Text style={styles.colAddress}>Delivery Address</Text>
            <Text style={styles.colItems}>Items</Text>
            <Text style={styles.colAmount}>Amount</Text>
            <Text style={styles.colPayment}>COD</Text>
          </View>

          {/* Table Rows */}
          {orders.map((order, index) => {
            const isCOD = order.paymentMethod === 'cod';
            
            return (
              <View key={order.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                {/* S.No */}
                <Text style={styles.colSNo}>{index + 1}</Text>
                
                {/* Order Number */}
                <View style={styles.colOrderNo}>
                  <Text style={{ fontWeight: 'bold' }}>{order.orderNumber}</Text>
                  {/* {order.deliverySlot && order.deliverySlot !== 'flexible' && (
                    <Text style={{ fontSize: 6, color: '#666', marginTop: 1 }}>
                      {order.deliverySlot === 'morning' ? ' M' : ' E'}
                    </Text>
                  )} */}
                </View>
                
                {/* Delivery Address */}
                <View style={styles.colAddress}>
                  {!deliveryArea && (
                  <Text style={styles.addressCompact}>
                    {order.deliveryAddress.location}
                  </Text>
                  )}
                  <Text style={styles.addressCompact}>
                    {order.deliveryAddress.apartment && `${order.deliveryAddress.apartment}, `}
                    {order.deliveryAddress.street}
                  </Text>
                  <Text style={styles.addressCompact}>
                    {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
                  </Text>
                  {order.deliveryAddress.landmark && (
                    <Text style={{ fontSize: 6, color: '#999', marginTop: 1 }}>
                      📍 {order.deliveryAddress.landmark}
                    </Text>
                  )}
                </View>
                
                {/* Items */}
                <View style={styles.colItems}>
                  {order.items.map((item, itemIndex) => (
                    <Text key={itemIndex} style={styles.itemsList}>
                      • {item.product?.name || 'Product'} ({item.product?.quantity} {item.product?.unit}) × {item.quantity}
                    </Text>
                  ))}
                </View>
                
                {/* Amount */}
                <Text style={[styles.colAmount, { fontWeight: 'bold' }]}>
                  {formatCurrencyPDF(order.totalAmount)}
                </Text>
                
                {/* COD Tag */}
                <Text style={styles.colPayment}>
                  {isCOD && (
                    <Text style={styles.codBadge}>COD</Text>
                  )}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer Totals */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingRight: 6,
          paddingTop: 8,
          borderTopWidth: 2,
          borderTopColor: '#228B22',
        }}>
          <View style={{ width: '15%', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#228B22' }}>
              TOTAL: {formatCurrencyPDF(totalAmount)}
            </Text>
            <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>
              COD to collect: {formatCurrencyPDF(codAmount)}
            </Text>
          </View>
        </View>

        {/* Page Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={{ marginTop: 3 }}>
            Vedida Farms • contact@vedidafarms.com
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default DeliverySheetPDF;