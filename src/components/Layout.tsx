import React, { type ReactNode } from 'react';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface LayoutProps {
  children: ReactNode;
  tabs: TabProps[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mr-2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h10" />
                <path d="M7 12h10" />
                <path d="M7 17h10" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-900">FlashCards: Иврит-Русский</h1>
            </div>
            <div className="text-xs text-gray-500">
              v{import.meta.env.VITE_APP_VERSION} {/* Use environment variable */}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-full mx-auto">
          {children}
        </div>
      </main>

      <nav className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-around">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`flex flex-col items-center py-3 px-2 text-xs font-medium ${activeTab === tab.id
                    ? 'text-blue-600 border-t-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.icon}
                <span className="mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;