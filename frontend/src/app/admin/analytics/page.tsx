import SatisfactionDashboard from '@/components/SatisfactionDashboard';
import TariffManagement from '@/components/TariffManagement';

export default function AnalyticsPage() {
  return (
    <main>
      <div className="p-6 min-h-screen bg-gray-900/50">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Satisfaction Dashboard */}
          <SatisfactionDashboard />
          
          {/* Tariff Management */}
          <TariffManagement />
        </div>
      </div>
    </main>
  );
}
