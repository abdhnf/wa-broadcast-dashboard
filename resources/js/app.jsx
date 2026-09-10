import React, { useState } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/Layout';
import { DashboardPage } from './Pages/Dashboard';
import { SessionsPage } from './Pages/Sessions';
import { ContactsPage } from './Pages/Contacts';
import { GroupsPage } from './Pages/Groups';
import { TemplatesPage } from './Pages/Templates';
import { BroadcastPage } from './Pages/Broadcast';
import { QueuePage } from './Pages/Queue';
import { PlaygroundPage } from './Pages/Playground';
import { SettingsPage } from './Pages/Settings';
import { LoginPage } from './Pages/Auth/Login';
import {
  dummyMetrics,
  dummySessions,
  dummyContacts,
  dummyGroups,
  dummyTemplates,
  dummyCampaigns,
  dummySettings,
  dummyUser,
} from './data/dummyData';

export function StandaloneApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState(dummyUser);

  if (!user) {
    return (
      <ThemeProvider>
        <LoginPage
          onLogin={setUser}
          registrationEnabled={dummySettings.publicRegistration}
          googleAuthEnabled={dummySettings.googleAuthEnabled}
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
          <SessionsPage
            sessions={dummySessions}
            onAddSession={(session) => console.log('Add session', session)}
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
            sessions={dummySessions}
            campaigns={dummyCampaigns}
            onNavigate={setCurrentTab}
          />
        )}
        {currentTab === 'queue' && (
          <QueuePage
            campaigns={dummyCampaigns}
            sessions={dummySessions}
            onNavigate={setCurrentTab}
          />
        )}
        {currentTab === 'playground' && (
          <PlaygroundPage
            sessions={dummySessions}
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
