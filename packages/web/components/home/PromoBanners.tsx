// packages/web/components/home/PromoBanners.tsx
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

export default function PromoBanners() {
  const router = useRouter();
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
      const data = await getActiveBanners(BannerPlatform.WEB, BannerPosition.HOME_PROMO);
      setBanners(data);
      console.log('✅ Loaded web promo banners:', data.length);
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-gray-100 animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (banners.length === 0) {
    return null; // Don't show section if no promo banners
  }

  return (
    <div className={`grid grid-cols-1 gap-6 ${
      banners.length === 1 ? 'md:grid-cols-1' :
      banners.length === 2 ? 'md:grid-cols-2' :
      'md:grid-cols-2 lg:grid-cols-3'
    }`}>
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
          onClick={() => handleBannerClick(banner)}
        >
          {/* Banner Image */}
          <div className="relative h-64 overflow-hidden group">
            <Image
              src={banner.imageUrl}
              alt={banner.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {/* <h3 className="text-xl font-bold mb-2 drop-shadow-lg">
              {banner.title}
            </h3>
            
            {banner.description && (
              <p className="text-sm mb-4 drop-shadow-md opacity-90 line-clamp-2">
                {banner.description}
              </p>
            )} */}

            {/* {banner.actionType !== BannerActionType.NONE && (
              <button
                className="bg-white text-primary-600 hover:bg-primary-50 px-5 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg inline-flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBannerClick(banner);
                }}
              >
                <span>{banner.actionText || 'Learn More'}</span>
                <span>→</span>
              </button>
            )} */}
          </div>

          {/* Hover Effect Indicator */}
          {/* <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
              Click to explore
            </div>
          </div> */}
        </div>
      ))}
    </div>
  );
}