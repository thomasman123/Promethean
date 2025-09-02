"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Icons - using inline SVGs for now
const Icons = {
  home: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  ),
  team: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ),
  credit: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
    </svg>
  ),
  monitor: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21.9 4.1c-.1-.1-.2-.2-.3-.2H2.4c-.1 0-.2.1-.3.2-.1.1-.1.2-.1.3v15.2c0 .1 0 .2.1.3.1.1.2.1.3.1h19.2c.1 0 .2 0 .3-.1.1-.1.1-.2.1-.3V4.4c0-.1 0-.2-.1-.3zM20 8H4V6h16v2zm0 4H4v-2h16v2zm-8 4H4v-2h8v2z"/>
    </svg>
  ),
  tag: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z"/>
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function Sidebar() {
  const pathname = usePathname();

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Icons.home, href: '/dashboard' },
    { id: 'account', label: 'Account', icon: Icons.user, href: '/account' },
    { id: 'team', label: 'Team', icon: Icons.team, href: '/team' },
    { id: 'subscription', label: 'Subscription Plans', icon: Icons.credit, href: '/subscription' },
    { id: 'compute', label: 'Buy Compute Packs', icon: Icons.shield, href: '/compute' },
    { id: 'statistics', label: 'Usage Statistics', icon: Icons.chart, href: '/statistics' },
    { id: 'billing', label: 'Billing', icon: Icons.monitor, href: '/billing' },
    { id: 'promo', label: 'Promo', icon: Icons.tag, href: '/promo' },
  ];

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
      {/* Navigation pill */}
      <div className="flex flex-col items-center bg-zinc-100 rounded-full p-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative group p-2 rounded-full transition-all
                ${isActive 
                  ? 'text-zinc-900 bg-white dark:text-white dark:bg-zinc-800' 
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }
              `}
            >
              {item.icon}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Settings button separated */}
      <div className="mt-4 flex flex-col items-center bg-zinc-100 rounded-full p-1">
        <Link
          href="/settings"
          className="relative group p-2 rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all"
        >
          {Icons.settings}
          
          {/* Tooltip */}
          <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
            Settings
          </div>
        </Link>
      </div>
    </div>
  );
} 