'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import NotificationCenter from './NotificationCenter';
import {
  Package,
  Settings,
  BarChart3,
  Users,
  WashingMachine,
  Truck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function Navbar() {
  const supabase = createClient();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
      setRole(user?.app_metadata?.role ?? user?.user_metadata?.role ?? 'user');
      setUserName(user?.user_metadata?.name || user?.email?.split('@')[0] || 'User');
    });
  }, [supabase]);

  // Don't render navbar for non-authenticated users or on certain pages
  if (isAuthenticated === null) return null; // Still loading
  if (!isAuthenticated || pathname === '/login' || pathname === '/register') return null;

  const navItems: NavItem[] = [
    { href: '/board', label: 'Заказы', icon: <Package size={20} /> },
    { href: '/laundry', label: 'Прачечная', icon: <WashingMachine size={20} /> },
    { href: '/courier', label: 'Курьер', icon: <Truck size={20} /> },
    { href: '/admin', label: 'Управление', icon: <Settings size={20} /> },
    { href: '/admin/analytics', label: 'Аналитика', icon: <BarChart3 size={20} /> },
    { href: '/admin/users', label: 'Пользователи', icon: <Users size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/board" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-all">
                <Sparkles size={22} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                FitClean
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-teal-500/15 text-teal-400 shadow-inner'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                      }
                    `}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-teal-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <NotificationCenter />
              
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 max-w-[100px] truncate">{userName}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 z-20">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm text-white font-medium">{userName}</p>
                        <p className="text-xs text-gray-400 capitalize">{role}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition"
                      >
                        <LogOut size={16} />
                        Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/board" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">FitClean</span>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationCenter />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-800 transition"
            >
              {isMenuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsMenuOpen(false)} />
            <div className="fixed top-14 left-0 right-0 bg-gray-900 border-b border-gray-800 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              <div className="p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-teal-500/15 text-teal-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                        }
                      `}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                <div className="border-t border-gray-800 my-3" />
                
                <div className="px-4 py-2">
                  <p className="text-sm text-white font-medium">{userName}</p>
                  <p className="text-xs text-gray-400 capitalize">{role}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut size={20} />
                  Выйти
                </button>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-16" />
    </>
  );
}
