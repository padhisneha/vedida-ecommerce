// packages/web/components/home/BannerCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveBanners,
  recordBannerImpression,
  recordBannerClick,
  Banner,
  BannerPlatform,
  BannerPosition,
  BannerActionType,
} from '@ecommerce/shared';
import Image from 'next/image';

export default function BannerCarousel() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    // Record impression for current banner
    const currentBanner = banners[currentIndex];
    if (currentBanner) {
      recordBannerImpression(currentBanner.id).catch(console.error);
    }

    // Auto-rotate carousel every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, banners]);

  const loadBanners = async () => {
    try {
      const data = await getActiveBanners(BannerPlatform.WEB, BannerPosition.HOME_HERO);
      setBanners(data);
      console.log('✅ Loaded web hero banners:', data.length);
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

    // Handle navigation based on action type
    switch (banner.actionType) {
      case BannerActionType.CATEGORY:
        router.push(`/products?category=${banner.actionValue}`);
        break;
      
      case BannerActionType.PRODUCT:
        router.push(`/products/${banner.actionValue}`);
        break;
      
      case BannerActionType.SUBSCRIPTIONS:
        router.push('/subscriptions');
        break;
      
      case BannerActionType.OFFERS:
        router.push('/offers');
        break;

      case BannerActionType.INTERNAL:
        if (banner.actionValue) {
          window.location.href = banner.actionValue;
        }
        break;
      
      case BannerActionType.EXTERNAL:
        if (banner.actionValue) {
          window.open(banner.actionValue, '_blank', 'noopener,noreferrer');
        }
        break;
      
      default:
        // No action
        break;
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 animate-pulse rounded-xl" />
    );
  }

  if (banners.length === 0) {
    return null; // Don't show anything if no banners
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full h-96 rounded-xl overflow-hidden group">
      {/* Banner Image */}
      <div className="relative w-full h-full">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="relative w-full h-full">
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className="object-cover"
                priority={index === 0}   // only first banner is high priority
              />
            </div>
            
            {/* Gradient Overlay for Better Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
        {/* <h2 className="text-4xl font-bold mb-3 drop-shadow-lg">
          {currentBanner.title}
        </h2>
        
        {currentBanner.description && (
          <p className="text-lg mb-4 drop-shadow-md max-w-2xl">
            {currentBanner.description}
          </p>
        )} */}

        {currentBanner.actionType !== BannerActionType.NONE && (
          <button
            onClick={() => handleBannerClick(currentBanner)}
            className="bg-white text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg"
          >
            {currentBanner.actionText || 'Learn More'} →
          </button>
        )}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            ‹
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            ›
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}