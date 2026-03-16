import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/patients', label: 'Patients', icon: 'Users' },
  { path: '/statistics', label: 'Statistics', icon: 'BarChart3' },
  { path: '/export', label: 'Export', icon: 'Download' },
  { path: '/audit', label: 'Audit Log', icon: 'Shield' },
];

export default function Layout({ children, darkMode, onToggleDarkMode }: Props) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">
            CLTI Registry
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Infrainguinal Bypass
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onToggleDarkMode}
            className="flex items-center w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
