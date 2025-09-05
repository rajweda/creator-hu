'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  FileText,
  Users,
  BarChart3,
  DollarSign,
  Settings,
  MessageSquare,
  Calendar,
  Zap,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Content',
    href: '/dashboard/content',
    icon: FileText,
  },
  {
    name: 'Community',
    href: '/dashboard/community',
    icon: Users,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'Monetization',
    href: '/dashboard/monetization',
    icon: DollarSign,
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: MessageSquare,
  },
  {
    name: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
  },
  {
    name: 'Amplify',
    href: '/dashboard/amplify',
    icon: Zap,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 mr-3',
                  isActive ? 'text-blue-700' : 'text-gray-400'
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Stats */}
      <div className="p-6 border-t border-gray-200 mt-auto">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <h3 className="font-semibold text-sm mb-2">Creator Pro</h3>
          <p className="text-xs opacity-90 mb-3">
            Unlock advanced features and analytics
          </p>
          <Link
            href="/dashboard/upgrade"
            className="inline-flex items-center text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}