import AddClubForm from "@/components/AddClub";
import InviteGeneratorPage from "@/components/InviteGenerate";
import PickupVerification from "@/components/PickupVerification";
import RatingsAnalytics from "@/components/RatingsAnalytics";
import { Building2, UserPlus, QrCode, Star } from "lucide-react";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gradient-main">
      {/* Header */}
      <div className="glass border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="animate-fade-in">
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Панель управления
            </h1>
            <p className="text-gray-400 mt-1">
              Управление клубами, приглашениями и верификацией
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card card-hover p-5 animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <Building2 className="text-teal-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Клубы</p>
                <p className="text-xl font-bold text-white">Управление</p>
              </div>
            </div>
          </div>
          <div className="card card-hover p-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <UserPlus className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Инвайты</p>
                <p className="text-xl font-bold text-white">Генерация</p>
              </div>
            </div>
          </div>
          <div className="card card-hover p-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <QrCode className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Коды</p>
                <p className="text-xl font-bold text-white">Верификация</p>
              </div>
            </div>
          </div>
          <div className="card card-hover p-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                <Star className="text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-400">Рейтинги</p>
                <p className="text-xl font-bold text-white">Аналитика</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <AddClubForm />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <InviteGeneratorPage />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <PickupVerification />
          </div>
        </div>
        
        {/* Analytics Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              Аналитика рейтингов
            </h2>
            <RatingsAnalytics />
          </div>
        </div>
      </div>
    </main>
  );
}