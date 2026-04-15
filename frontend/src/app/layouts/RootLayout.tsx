import { Outlet } from 'react-router';
import { Navigation } from '../components/Navigation';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <Navigation />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
