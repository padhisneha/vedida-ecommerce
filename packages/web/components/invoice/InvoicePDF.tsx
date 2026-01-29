// packages/web/components/invoice/InvoicePDF.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Order, Subscription } from '@ecommerce/shared';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#228B22',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'column',
    width: '60%',
  },
  headerRight: {
    width: '35%',
    alignItems: 'flex-end',
  },
  logo: {
    width: 70,
    height: 70,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 8,
    color: '#666',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  column: {
    flexDirection: 'column',
    width: '48%',
  },
  columnFull: {
    flexDirection: 'column',
    width: '100%',
  },
  detailLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 10,
    marginBottom: 8,
  },
  detailValueBold: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  statusDelivered: {
    color: '#228B22',
  },
  statusPending: {
    color: '#FF8C00',
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#228B22',
    padding: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
    padding: 10,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  tableColItem: {
    width: '45%',
  },
  tableColQty: {
    width: '15%',
    textAlign: 'center',
  },
  tableColPrice: {
    width: '20%',
    textAlign: 'right',
  },
  tableColAmount: {
    width: '20%',
    textAlign: 'right',
  },
  summaryContainer: {
    marginLeft: 'auto',
    width: '250px',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    fontSize: 9,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 8,
    borderTop: 2,
    borderTopColor: '#228B22',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  summaryValueGreen: {
    color: '#228B22',
    fontWeight: 'bold',
  },
  amountInWordsBox: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'solid',
  },
  amountInWordsLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  amountInWordsText: {
    fontSize: 9,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
    textAlign: 'center',
  },
  footerThankYou: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#228B22',
    marginBottom: 5,
  },
  footerContact: {
    fontSize: 9,
    color: '#666',
    marginBottom: 12,
  },
  footerTerms: {
    fontSize: 8,
    color: '#999',
  },
});

interface InvoicePDFProps {
  order?: Order;
  subscription?: Subscription;
  taxBreakdown: {
    subtotal: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  };
  amount: number;
  amountInWords: string;
  totalDeliveries: number;
}

