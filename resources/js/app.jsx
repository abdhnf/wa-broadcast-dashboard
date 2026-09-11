import React, { useCallback, useEffect, useState } from 'react';
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
  clearApiConfig,
  createCampaign,
  crmFetch,
  deleteCampaign,
  fetchCampaigns,
  fetchGroups,
  fetchSessions,
  fetchTemplates,
  updateCampaign,
  STORAGE_USER,
} from './lib/api';

/**
 * Akar aplikasi dashboard.
 *
 * Data CRM (grup, kontak, template, kampanye) dimuat sekali di sini lalu
 * diteruskan ke halaman yang memakainya, supaya berpindah tab tidak memicu
 * muat ulang dan tiap halaman melihat data yang sama.
 */
export function StandaloneApp() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_USER);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          /* abaikan data rusak */
        }
      }
    }
    return null;
  });
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactCount, setContactCount] = useState(0);

  const handleLogin = (userData) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSessions([]);
    setGroups([]);
    setTemplates([]);
    setCampaigns([]);
    clearApiConfig();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_USER);
    }
  };

  // Daftar sesi WhatsApp milik user (dipakai pemilih nomor di Playground & Blast Engine).
  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await fetchSessions());
    } catch {
      // Kegagalan sinkronisasi sesi tidak boleh memblokir UI; halaman terkait
      // menampilkan pesan errornya sendiri.
    }
  }, []);

  // Daftar grup dipakai lintas halaman: pemilih segmen di Kontak, target di
  // Blast Engine, dan ringkasan di halaman Grup.
  const refreshGroups = useCallback(async () => {
    try {
      setGroups(await fetchGroups());
    } catch {
      /* halaman terkait menampilkan errornya sendiri */
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      setTemplates(await fetchTemplates());
    } catch {
      /* halaman terkait menampilkan errornya sendiri */
    }
  }, []);

  const refreshCampaigns = useCallback(async () => {
    try {
      setCampaigns(await fetchCampaigns());
    } catch {
      /* halaman terkait menampilkan errornya sendiri */
    }
  }, []);

  // Muat kontak dari CRM untuk lencana sidebar dan autocomplete pencarian.
  const refreshContacts = useCallback(async () => {
    try {
      const res = await crmFetch('/contacts');
      const list = Array.isArray(res?.contacts) ? res.contacts : [];
      setContacts(list);
      setContactCount(list.length);
    } catch {
      /* dibiarkan apa adanya bila gagal */
    }
  }, []);

  /**
   * Simpan kampanye baru ke MySQL lalu sisipkan hasilnya ke state.
   *
   * Mengembalikan objek kampanye (termasuk id dari server) supaya Broadcast
   * langsung bisa memilihnya dan membuka antreannya.
   */
  const handleCampaignCreate = useCallback(async (payload) => {
    const created = await createCampaign({
      name: payload.name,
      groupName: payload.groupName,
      templateId: payload.templateId,
      templateTitle: payload.templateTitle,
      sessionUsed: payload.sessionUsed,
      totalRecipients: payload.totalRecipients,
      status: payload.status,
      queue: payload.queue,
    });
    if (created) setCampaigns((prev) => [created, ...prev]);
    return created;
  }, []);

  /**
   * Perbarui kampanye (status, statistik, atau antrean target).
   * Hasil dari server dipakai untuk menggantikan entri lama di state.
   */
  const handleCampaignUpdate = useCallback(async (id, patchBody) => {
    const updated = await updateCampaign(id, patchBody);
    if (updated) {
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    }
    return updated;
  }, []);

  const handleCampaignDelete = useCallback(async (id) => {
    await deleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  useEffect(() => {
    if (!user) return;
    void refreshSessions();
    void refreshGroups();
    void refreshTemplates();
    void refreshCampaigns();
    void refreshContacts();
    const timer = setInterval(() => void refreshSessions(), 30000);
    return () => clearInterval(timer);
  }, [user, refreshSessions, refreshGroups, refreshTemplates, refreshCampaigns, refreshContacts]);

  if (!user) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={handleLogin} />
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
        metrics={{
          totalContacts: contactCount,
          totalGroups: groups.length,
          totalTemplates: templates.length,
        }}
      >
        {currentTab === 'dashboard' && (
          <DashboardPage onNavigate={setCurrentTab} />
        )}
        {currentTab === 'contacts' && (
          <ContactsPage
            groups={groups}
            onGroupsRefresh={refreshGroups}
            onContactsChange={() => {
              void refreshGroups();
              void refreshCampaigns();
            }}
            onContactsChanged={() => {
              void refreshContacts();
              void refreshCampaigns();
            }}
          />
        )}
        {currentTab === 'groups' && (
          <GroupsPage onNavigate={setCurrentTab} onGroupsChange={refreshGroups} />
        )}
        {currentTab === 'templates' && (
          <TemplatesPage contacts={contacts} onTemplatesChange={refreshTemplates} />
        )}
        {currentTab === 'broadcast' && (
          <BroadcastPage
            groups={groups}
            templates={templates}
            sessions={sessions}
            campaigns={campaigns}
            contacts={contacts}
            onSessionsRefresh={refreshSessions}
            onCampaignCreate={handleCampaignCreate}
            onCampaignUpdate={handleCampaignUpdate}
            onCampaignDelete={handleCampaignDelete}
          />
        )}
        {currentTab === 'playground' && (
          <PlaygroundPage templates={templates} sessions={sessions} contacts={contacts} />
        )}
        {currentTab === 'settings' && (
          <SettingsPage user={user} sessions={sessions} />
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
