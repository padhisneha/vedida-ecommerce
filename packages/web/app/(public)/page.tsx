'use client';

import { useState, useEffect } from 'react';
import { initializeApp } from '@/lib/firebase';
import { getActiveOffers, getAllProducts, Offer, Product, getProductEmoji } from '@ecommerce/shared';
import { ShoppingBag, Smartphone, Mail } from 'lucide-react';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BannerCarousel from '@/components/home/BannerCarousel';
import PromoBanners from '@/components/home/PromoBanners';

type ModalType = 'about' | 'privacy' | 'refund' | null;

// Keep mock data as fallback
const mockOffers = [
  {
    id: '1',
    title: '✨ Welcome Offer - 20% OFF',
    description: 'Get 20% off on your first subscription',
    couponCode: 'VEDIDA20',
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    endDate: '2025-12-31',
  },
  {
    id: '2',
    title: '📦 Free Delivery',
    description: 'Zero delivery charges on all orders above ₹500',
    backgroundColor: '#DBEAFE',
    textColor: '#1E40AF',
  },
  {
    id: '3',
    title: '📅 Subscribe & Save',
    description: 'Save up to 15% with daily subscriptions',
    backgroundColor: '#D1FAE5',
    textColor: '#065F46',
  },
];

// Keep mock data as fallback
const mockProducts = [
  {
    id: '1',
    name: 'Fresh Cow Milk',
    description: 'Pure farm-fresh cow milk, delivered daily',
    price: 60,
    unit: 'liter',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    emoji: '🥛',
  },
  {
    id: '2',
    name: 'Pure Desi Ghee',
    description: 'Traditional A2 ghee made from cow milk',
    price: 550,
    unit: '500ml',
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
    emoji: '🧈',
  },
  {
    id: '3',
    name: 'Fresh Paneer',
    description: 'Soft cottage cheese, made fresh daily',
    price: 80,
    unit: '250g',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
    emoji: '🧀',
  },
  {
    id: '4',
    name: 'Fresh Curd',
    description: 'Thick and creamy homemade style curd',
    price: 40,
    unit: '500ml',
    image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
    emoji: '🥣',
  },
  {
    id: '5',
    name: 'Fresh Cow Milk',
    description: 'Pure farm-fresh cow milk, delivered daily',
    price: 60,
    unit: 'liter',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    emoji: '🥛',
  },
  {
    id: '6',
    name: 'Pure Desi Ghee',
    description: 'Traditional A2 ghee made from cow milk',
    price: 550,
    unit: '500ml',
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400',
    emoji: '🧈',
  },
  {
    id: '7',
    name: 'Fresh Paneer',
    description: 'Soft cottage cheese, made fresh daily',
    price: 80,
    unit: '250g',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
    emoji: '🧀',
  },
  {
    id: '8',
    name: 'Fresh Curd',
    description: 'Thick and creamy homemade style curd',
    price: 40,
    unit: '500ml',
    image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
    emoji: '🥣',
  },
];

const testimonials = [
  {
    id: '1',
    name: 'Priya Sharma',
    rating: 5,
    comment: 'Best quality milk! My family loves the freshness. Delivery is always on time.',
    location: 'Hyderabad',
  },
  {
    id: '2',
    name: 'Rajesh Kumar',
    rating: 5,
    comment: 'Excellent service and pure products. The subscription model is very convenient.',
    location: 'Hyderabad',
  },
  {
    id: '3',
    name: 'Anita Patel',
    rating: 5,
    comment: 'Farm fresh quality at my doorstep. The app makes ordering so easy!',
    location: 'Hyderabad',
  },
  {
    id: '4',
    name: 'Suresh Reddy',
    rating: 5,
    comment: 'The ghee is absolutely pure and aromatic. Reminds me of my grandmother\'s homemade ghee. Worth every penny!',
    location: 'Hyderabad',
  },
  {
    id: '5',
    name: 'Meera Iyer',
    rating: 5,
    comment: 'Switched to Vedida Farms 6 months ago and never looked back. The daily delivery is so reliable, and my kids love the fresh curd.',
    location: 'Hyderabad',
  },
  {
    id: '6',
    name: 'Amit Verma',
    rating: 5,
    comment: 'Finally found a dairy service I can trust! No more worrying about adulterated milk. The paneer is incredibly fresh.',
    location: 'Hyderabad',
  },
  {
    id: '7',
    name: 'Kavita Deshmukh',
    rating: 5,
    comment: 'The customer service is outstanding. Once I had an issue with delivery time, they resolved it immediately. Highly recommended!',
    location: 'Hyderabad',
  },
  {
    id: '8',
    name: 'Arjun Nair',
    rating: 4,
    comment: 'Great quality products and the subscription feature saves me time. Only wish they had more product variety.',
    location: 'Hyderabad',
  },
  {
    id: '9',
    name: 'Sneha Kapoor',
    rating: 5,
    comment: 'As a working mom, this service is a lifesaver! Fresh milk every morning without the hassle. The app is user-friendly too.',
    location: 'Hyderabad',
  },
  {
    id: '10',
    name: 'Vikram Singh',
    rating: 5,
    comment: 'Been using for over a year now. Consistent quality, punctual delivery, and fair pricing. What more can you ask for?',
    location: 'Hyderabad',
  },
];

