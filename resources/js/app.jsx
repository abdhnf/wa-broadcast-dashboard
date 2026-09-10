import React, { useState } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { Layout } from './components/Layout';
import { DashboardPage } from './Pages/Dashboard';
import { SessionsPage } from './Pages/Sessions';
import { ContactsPage } from './Pages/Contacts';
import { GroupsPage } from './Pages/Groups';
import { TemplatesPage } from './Pages/Templates';
import { BroadcastPage } from './Pages/Broadcast';
import { PlaygroundPage } from './Pages/Playground';
import { SettingsPage } from './Pages/Settings';
import { LoginPage } from './Pages/Auth/Login';

import {
  dummyUser,
  dummyMetrics,
  dummySessions,
  dummyGroups,
  dummyContacts,
  dummyTemplates,
  dummyCampaigns,
  dummySettings
} from './data/dummyData';

export function DashboardMain() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => setIsAuthenticated(true)}
        registrationEnabled={dummySettings.publicRegistration}
      />
    );
  }

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      user={dummyUser}
      metrics={dummyMetrics}
    >
      {currentTab === 'dashboard' && (
        <DashboardPage
          metrics={dummyMetrics}
          sessions={dummySessions}
          campaigns={dummyCampaigns}
          onNavigate={setCurrentTab}
        />
      )}

      {currentTab === 'sessions' && (
        <SessionsPage sessions={dummySessions} />
      )}

      {currentTab === 'contacts' && (
        <ContactsPage contacts={dummyContacts} groups={dummyGroups} />
      )}

      {currentTab === 'groups' && (
        <GroupsPage
          groups={dummyGroups}
          onSelectGroupForBroadcast={(groupId) => {
            setCurrentTab('broadcast');
          }}
        />
      )}

      {currentTab === 'templates' && (
        <TemplatesPage templates={dummyTemplates} />
      )}

      {currentTab === 'broadcast' && (
        <BroadcastPage
          campaigns={dummyCampaigns}
          groups={dummyGroups}
          templates={dummyTemplates}
          sessions={dummySessions}
        />
      )}

      {currentTab === 'playground' && (
        <PlaygroundPage
          sessions={dummySessions}
          templates={dummyTemplates}
        />
      )}

      {currentTab === 'settings' && (
        <SettingsPage settings={dummySettings} />
      )}
    </Layout>
  );
}

createInertiaApp({
  resolve: (name) => {
    // Return DashboardMain as our single-page interactive suite
    return DashboardMain;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
