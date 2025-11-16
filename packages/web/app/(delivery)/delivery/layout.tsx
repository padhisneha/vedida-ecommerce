import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import DeliverySidebar from '@/components/layout/DeliverySidebar';

export default function DeliveryLayout({ children }: { children: ReactNode }) {
  return (

    <div className="h-screen flex overflow-hidden bg-gray-50">
        {/* Sidebar - NOW INCLUDED */}
        <DeliverySidebar />

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header - NOW INCLUDED */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
        </div>
    </div>
    // <div className="min-h-screen bg-gray-50">
    //   <DeliverySidebar />
    //   <div className="md:pl-64 flex flex-col flex-1">
    //     <Header />
    //     <main className="flex-1">
    //       {children}
    //     </main>
    //   </div>
    // </div>
  );
}