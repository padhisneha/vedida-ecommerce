// packages/mobile/src/components/BannerCarousel.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
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
const BANNER_HEIGHT = 200;

interface BannerCarouselProps {
  navigation: any;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ navigation }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBanners();
    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    // Record impression for current banner
    const currentBanner = banners[currentIndex];
    if (currentBanner) {
      recordBannerImpression(currentBanner.id).catch(console.error);
    }

    // Auto-scroll every 4 seconds
    if (autoScrollTimer.current) {
      clearTimeout(autoScrollTimer.current);
    }

    autoScrollTimer.current = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
      setCurrentIndex(nextIndex);
      
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 4000);

    return () => {
      if (autoScrollTimer.current) {
        clearTimeout(autoScrollTimer.current);
      }
    };
  }, [currentIndex, banners]);

  const loadBanners = async () => {
    try {
      const data = await getActiveBanners(BannerPlatform.MOBILE, BannerPosition.HOME_HERO);
      setBanners(data);
      console.log('✅ Loaded mobile banners:', data.length);
    } catch (error) {
      console.error('Error loading banners:', error);
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

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderBanner = ({ item }: { item: Banner }) => (
    <View style={styles.bannerContainer}>
      <TouchableOpacity
        activeOpacity={item.actionType === BannerActionType.NONE ? 1 : 0.9}
        onPress={() => item.actionType !== BannerActionType.NONE && handleBannerClick(item)}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        
        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Content Overlay */}
        {/* <View style={styles.contentOverlay}>
          <Text style={styles.bannerTitle}>{item.title}</Text>
          
          {item.description && (
            <Text style={styles.bannerDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {item.actionType !== BannerActionType.NONE && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleBannerClick(item)}
            >
              <Text style={styles.actionButtonText}>
                {item.actionText || 'Explore'} →
              </Text>
            </TouchableOpacity>
          )}
        </View> */}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSkeleton} />
      </View>
    );
  }

  if (banners.length === 0) {
    return null; // Don't show anything if no banners
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderBanner}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    marginBottom: 16,
  },
  loadingSkeleton: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
  },
  bannerImage: {
    width: SCREEN_WIDTH - 32,
    height: BANNER_HEIGHT,
    borderRadius: 12,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: BANNER_HEIGHT * 0.6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    // Linear gradient effect using opacity
    opacity: 0.7,
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionButton: {
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
  actionButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: '#4CAF50',
  },
});