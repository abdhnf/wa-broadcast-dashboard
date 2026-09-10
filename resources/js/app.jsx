import React, { useState } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/Layout';
import { DashboardPage } from './Pages/Dashboard';
import { ContactsPage } from './Pages/Contacts';
import { GroupsPage } from './Pages/Groups';
import { TemplatesPage } from './Pages/Templates';
import { BroadcastPage } from './Pages/Broadcast';
import { PlaygroundPage } from './Pages/Playground';
import { SettingsPage } from './Pages/Settings';
import { LoginPage } from './Pages/Auth/Login';
import {
  dummyMetrics,
  dummyContacts,
  dummyGroups,
  dummyTemplates,
  dummyCampaigns,
  dummySettings,
  dummyUser,
} from './data/dummyData';

export function StandaloneApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wa_blast_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa_blast_user', JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wa_blast_user');
    }
  };

  if (!user) {
    return (
      <ThemeProvider>
        <LoginPage
          onLogin={handleLogin}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Layout
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        metrics={dummyMetrics}
      >
        {currentTab === 'dashboard' && (
          <DashboardPage
            metrics={dummyMetrics}
            campaigns={dummyCampaigns}
            onNavigate={setCurrentTab}
          />
        )}
        {currentTab === 'contacts' && (
          <ContactsPage
            contacts={dummyContacts}
            groups={dummyGroups}
          />
        )}
        {currentTab === 'groups' && (
          <GroupsPage
            groups={dummyGroups}
            onNavigate={setCurrentTab}
          />
        )}
        {currentTab === 'templates' && (
          <TemplatesPage
            templates={dummyTemplates}
          />
        )}
        {currentTab === 'broadcast' && (
          <BroadcastPage
            groups={dummyGroups}
            templates={dummyTemplates}
            campaigns={dummyCampaigns}
          />
        )}
        {currentTab === 'playground' && (
          <PlaygroundPage
            templates={dummyTemplates}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsPage
            settings={dummySettings}
          />
        )}
      </Layout>
    </ThemeProvider>
  );
}

// Support both standard Inertia page rendering and Direct mount fallback
const el = document.getElementById('app');
if (el) {
  const root = createRoot(el);
  root.render(<StandaloneApp />);
}
