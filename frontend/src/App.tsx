import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DemoBanner } from './components/DemoBanner';
import { IncidentDrawer } from './components/IncidentDrawer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncidentMonitoringPage } from './pages/IncidentMonitoringPage';
import { SensorMonitoringPage } from './pages/SensorMonitoringPage';
import { CitizenComplaintPage } from './pages/CitizenComplaintPage';
import { AnomalyAnalysisPage } from './pages/AnomalyAnalysisPage';
import { OfficerResponsePage } from './pages/OfficerResponsePage';
import { AdminPage } from './pages/AdminPage';

export function App() {
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handleGlobalRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col selection:bg-aqua selection:text-darkBg">
      {/* Top Hackathon Demo Notice & Scenario Triggers */}
      <DemoBanner onRefresh={handleGlobalRefresh} />

      {/* Main Sticky Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onSelectIncident={handleSelectIncident}
      />

      {/* Active Page View */}
      <main className={`flex-1 w-full ${currentPage === 'landing' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6'}`}>
        {currentPage === 'landing' && <LandingPage onEnterApp={handleNavigate} />}
        {currentPage === 'dashboard' && (
          <DashboardPage
            key={refreshTrigger}
            onSelectIncident={handleSelectIncident}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === 'incidents' && (
          <IncidentMonitoringPage
            key={refreshTrigger}
            onSelectIncident={handleSelectIncident}
          />
        )}
        {currentPage === 'anomaly_analysis' && (
          <AnomalyAnalysisPage
            key={refreshTrigger}
            onSelectIncident={handleSelectIncident}
          />
        )}
        {currentPage === 'sensors' && <SensorMonitoringPage key={refreshTrigger} />}
        {currentPage === 'complaints' && <CitizenComplaintPage key={refreshTrigger} />}
        {currentPage === 'officer_center' && <OfficerResponsePage key={refreshTrigger} />}
        {currentPage === 'admin' && <AdminPage key={refreshTrigger} />}
      </main>

      {/* Deep-Dive Incident Drawer / Modal */}
      <IncidentDrawer
        incidentId={selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
        onRefresh={handleGlobalRefresh}
      />
    </div>
  );
}

export default App;