const formatCurrencyPDF = (amount: number): string => {
  const formatted = amount.toFixed(2);
  const [integer, decimal] = formatted.split('.');
  const lastThree = integer.substring(integer.length - 3);
  const otherNumbers = integer.substring(0, integer.length - 3);
  const formattedInteger = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return `Rs. ${formattedInteger}.${decimal}`;
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatDateTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ order, subscription, taxBreakdown, amount, amountInWords, totalDeliveries }) => {
  // Determine which document we're working with
  const isOrder = !!order;
  const doc = order || subscription;
  
  if (!doc) return null;
  
  const documentNumber = isOrder ? order!.orderNumber : subscription!.subscriptionNumber;
  const documentTitle = 'TAX INVOICE';
  const items = isOrder ? order!.items : subscription!.items;
  const deliveryAddress = doc.deliveryAddress;
  const deliveryPartnerName = isOrder ? order!.deliveryPartnerName : subscription!.deliveryPartnerName;
  const status = doc.status;
  const paymentMethod = doc.paymentMethod || 'cod';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
      {/* Header - Logo Right, Company Info Left */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.companyName}>Vedida Farms</Text>
          <Text style={styles.companyTagline}>Fresh Dairy Products Delivered Daily</Text>
          <Text style={styles.companyContact}>www.vedidafarms.com | contact@vedidafarms.com</Text>
        </View>
        <View style={styles.headerRight}>
          <Image 
            style={styles.logo}
            src="/logo.png"
            alt="Vedida Farms Logo"
          />
        </View>
      </View>

      {/* Invoice Details and Bill To in one row */}
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.invoiceTitle}>{documentTitle}</Text>
          <View>
            <Text style={styles.detailValue}>
              <Text style={styles.detailLabel}>Invoice #: </Text>
              <Text style={{ fontWeight: 'bold' }}>{documentNumber}</Text>
            </Text>
            {isOrder && (
              <>
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Order Date: </Text>
                  {formatDate(order!.createdAt)}
                </Text>
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Delivery Date: </Text>
                  {formatDate(order!.scheduledDeliveryDate)}
                </Text>
              </>
            )}
            {!isOrder && subscription && (
              <>
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Start Date: </Text>
                  {formatDate(subscription.startDate)}
                </Text>
                {subscription.endDate && (
                  <Text style={styles.detailValue}>
                    <Text style={styles.detailLabel}>End Date: </Text>
                    {formatDate(subscription.endDate)}
                  </Text>
                )}
                <Text style={styles.detailValue}>
                  <Text style={styles.detailLabel}>Frequency: </Text>
                  {subscription.frequency === 'daily' ? 'Daily' : 
                   subscription.frequency === 'alternate_days' ? 'Alternate Days' : 
                   'Weekly'}
                </Text>
              </>
            )}
            <Text style={styles.detailValue}>
              <Text style={styles.detailLabel}>Payment: </Text>
              {paymentMethod === 'cod' ? 'Cash on Delivery' : 
               paymentMethod === 'online' ? 'Online Payment' : 
               'UPI Payment'}
            </Text>
          </View>
        </View>

        <View style={styles.column}>
          <Text style={styles.sectionTitle}>BILL TO:</Text>
          <Text style={styles.detailValueBold}>{deliveryAddress.label}</Text>
          <Text style={styles.detailValue}>
            {deliveryAddress.apartment && `${deliveryAddress.apartment}, `}
            {deliveryAddress.street}
          </Text>
          <Text style={styles.detailValue}>
            {deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}
          </Text>
          {deliveryAddress.landmark && (
            <Text style={{ fontSize: 9, color: '#666' }}>
              Landmark: {deliveryAddress.landmark}
            </Text>
          )}
        </View>
      </View>

      {/* Delivery Partner Info (if assigned) - Compact */}
      {deliveryPartnerName && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 9, color: '#666' }}>
            <Text style={{ fontWeight: 'bold' }}>Delivery Partner: </Text>
            {deliveryPartnerName}
            {isOrder && order!.deliveredAt && ` • ${formatDateTime(order!.deliveredAt)}`}
          </Text>
        </View>
      )}

      {/* Items Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableColItem}>Item</Text>
          <Text style={styles.tableColQty}>Qty</Text>
          <Text style={styles.tableColPrice}>Price</Text>
          <Text style={styles.tableColAmount}>Amount</Text>
        </View>

        {/* Table Rows */}
        {items.map((item, index) => {
          const itemData = isOrder 
            ? { name: item.product?.name || 'Product', qty: item.quantity, price: item.product?.price || 0 }
            : { name: item.product?.name || 'Product', qty: item.quantity, price: item.product?.price || 0 };
          
          return (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tableColItem}>{itemData.name}</Text>
              <Text style={styles.tableColQty}>{itemData.qty}</Text>
              <Text style={styles.tableColPrice}>{formatCurrencyPDF(itemData.price)}</Text>
              <Text style={styles.tableColAmount}>{formatCurrencyPDF(itemData.price * itemData.qty)}</Text>
            </View>
          );
        })}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal (excl. tax):</Text>
          <Text>{formatCurrencyPDF(taxBreakdown.subtotal)}</Text>
        </View>

        {taxBreakdown.cgst > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>CGST:</Text>
            <Text>{formatCurrencyPDF(taxBreakdown.cgst)}</Text>
          </View>
        )}

        {taxBreakdown.sgst > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SGST:</Text>
            <Text>{formatCurrencyPDF(taxBreakdown.sgst)}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Charges:</Text>
          <Text style={styles.summaryValueGreen}>FREE</Text>
        </View>

        {isOrder ? (
            <View style={styles.summaryRowTotal}>
              <Text>TOTAL AMOUNT:</Text>
              <Text style={styles.summaryValueGreen}>{formatCurrencyPDF(taxBreakdown.subtotal + taxBreakdown.totalTax)}</Text>
            </View>
        ) : (
            <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>AMOUNT (Per Delivery):</Text>
              <Text>{formatCurrencyPDF(taxBreakdown.subtotal + taxBreakdown.totalTax)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Deliveries:</Text>
              <Text>{totalDeliveries}</Text>
            </View>
            <View style={styles.summaryRowTotal}>
              <Text>Total AMOUNT:</Text>
              <Text style={styles.summaryValueGreen}>{formatCurrencyPDF(amount)}</Text>
            </View>
            </>
        )};

        
      </View>

      {/* Amount in Words */}
      <View style={styles.amountInWordsBox}>
        <Text style={styles.amountInWordsLabel}>Amount in Words:</Text>
        <Text style={styles.amountInWordsText}>{amountInWords}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerThankYou}>Thank you for choosing Vedida Farms!</Text>
        <Text style={styles.footerContact}>For any queries, contact us at support@vedidafarms.com</Text>
        {/* <Text style={styles.footerTerms}>Terms: Payment due on delivery. Goods once sold cannot be returned.</Text> */}
      </View>
    </Page>
  </Document>
)};