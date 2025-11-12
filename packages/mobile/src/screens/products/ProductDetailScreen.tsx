import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Product,
  getProductById,
  formatCurrency,
  addToCart,
  useAuthStore,
  useCartStore,
  getCartWithProducts,
} from '@ecommerce/shared';

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuthStore();
  const { setCart } = useCartStore();

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const data = await getProductById(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login to add items to cart');
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(user.id, productId, quantity);
      
      // Refresh cart
      const updatedCart = await getCartWithProducts(user.id);
      setCart(updatedCart);

      Alert.alert(
        '✅ Added to Cart',
        `${quantity} × ${product?.name} added to your cart successfully!`
      );
      
      // Reset quantity to 1
      setQuantity(1);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderEmoji}>📦</Text>
            </View>
          )}
        </View>

        {/* Product Info Container */}
        <View style={styles.contentContainer}>
          {/* Header Row: Name and Quantity Selector */}
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              {!product.inStock && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
            </View>

            {/* Quantity Selector - Top Right */}
            <View style={styles.quantitySelectorTop}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category */}
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            <Text style={styles.unit}>
              per {product.quantity} {product.unit}
            </Text>
          </View>

          {/* Tax Information */}
          {(product.taxCGST > 0 || product.taxSGST > 0) && (
            <View style={styles.taxInfo}>
              <Text style={styles.taxInfoText}>
                (Inclusive of {product.taxCGST + product.taxSGST}% GST)
              </Text>
            </View>
          )}

          {/* Subscription Badge */}
          {product.allowSubscription && (
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionText}>
                📅 Available for subscription
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description - Moved to bottom */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>About this product</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <View>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerQuantity}>{quantity} item(s)</Text>
          </View>
          <Text style={styles.footerPrice}>
            {formatCurrency(product.price * quantity)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (!product.inStock || addingToCart) && styles.buttonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={!product.inStock || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addToCartText}>
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 80,
  },
  contentContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  outOfStockBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  outOfStockText: {
    color: '#c62828',
    fontSize: 12,
    fontWeight: '600',
  },
  quantitySelectorTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: '600',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  category: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  unit: {
    fontSize: 14,
    color: '#999',
  },
  taxInfo: {
    marginBottom: 16,
  },
  taxInfoText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  subscriptionBadge: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  subscriptionText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  footerQuantity: {
    fontSize: 12,
    color: '#999',
  },
  footerPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addToCartButton: {
    backgroundColor: '#4CAF50',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
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
});