const serviceAreas = [
  { city: 'Hyderabad', areas: ['Gachibowli', 'Madhapur', 'Banjara Hills', 'Jubilee Hills'] },
  { city: 'Bangalore', areas: ['Whitefield', 'Koramangala', 'HSR Layout', 'Indiranagar'] },
  { city: 'Chennai', areas: ['Anna Nagar', 'T Nagar', 'Velachery', 'Adyar'] },
];

export default function HomePage() {

  const [offers, setOffers] = useState<(Offer | any)[]>([]);
  const [products, setProducts] = useState<(Product | any)[]>([]);

  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0); 

  const [openModal, setOpenModal] = useState<ModalType>(null);

  // Initialize Firebase
  useEffect(() => {
    try {
      initializeApp();
      console.log('✅ Firebase initialized for public page');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }, []);

  // Load offers from database
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const data = await getActiveOffers();
        setOffers(data.length > 0 ? data : mockOffers); // Fallback to mock if no offers
        console.log('✅ Loaded offers:', data.length);
      } catch (error) {
        console.error('Error loading offers:', error);
        setOffers(mockOffers); // Fallback to mock on error
      } finally {
        setLoadingOffers(false);
      }
    };

    loadOffers();
  }, []);

  // Load products from database
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getAllProducts();
        setProducts(data.length > 0 ? data : mockProducts); // Fallback to mock
        console.log('✅ Loaded products:', data.length);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts(mockProducts); // Fallback to mock on error
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Auto-rotate offers
  useEffect(() => {
    if (offers.length === 0) return;
    const timer = setInterval(() => {
      setCurrentOfferIndex((prev) => (prev + 1) % offers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [offers.length]);

  // Auto-rotate testimonials every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format product for display
  const formatProductForDisplay = (product: any) => {
    // Check if it's a full Product type with category
    if ('category' in product && product.category) {
      return {
          id: product.id,
          name: product.name || 'Product',
          description: product.description || `Fresh ${product.name || 'dairy product'}`,
          price: product.price || 0,
          unit: `${product.quantity || ''} ${product.unit || ''}`.trim() || 'unit',
          emoji: getProductEmoji(product.category),
          imageUrl: product.imageUrl,
      };
    }
    // It's a mock product
    return {
        id: product.id,
        name: product.name || 'Product',
        description: product.description || `Fresh ${product.name || 'dairy product'}`,
        price: product.price || 0,
        unit: product.unit || 'unit',
        emoji: product.emoji || '📦',
        imageUrl: product.image,
    };
  };

  const currentOffer = offers[currentOfferIndex] || null;
  const currentTestimonial = testimonials[currentTestimonialIndex];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                <Image src="/logo.png" width={60} height={60} className="object-cover" alt="Logo" />
                </div>
              <div>
                <h1 className="text-xl font-bold text-green-700">Vedida Farms</h1>
                <p className="text-xs text-gray-600">Fresh Dairy Daily</p>
              </div>
            </div>
            <div className="flex items-center gap-4">

              <a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-gray-700 hover:text-green-600 font-medium text-sm sm:flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Products</span>
              </a>
              <a href="#download" onClick={(e) => { e.preventDefault(); document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-gray-700 hover:text-green-600 font-medium text-sm sm:flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Download App</span>
              </a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-gray-700 hover:text-green-600 font-medium text-sm sm:flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>Contact</span>
              </a>
              
            </div>
          </div>
        </div>
      </nav>

      {/* Banner Carousel at the top */}
      <div className="container mx-auto px-4 py-8">
        <BannerCarousel />
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
                Fresh Dairy
                <br />
                <span className="text-green-600">Delivered Daily</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Farm-fresh milk, ghee, paneer, and more delivered to your doorstep every morning
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href="#download" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
                  <span>📱</span>
                  <span>Download App</span>
                </a>
                <a href="#products" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2">
                  <span>🛒</span>
                  <span>View Products</span>
                </a>
              </div>
              <div className="flex items-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span>100% Pure</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚚</span>
                  <span>Daily Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💯</span>
                  <span>Farm Fresh</span>
                </div>
              </div>
            </div>
            {/* <div className="relative h-96 bg-gradient-to-br1 from1-green-100 to1-green-50 rounded1-2xl overflow-hidden shadow-2xl"> </div> */}
            <div className="relative h-96">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-9xl opacity-80">
                    {/* 🥛 */}
                    <Image src="/logo.png" width={350} height={350} className="object-cover" alt="Logo" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                {/* 🐄 */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Showcase - Smooth One-by-One Carousel */}
      <section id="products" className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Fresh Products</h2>
            <p className="text-xl text-gray-600">Delivered fresh from our farms to your home</p>
            </div>

            {loadingProducts ? (
            <div className="text-center py-12">
                <div className="text-5xl mb-4 animate-pulse">🥛</div>
                <p className="text-gray-600">Loading products...</p>
            </div>
            ) : products.length === 0 ? (
            <div className="text-center py-12">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-600">Check our app for available products</p>
                <a href="#download" className="btn-primary mt-4 inline-block">
                Download App
                </a>
            </div>
            ) : (
            <div className="relative">
                <div className="overflow-hidden">
                <div 
                    className="flex gap-6 transition-transform duration-500 ease-in-out"
                    style={{ 
                    transform: `translateX(-${currentProductIndex * (100 / 4)}%)`,
                    }}
                >
                    {products.map((product) => {
                    const displayProduct = {
                        id: product.id,
                        name: product.name || 'Product',
                        description: product.description || `Fresh ${product.name || 'dairy product'}`,
                        price: product.price || 0,
                        unit: `${product.quantity || ''} ${product.unit || ''}`.trim() || 'unit',
                        emoji: getProductEmoji(product.category),
                        imageUrl: product.imageUrl,
                    };
                    
                    return (
                        <div
                        key={product.id}
                        className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
                        >
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full">
                            <div className="h-48 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                            
                            {displayProduct.imageUrl ? (
                                <div className="relative w-full h-full overflow-hidden">
                                  <Image
                                    src={displayProduct.imageUrl}
                                    alt={displayProduct.name}
                                    fill
                                    className="object-cover transform group-hover:scale-110 transition-transform duration-300"
                                  />
                                </div>
                            ) : (
                                <span className="text-8xl transform group-hover:scale-110 transition-transform duration-300">
                                {displayProduct.emoji}
                                </span>
                            )}
                            </div>
                            <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{displayProduct.name}</h3>
                            <p className="text-gray-600 text-sm mb-4 h-10">{displayProduct.description}</p>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                <span className="text-2xl font-bold text-green-600">₹{displayProduct.price}</span>
                                <span className="text-gray-500 text-sm">/{displayProduct.unit}</span>
                                </div>
                            </div>
                            <a 
                                href="#download" 
                                className="btn-primary w-full text-center block group"
                            >
                                <span className="inline-block group-hover:scale-110 transition-transform">
                                Order via App
                                </span>
                            </a>
                            </div>
                        </div>
                        </div>
                    );
                    })}
                </div>
                </div>

                {/* Navigation Arrows - Only show if more than 4 products */}
                {products.length > 4 && (
                <>
                    <button
                    onClick={() => setCurrentProductIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentProductIndex === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-6 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-700 hover:bg-green-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-400 z-10 border-2 border-gray-100"
                    >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    </button>

                    <button
                    onClick={() => setCurrentProductIndex((prev) => Math.min(products.length - 4, prev + 1))}
                    disabled={currentProductIndex >= products.length - 4}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-6 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-gray-700 hover:bg-green-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-400 z-10 border-2 border-gray-100"
                    >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    </button>

                    <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: Math.max(0, products.length - 3) }, (_, i) => i).map((index) => (
                        <button
                        key={index}
                        onClick={() => setCurrentProductIndex(index)}
                        className={`h-2 rounded-full transition-all ${
                            index === currentProductIndex 
                            ? 'bg-green-600 w-8' 
                            : 'bg-gray-300 w-2 hover:bg-gray-400'
                        }`}
                        />
                    ))}
                    </div>
                </>
                )}
            </div>
            )}
        </div>
      </section>

      
      {/* Dynamic Offers Carousel - Compact Top Banner */}
      <section className="bg-gradient-to-r from-green-600 via-green-500 to-green-600 sticky top-16 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
        {loadingOffers ? (
            <div className="text-center text-white py-4">
                <div className="text-2xl mb-2">Loading offers...</div>
            </div>
            ) : offers.length === 0 ? (
            <div className="text-center text-white py-4">
                <div className="text-2xl mb-2">✨ Check back soon for exciting offers!</div>
            </div>
        ) : currentOffer ? (
            <div className="flex-1 flex items-center justify-center gap-4">
                {/* <span className="text-3xl ">⚡</span> */}
                <div className="text-white">
                <span className="font-bold text-lg">{currentOffer.title}</span>
                <span className="mx-2">•</span>
                <span>{currentOffer.description}</span>
                {currentOffer.couponCode && (
                    <>
                    <span className="mx-2">•</span>
                    <span className="font-mono bg-white text-green-700 px-3 py-1 rounded font-bold">
                        {currentOffer.couponCode}
                    </span>
                    </>
                )}
                </div>
            </div>
        ) : null}
        
        {/* Navigation dots */}
        <div className="hidden md:flex gap-2">
            {offers.map((_, index) => (
            <button
                key={index}
                onClick={() => setCurrentOfferIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                index === currentOfferIndex ? 'bg-white w-6' : 'bg-white bg-opacity-50'
                }`}
            />
            ))}
        </div>
        </div>
      </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get fresh dairy in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
                📱
              </div>
              <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Download App</h3>
              <p className="text-gray-600">
                Get the Vedida Farms app from Play Store or App Store and create your account
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
                🛒
              </div>
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Choose Products</h3>
              <p className="text-gray-600">
                Select from our range of fresh dairy products and subscribe or order one-time
              </p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
                🚚
              </div>
              <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Get Delivered</h3>
              <p className="text-gray-600">
                Fresh products delivered to your doorstep every morning before 7 AM
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banners */}
      <div className="container mx-auto px-4 py-8">
        <PromoBanners />
      </div>      

      {/* Dynamic Offers Carousel - Floating Cards */}
      {/* <section className="py-12 bg-white1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Special Offers</h2>
            <p className="text-gray-600">Limited time deals just for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {offers.map((offer, index) => (
                <div
                key={offer.id}
                className={`rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer ${
                    index === currentOfferIndex ? 'ring-4 ring-green-500 ring-opacity-50' : ''
                }`}
                style={{ backgroundColor: offer.backgroundColor }}
                onClick={() => setCurrentOfferIndex(index)}
                >
                <h3 
                    className="text-2xl font-bold mb-3"
                    style={{ color: offer.textColor }}
                >
                    {offer.title}
                </h3>
                <p 
                    className="mb-4 text-lg"
                    style={{ color: offer.textColor }}
                >
                    {offer.description}
                </p>
                {offer.couponCode && (
                    <div className="bg-white bg-opacity-50 rounded-lg px-4 py-2 inline-block">
                    <span className="text-sm font-medium" style={{ color: offer.textColor }}>
                        Code: 
                    </span>
                    <span 
                        className="font-mono font-bold text-lg ml-2"
                        style={{ color: offer.textColor }}
                    >
                        {offer.couponCode}
                    </span>
                    </div>
                )}
                {offer.endDate && (
                    <p className="text-sm mt-3 opacity-75" style={{ color: offer.textColor }}>
                    Valid till {(() => {
                        try {
                            // Handle Firestore Timestamp
                            const date = offer.endDate.toDate ? offer.endDate.toDate() : new Date(offer.endDate);
                            return date.toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                            });
                        } catch (e) {
                            return offer.endDate; // Fallback if it's already a string
                        }
                    })()}
                    </p>
                )}
                </div>
            ))}
            </div>
        </div>
      </section> */}

      {/* Benefits Section */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Vedida Farms?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '🐄', title: 'Farm Fresh', desc: 'Directly from our farms to ensure maximum freshness' },
              { icon: '🚚', title: 'Daily Delivery', desc: 'Delivered every morning before 7 AM' },
              { icon: '💯', title: '100% Pure', desc: 'No adulterants, preservatives, or chemicals' },
              { icon: '📱', title: 'Easy App Ordering', desc: 'Order with just a few taps on your phone' },
              { icon: '🔄', title: 'Flexible Subscriptions', desc: 'Daily, alternate days, or weekly - you choose' },
              { icon: '💰', title: 'Best Prices', desc: 'Direct from farm pricing with no middlemen' },
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-5xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Join 500+ happy customers</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  {[...Array(currentTestimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-3xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 text-lg italic mb-6">
                  &quot;{currentTestimonial.comment}&quot;
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {currentTestimonial.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{currentTestimonial.name}</p>
                    <p className="text-sm text-gray-600">{currentTestimonial.location}</p>
                  </div>
                </div>
              </div>

              {/* Testimonial indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonialIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentTestimonialIndex 
                        ? 'bg-green-600 w-8' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section id="download" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Download the Vedida Farms App
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Order fresh dairy products anytime, anywhere
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: '📱', text: 'Order in seconds with easy app interface' },
                  { icon: '📅', text: 'Subscribe for daily deliveries' },
                  { icon: '💳', text: 'Multiple payment options' },
                  { icon: '🔔', text: 'Real-time delivery notifications' },
                  { icon: '🎯', text: 'Track your orders live' },
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-3xl">{feature.icon}</span>
                    <span className="text-gray-700 text-lg">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <a
                  href="#"
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-lg font-semibold">App Store</div>
                  </div>
                </a>

                <a
                  href="#"
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">GET IT ON</div>
                    <div className="text-lg font-semibold">Google Play</div>
                  </div>
                </a>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">Or scan QR code:</div>
                <div className="w-24 h-24 bg-white rounded-lg p-2 border-2 border-gray-200">
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                    QR Code
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-8 shadow-2xl">
                <div className="text-center">
                  <div className="text-9xl mb-4">📱</div>
                  <p className="text-gray-700 font-semibold">Available on iOS & Android</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      {/* <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">We Deliver To</h2>
            <p className="text-xl text-gray-600">Currently serving major areas in these cities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {serviceAreas.map((area, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">📍</span>
                  <h3 className="text-2xl font-bold text-gray-900">{area.city}</h3>
                </div>
                <ul className="space-y-2">
                  {area.areas.map((location, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="text-green-600">✓</span>
                      <span>{location}</span>
                    </li>
                  ))}
                </ul>
                <button className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm">
                  View all areas in {area.city} →
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">Don't see your area?</p>
            <a href="#contact" className="btn-secondary">
              Request Coverage in Your Area
            </a>
          </div>
        </div>
      </section> */}

      {/* Stats Section */}
      {/* <section className="py-16 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-xl text-green-100">Happy Customers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50,000+</div>
              <div className="text-xl text-green-100">Deliveries Completed</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">4.8⭐</div>
              <div className="text-xl text-green-100">App Store Rating</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-600">We&apos;d love to hear from you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <a
              href="mailto:contact@vedidafarms.com"
              className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-5xl mb-4">📧</div>
              <h3 className="font-bold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm">contact@vedidafarms.com</p>
            </a>

            <a
              href="tel:+919876543210"
              className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-5xl mb-4">📱</div>
              <h3 className="font-bold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm">+91 98765 43210</p>
            </a>

            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">📍</div>
              <h3 className="font-bold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600 text-sm">Vedida Farms, Hyderabad, India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl"><Image src="/logo.png" width={60} height={60} className="object-cover" alt="Logo" /></span>
                <span className="text-white font-bold text-xl">Vedida Farms</span>
              </div>
              <p className="text-sm text-gray-400">
                Fresh dairy products delivered daily to your doorstep
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#products" className="hover:text-white transition-colors">Products</a></li>
                <li><a href="#download" className="hover:text-white transition-colors">Download App</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><button 
                    onClick={() => setOpenModal('about')}
                    className="hover:text-white transition-colors text-left">
                    About Us
                  </button></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><button 
                    onClick={() => setOpenModal('privacy')}
                    className="hover:text-white transition-colors text-left">
                    Privacy Policy
                  </button></li>
                <li><button 
                    onClick={() => setOpenModal('refund')}
                    className="hover:text-white transition-colors text-left">
                    Refund Policy
                  </button></li>
              </ul>
            </div>
          </div>

          {/* Social Media Icons */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
                © 2025 Vedida Farms. All rights reserved.
            </p>
            <div className="flex gap-4">
                <a 
                href="https://facebook.com/vedidafarms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Facebook"
                >
                <Facebook className="w-5 h-5" />
                </a>
                <a 
                href="https://instagram.com/vedidafarms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Instagram"
                >
                <Instagram className="w-5 h-5" />
                </a>
                <a 
                href="https://twitter.com/vedidafarms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Twitter"
                >
                <Twitter className="w-5 h-5" />
                </a>
                <a 
                href="https://youtube.com/@vedidafarms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="YouTube"
                >
                <Youtube className="w-5 h-5" />
                </a>
                <a 
                href="https://linkedin.com/company/vedidafarms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="LinkedIn"
                >
                <Linkedin className="w-5 h-5" />
                </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalContent[openModal].title}
              </h2>
              <button
                onClick={() => setOpenModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: modalContent[openModal].content }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setOpenModal(null)}
                className="btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

  const aboutContent = {
    title: 'About Vedida Farms',
    content: `
      <h3 class="text-xl font-bold text-gray-900 mb-4">Our Story</h3>
      <p class="mb-4 text-gray-700">
        Vedida Farms was founded in 2020 with a simple mission: to bring farm-fresh dairy products 
        directly to urban families. We believe that everyone deserves access to pure, unadulterated 
        dairy products without the hassle of visiting markets daily.
      </p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">Our Promise</h3>
      <p class="mb-4 text-gray-700">
        We work directly with local dairy farmers who follow ethical and sustainable farming practices. 
        Every morning, fresh milk is collected from our partner farms and delivered to your doorstep 
        before 7 AM, ensuring maximum freshness and nutrition.
      </p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">Quality Assurance</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>100% pure and unadulterated products</li>
        <li>No preservatives or chemicals</li>
        <li>Daily quality testing in our certified labs</li>
        <li>Temperature-controlled delivery vehicles</li>
        <li>FSSAI certified facilities</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">Our Values</h3>
      <p class="mb-2 text-gray-700">
        <strong>Purity:</strong> We never compromise on quality. Every product is tested for purity and freshness.
      </p>
      <p class="mb-2 text-gray-700">
        <strong>Sustainability:</strong> We support local farmers and use eco-friendly packaging.
      </p>
      <p class="mb-2 text-gray-700">
        <strong>Convenience:</strong> Order through our app and get fresh dairy delivered daily.
      </p>
      <p class="text-gray-700">
        <strong>Trust:</strong> Transparent sourcing and pricing with no hidden costs.
      </p>
    `,
  };

  const privacyContent = {
    title: 'Privacy Policy',
    content: `
      <p class="text-sm text-gray-500 mb-6">Last Updated: November 20, 2025</p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4">1. Information We Collect</h3>
      <p class="mb-4 text-gray-700">
        We collect information that you provide directly to us, including:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Name, phone number, and email address</li>
        <li>Delivery addresses</li>
        <li>Order and subscription details</li>
        <li>Payment information (processed securely through third-party payment gateways)</li>
        <li>Device information and app usage data</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">2. How We Use Your Information</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Process and deliver your orders</li>
        <li>Send delivery notifications and updates</li>
        <li>Improve our services and user experience</li>
        <li>Send promotional offers (you can opt-out anytime)</li>
        <li>Comply with legal obligations</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">3. Data Security</h3>
      <p class="mb-4 text-gray-700">
        We implement industry-standard security measures to protect your personal information. 
        Your payment data is encrypted and processed through secure payment gateways. We never 
        store complete payment card information on our servers.
      </p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">4. Sharing of Information</h3>
      <p class="mb-4 text-gray-700">
        We do not sell your personal information. We may share your information with:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Delivery partners (only delivery address and contact info)</li>
        <li>Payment processors for transaction processing</li>
        <li>Service providers who assist in our operations</li>
        <li>Law enforcement when required by law</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">5. Your Rights</h3>
      <p class="mb-4 text-gray-700">
        You have the right to:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Access your personal data</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your account and data</li>
        <li>Opt-out of marketing communications</li>
        <li>Withdraw consent at any time</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">6. Cookies</h3>
      <p class="mb-4 text-gray-700">
        We use cookies and similar technologies to improve your experience, analyze usage, 
        and deliver personalized content. You can control cookie preferences through your browser settings.
      </p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">7. Contact Us</h3>
      <p class="text-gray-700">
        If you have questions about this Privacy Policy, please contact us at:
        <br /><strong>Email:</strong> privacy@vedidafarms.com
        <br /><strong>Phone:</strong> +91 98765 43210
      </p>
    `,
  };

  const refundContent = {
    title: 'Refund & Cancellation Policy',
    content: `
      <p class="text-sm text-gray-500 mb-6">Last Updated: November 20, 2025</p>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4">1. Order Cancellation</h3>
      
      <h4 class="font-bold text-gray-900 mb-2 mt-4">One-Time Orders:</h4>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Can be cancelled up to 6 hours before scheduled delivery time</li>
        <li>No cancellation fee for cancellations made within the allowed timeframe</li>
        <li>Cancellations made after the deadline may incur a 10% cancellation fee</li>
        <li>Orders already out for delivery cannot be cancelled</li>
      </ul>
      
      <h4 class="font-bold text-gray-900 mb-2 mt-4">Subscriptions:</h4>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Can be paused or cancelled at any time</li>
        <li>Pause subscriptions for up to 30 days without charges</li>
        <li>Cancelled subscriptions: Refund for unused portion (if prepaid)</li>
        <li>Changes take effect from the next scheduled delivery</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">2. Refund Policy</h3>
      
      <h4 class="font-bold text-gray-900 mb-2 mt-4">Eligible for Refund:</h4>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Order not delivered</li>
        <li>Wrong items delivered</li>
        <li>Damaged or spoiled products</li>
        <li>Quality issues (milk curdled, products expired, etc.)</li>
        <li>Cancelled orders (within allowed timeframe)</li>
      </ul>
      
      <h4 class="font-bold text-gray-900 mb-2 mt-4">Refund Process:</h4>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Report issues within 2 hours of delivery</li>
        <li>Provide photos if claiming quality issues</li>
        <li>Refunds processed within 5-7 business days</li>
        <li>Amount credited to original payment method or wallet</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">3. Non-Refundable</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Products consumed or used</li>
        <li>Late cancellations (after delivery partner dispatched)</li>
        <li>Customer not available at delivery time (order marked delivered)</li>
        <li>Incorrect address provided by customer</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">4. Quality Guarantee</h3>
      <p class="mb-4 text-gray-700">
        We guarantee the quality and freshness of all our products. If you're not satisfied 
        with the quality, please contact us immediately and we'll either:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Replace the product free of charge</li>
        <li>Issue a full refund</li>
        <li>Credit the amount to your wallet for future orders</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-900 mb-4 mt-6">5. How to Request Refund</h3>
      <p class="mb-4 text-gray-700">
        To request a refund:
      </p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-4">
        <li>Contact us via app chat support</li>
        <li>Call our customer service: +91 98765 43210</li>
        <li>Email: support@vedidafarms.com</li>
        <li>Provide order number and reason for refund</li>
      </ul>
      
      <p class="text-gray-700 bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
        <strong>Customer Satisfaction Guaranteed:</strong> Your satisfaction is our priority. 
        If you have any concerns about your order, please reach out to us and we'll make it right.
      </p>
    `,
  };

  const modalContent = {
    about: aboutContent,
    privacy: privacyContent,
    refund: refundContent,
  };