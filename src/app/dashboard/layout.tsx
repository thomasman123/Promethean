import Sidebar from '@/components/navigation/Sidebar';
import { TopDock } from '@/components/ui/TopDock';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Persistent Navigation */}
      <Sidebar />
      
      {/* Persistent Top Dock */}
      <TopDock />
      
      {/* Page Content */}
      {children}
    </>
  );
} 