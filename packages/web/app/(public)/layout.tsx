import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vedida Farms - Fresh Dairy Delivered Daily',
  description: 'Farm-fresh milk, ghee, paneer, and curd delivered to your doorstep every morning',
  keywords: 'fresh milk, dairy delivery, farm fresh, cow milk, ghee, paneer, bangalore, hyderabad',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}