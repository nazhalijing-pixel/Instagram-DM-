import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PlanBanner } from './components/Common/PlanBanner';
import { PlanRenewModal } from './components/Common/PlanRenewModal';
import { ConnectChannelModal } from './components/Common/ConnectChannelModal';
import { IntroSplash } from './components/Common/IntroSplash';
import { HomePage } from './components/Home/HomePage';
import { AutomationsPage } from './components/Automations/AutomationsPage';
import { AutomationBuilder } from './components/Automations/AutomationBuilder';
import { ContactsPage } from './components/Contacts/ContactsPage';
import { InboxPage } from './components/Inbox/InboxPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { WebhookSimulatorModal } from './components/Simulator/WebhookSimulatorModal';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="flex-1 min-w-0 bg-[#F7F6FB]">
      <PlanBanner />

      {activeTab === 'home' && <HomePage />}
      {activeTab === 'automations' && <AutomationsPage />}
      {activeTab === 'contacts' && <ContactsPage />}
      {activeTab === 'inbox' && <InboxPage />}
      {activeTab === 'settings' && <SettingsPage />}

      {/* Modals & Overlays */}
      <AutomationBuilder />
      <WebhookSimulatorModal />
      <ConnectChannelModal />
      <PlanRenewModal />
    </main>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(true);

  return (
    <AppProvider>
      {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}
      <div className="flex min-h-screen font-sans text-slate-900 bg-[#F7F6FB] antialiased">
        <Sidebar />
        <MainContent />
      </div>
    </AppProvider>
  );
}
