'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Package, ArrowRight, CheckCircle, AlertCircle, User, Lock } from 'lucide-react';

type Language = 'kk' | 'ru' | 'en';

interface Tariff {
  id: number;
  name: string;
  code: string;
  price: number;
  description: string;
}

const LANGUAGES = {
  kk: { name: 'Қазақша', flag: '🇰🇿' },
  ru: { name: 'Русский', flag: '🇷🇺' },
  en: { name: 'English', flag: '🇬🇧' },
};

const TEXTS = {
  kk: {
    welcome: 'Қош келдіңіз',
    dropOff: 'Киім тапсыру',
    pickup: 'Киім алу',
    login: 'Кіру',
    register: 'Тіркелу',
    phone: 'Телефон',
    pin: 'PIN-код',
    faceId: 'Face ID',
    selectLanguage: 'Тілді таңдаңыз',
  },
  ru: {
    welcome: 'Добро пожаловать',
    dropOff: 'Сдать вещи',
    pickup: 'Забрать вещи',
    login: 'Войти',
    register: 'Регистрация',
    phone: 'Телефон',
    pin: 'PIN-код',
    faceId: 'Face ID',
    selectLanguage: 'Выберите язык',
  },
  en: {
    welcome: 'Welcome',
    dropOff: 'Drop off',
    pickup: 'Pick up',
    login: 'Sign in',
    register: 'Register',
    phone: 'Phone',
    pin: 'PIN code',
    faceId: 'Face ID',
    selectLanguage: 'Select language',
  },
};

