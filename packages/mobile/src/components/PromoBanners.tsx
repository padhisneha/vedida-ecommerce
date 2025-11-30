// packages/mobile/src/components/PromoBanners.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import {
  getActiveBanners,
  recordBannerImpression,
  recordBannerClick,
  Banner,
  BannerPlatform,
  BannerPosition,
  BannerActionType,
} from '@ecommerce/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 cards with spacing

interface PromoBannersProps {
  navigation: any;
}

export const PromoBanners: React.FC<PromoBannersProps> = ({ navigation }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    // Record impressions for all visible promo banners
    if (banners.length > 0) {
      banners.forEach((banner) => {
        recordBannerImpression(banner.id).catch(console.error);
      });
    }
  }, [banners]);

  const loadBanners = async () => {
    try {
      const data = await getActiveBanners(BannerPlatform.MOBILE, BannerPosition.HOME_PROMO);
      setBanners(data);
      console.log('✅ Loaded mobile promo banners:', data.length);
    } catch (error) {
      console.error('Error loading promo banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = async (banner: Banner) => {
    // Record click
    try {
      await recordBannerClick(banner.id);
    } catch (error) {
      console.error('Error recording click:', error);
    }

    // Handle navigation
    switch (banner.actionType) {
      case BannerActionType.CATEGORY:
        navigation.navigate('HomeTab', {
          screen: 'HomeMain',
          params: { category: banner.actionValue },
        });
        break;

      case BannerActionType.PRODUCT:
        navigation.navigate('ProductDetail', {
          productId: banner.actionValue,
        });
        break;

      case BannerActionType.SUBSCRIPTIONS:
        navigation.navigate('SubscriptionsTab');
        break;

      case BannerActionType.OFFERS:
        navigation.navigate('Offers');
        break;

      case BannerActionType.EXTERNAL:
        if (banner.actionValue) {
          Linking.openURL(banner.actionValue).catch((err) =>
            console.error('Error opening URL:', err)
          );
        }
        break;

      default:
        // No action
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingGrid}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.loadingCard} />
          ))}
        </View>
      </View>
    );
  }

  if (banners.length === 0) {
    return null; // Don't show section if no promo banners
  }

  // Display layout based on number of banners
  const isGrid = banners.length > 1;

  return (
    <View style={styles.container}>
      {isGrid ? (
        // Grid Layout (2 columns)
        <View style={styles.grid}>
          {banners.map((banner) => (
            <TouchableOpacity
              key={banner.id}
              style={styles.gridCard}
              activeOpacity={0.9}
              onPress={() => handleBannerClick(banner)}
            >
              <Image
                source={{ uri: banner.imageUrl }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              
              {/* Gradient Overlay */}
              <View style={styles.gridGradient} />

              {/* Content */}
              <View style={styles.gridContent}>
                <Text style={styles.gridTitle} numberOfLines={2}>
                  {banner.title}
                </Text>
                
                {banner.actionType !== BannerActionType.NONE && (
                  <View style={styles.gridButton}>
                    <Text style={styles.gridButtonText}>
                      {banner.actionText || 'View'} →
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        // Single Large Card
        <TouchableOpacity
          style={styles.singleCard}
          activeOpacity={0.9}
          onPress={() => handleBannerClick(banners[0])}
        >
          <Image
            source={{ uri: banners[0].imageUrl }}
            style={styles.singleImage}
            resizeMode="cover"
          />
          
          <View style={styles.singleGradient} />

          <View style={styles.singleContent}>
            <Text style={styles.singleTitle}>
              {banners[0].title}
            </Text>
            
            {banners[0].description && (
              <Text style={styles.singleDescription} numberOfLines={2}>
                {banners[0].description}
              </Text>
            )}

            {banners[0].actionType !== BannerActionType.NONE && (
              <View style={styles.singleButton}>
                <Text style={styles.singleButtonText}>
                  {banners[0].actionText || 'Explore'} →
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  loadingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingCard: {
    flex: 1,
    height: 180,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  
  // Grid Layout (Multiple Cards)
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  gridContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gridButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },

  // Single Large Card
  singleCard: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  singleGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  singleContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  singleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  singleDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  singleButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  singleButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
});