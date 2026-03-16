import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Content */}
        <main className="flex-1 overflow-auto bg-muted/30 p-6">
          <Outlet />
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