export default function LockerPage() {
  const supabase = createClient();
  const [language, setLanguage] = useState<Language>('ru');
  const [step, setStep] = useState<'welcome' | 'auth' | 'register' | 'payment' | 'comment' | 'dropoff' | 'pickup'>('welcome');
  const [action, setAction] = useState<'dropoff' | 'pickup' | null>(null);

  // Auth state
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Order state
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [comment, setComment] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

  const t = TEXTS[language];

  // Check if user exists
  const checkUser = async () => {
    if (!phone) return;

    const { data, error } = await supabase
      .from('users')
      .select('id, phone, pin_code')
      .eq('phone', phone)
      .single();

    if (data) {
      setIsNewUser(false);
      setUser(data);
    } else {
      setIsNewUser(true);
    }
  };

  // Handle phone input
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    await checkUser();

    if (isNewUser) {
      // New user - send verification code
      // TODO: Implement SMS verification
      setStep('register');
    } else {
      // Existing user - show PIN or Face ID
      setStep('auth');
    }
  };

  // Handle PIN login
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Verify PIN hash with stored hash
    // For now, just proceed
    if (action === 'dropoff') {
      setStep('payment');
    } else if (action === 'pickup') {
      // Check for ready orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status_id')
        .eq('user_id', user.id)
        .eq('status_id', 3) // ready_for_pickup
        .limit(1);

      if (orders && orders.length > 0) {
        setOrderId(orders[0].id);
        setStep('pickup');
      } else {
        // Show no orders message
      }
    }
  };

  // Handle Face ID login
  const handleFaceIdLogin = async () => {
    // TODO: Integrate with locker's face recognition module
    // This would call the locker's Face ID API
    alert('Face ID login - integration with locker hardware needed');
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !verificationCode || !pin) return;

    // TODO: Verify SMS code
    // TODO: Create user with hashed PIN
    // TODO: Optionally capture face ID if available

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        phone,
        pin_code: pin, // Should be hashed in production
        club_id: 1, // TODO: Get from locker location
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return;
    }

    setUser(newUser);
    setStep('payment');
  };

  // Handle tariff selection and payment
  const handlePayment = async () => {
    if (!selectedTariff) return;

    // Check if user has active subscription
    // TODO: Check subscription status

    // For now, proceed to dropoff
    setStep('dropoff');
  };

  // Handle dropoff
  const handleDropoff = async () => {
    if (!user) return;

    try {
      // TODO: Integrate with smart locker API to open cell
      // const { autoOpenCell } = await import('@/utils/smartlocker/api');
      // const result = await autoOpenCell(deviceId, 'medium', 'client_dropoff');

      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          club_id: 1, // TODO: Get from locker
          status_id: 1, // pending
          price: selectedTariff?.price || 0,
          is_tariff_based: false,
          // locker_device_id: deviceId,
          // locker_cell_id: result?.cell_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Order creation error:', error);
        return;
      }

      // TODO: Open locker cell
      // Show success message and instructions
      setStep('dropoff');
    } catch (err) {
      console.error('Dropoff error:', err);
    }
  };

  // Welcome screen
  if (step === 'welcome') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Language selector */}
          <div className="mb-8 flex justify-end gap-2">
            {Object.entries(LANGUAGES).map(([key, lang]) => (
              <button
                key={key}
                onClick={() => setLanguage(key as Language)}
                className={`px-4 py-2 rounded-lg transition ${
                  language === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-800/50 text-blue-200 hover:bg-blue-800'
                }`}
              >
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>

          {/* Welcome card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-4 text-center">
              {t.welcome}
            </h1>
            <p className="text-blue-200 text-center mb-8">FitClean</p>

            <div className="space-y-4">
              <button
                onClick={() => {
                  setAction('dropoff');
                  setStep('auth');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold py-6 rounded-xl flex items-center justify-center gap-3 transition transform hover:scale-105"
              >
                <Package size={32} />
                {t.dropOff}
                <ArrowRight size={24} />
              </button>

              <button
                onClick={() => {
                  setAction('pickup');
                  setStep('auth');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold py-6 rounded-xl flex items-center justify-center gap-3 transition transform hover:scale-105"
              >
                <CheckCircle size={32} />
                {t.pickup}
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Auth screen
  if (step === 'auth') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {t.login}
            </h2>

            {/* Phone input */}
            <form onSubmit={handlePhoneSubmit} className="space-y-4 mb-4">
              <div>
                <label className="block text-blue-200 mb-2">{t.phone}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 700 123 4567"
                  className="w-full px-4 py-3 rounded-lg bg-blue-900/50 text-white placeholder-blue-300 border border-blue-700 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                {t.login}
              </button>
            </form>

            {/* Auth options (if user exists) */}
            {!isNewUser && user && (
              <div className="space-y-3 mt-6 pt-6 border-t border-blue-700">
                <button
                  onClick={handlePinLogin}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-3 transition"
                >
                  <Lock size={20} />
                  {t.pin}
                </button>

                <button
                  onClick={handleFaceIdLogin}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-3 transition"
                >
                  <User size={20} />
                  {t.faceId}
                </button>
              </div>
            )}

            <button
              onClick={() => setStep('welcome')}
              className="mt-6 w-full text-blue-200 hover:text-white transition text-center"
            >
              ← Назад
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Registration screen
  if (step === 'register') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {t.register}
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-blue-200 mb-2">{t.phone}</label>
                <input
                  type="tel"
                  value={phone}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg bg-blue-900/50 text-white border border-blue-700"
                />
              </div>

              <div>
                <label className="block text-blue-200 mb-2">Код подтверждения</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-lg bg-blue-900/50 text-white placeholder-blue-300 border border-blue-700 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-blue-200 mb-2">{t.pin}</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-blue-900/50 text-white placeholder-blue-300 border border-blue-700 focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-blue-300 text-xs mt-1">Создайте PIN-код для входа</p>
              </div>

              {/* Face ID option */}
              <button
                type="button"
                onClick={handleFaceIdLogin}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-3 transition"
              >
                <User size={20} />
                Добавить Face ID (опционально)
              </button>

              {/* Terms checkbox */}
              <div className="flex items-start gap-2">
                <input type="checkbox" required className="mt-1" />
                <label className="text-blue-200 text-sm">
                  Я согласен с условиями использования сервиса
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                Зарегистрироваться
              </button>
            </form>

            <button
              onClick={() => setStep('auth')}
              className="mt-4 w-full text-blue-200 hover:text-white transition text-center"
            >
              ← Назад
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Payment screen (simplified - actual POS integration needed)
  if (step === 'payment') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Выбор тарифа
            </h2>

            {/* TODO: Fetch tariffs from database */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedTariff({ id: 1, name: 'Разовая стирка', code: 'single', price: 1000, description: 'Одна стирка' })}
                className={`w-full p-4 rounded-lg border-2 transition ${
                  selectedTariff?.id === 1
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-blue-700 bg-blue-900/50 text-white'
                }`}
              >
                <div className="font-semibold">Разовая стирка</div>
                <div className="text-sm opacity-80">1 000 ₸</div>
              </button>
            </div>

            <button
              onClick={() => {
                setStep('comment');
              }}
              disabled={!selectedTariff}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
            >
              Продолжить
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Comment screen
  if (step === 'comment') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Комментарий (опционально)
            </h2>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Особые пожелания по стирке..."
              className="w-full px-4 py-3 rounded-lg bg-blue-900/50 text-white placeholder-blue-300 border border-blue-700 focus:border-blue-500 focus:outline-none h-32 resize-none mb-6"
            />

            <button
              onClick={handleDropoff}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Продолжить
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Dropoff success screen
  if (step === 'dropoff' && action === 'dropoff') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-green-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl text-center">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold text-white mb-4">
              Ваш заказ принят
            </h2>
            <p className="text-green-200 mb-6">
              Положите вещи в мешок и разместите в открывшейся ячейке. После этого закройте дверь.
            </p>
            <p className="text-green-300 text-sm">
              Мы сообщим, когда он будет готов.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

