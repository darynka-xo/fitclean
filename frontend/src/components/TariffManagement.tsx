'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CreditCard, Users, TrendingUp, AlertCircle, CheckCircle, DollarSign, Package, Calendar } from 'lucide-react';

interface TariffAnalytics {
  club_id: number;
  club_name: string;
  tariff_plan_id: string;
  tariff_name: string;
  monthly_fee: number;
  max_items_per_month: number;
  active_subscribers: number;
  total_items_processed: number;
  avg_items_per_user: number;
  monthly_revenue: number;
  users_at_limit: number;
  utilization_percentage: number;
}

interface TariffEligibility {
  eligible: boolean;
  subscription_type: string;
  monthly_limit: number;
  used_this_month: number;
  remaining_items: number;
  needs_payment: boolean;
  suggested_price: number;
}

interface UserSubscription {
  id: string;
  user_id: string;
  subscription_type_id: number;
  monthly_limit: number;
  used_this_month: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  users: {
    username: string;
    phone: string;
  };
  dim_subscription_types: {
    name: string;
    code: string;
  };
  tariff_plans: {
    name: string;
    monthly_fee: number;
    max_items_per_month: number;
  };
}

export default function TariffManagement() {
  const supabase = createClient();
  
  const [analytics, setAnalytics] = useState<TariffAnalytics[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [testUserId, setTestUserId] = useState('');
  const [eligibility, setEligibility] = useState<TariffEligibility | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const clubId = user.user?.user_metadata?.club_id;

      // Fetch tariff analytics
      let analyticsQuery = supabase
        .from('tariff_analytics')
        .select('*')
        .order('active_subscribers', { ascending: false });

      if (clubId && clubId !== 0) {
        analyticsQuery = analyticsQuery.eq('club_id', clubId);
      }

      const { data: analyticsData, error: analyticsError } = await analyticsQuery;

      if (analyticsError) {
        console.error('Error fetching analytics:', analyticsError);
      } else {
        setAnalytics(analyticsData || []);
      }

      // Fetch user subscriptions
      let subscriptionsQuery = supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          subscription_type_id,
          monthly_limit,
          used_this_month,
          is_active,
          start_date,
          end_date,
          users!inner(username, phone),
          dim_subscription_types!inner(name, code),
          tariff_plans(name, monthly_fee, max_items_per_month)
        `)
        .eq('is_active', true)
        .order('used_this_month', { ascending: false })
        .limit(20);

      if (clubId && clubId !== 0) {
        subscriptionsQuery = subscriptionsQuery.eq('club_id', clubId);
      }

      const { data: subscriptionsData, error: subscriptionsError } = await subscriptionsQuery;

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
      } else {
        setSubscriptions(subscriptionsData || []);
      }

    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkTariffEligibility = async () => {
    if (!testUserId.trim()) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const clubId = user.user?.user_metadata?.club_id || 1;

      const { data, error } = await supabase.rpc('check_tariff_eligibility', {
        p_user_id: testUserId,
        p_club_id: clubId
      });

      if (error) {
        console.error('Error checking eligibility:', error);
        return;
      }

      setEligibility(data[0]);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow">
        <p className="text-center text-gray-400">Загружаем данные...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="text-teal-400" size={24} />
          <h2 className="text-xl font-bold text-gray-200">
            Управление тарифами
          </h2>
        </div>
      </div>

      {/* Tariff Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.map((plan) => (
          <div key={plan.tariff_plan_id} className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-200">
                  {plan.tariff_name}
                </h3>
                <p className="text-sm text-gray-400">{plan.club_name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-teal-400">
                  {formatCurrency(plan.monthly_fee)}
                </div>
                <p className="text-xs text-gray-500">в месяц</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-xs text-gray-400">Подписчики</span>
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {plan.active_subscribers}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={16} className="text-green-400" />
                  <span className="text-xs text-gray-400">Обработано</span>
                </div>
                <div className="text-xl font-bold text-green-400">
                  {plan.total_items_processed || 0}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Лимит на пользователя:</span>
                <span className="text-sm text-gray-200">{plan.max_items_per_month} шт/мес</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Среднее использование:</span>
                <span className="text-sm text-gray-200">
                  {plan.avg_items_per_user?.toFixed(1) || '0.0'} шт/польз
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Использование лимита:</span>
                <span className={`text-sm font-semibold ${getUtilizationColor(plan.utilization_percentage || 0)}`}>
                  {plan.utilization_percentage?.toFixed(0) || '0'}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Месячная выручка:</span>
                <span className="text-sm font-semibold text-green-400">
                  {formatCurrency(plan.monthly_revenue || 0)}
                </span>
              </div>

              {plan.users_at_limit > 0 && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/20 rounded-lg">
                  <AlertCircle size={16} className="text-yellow-400" />
                  <span className="text-xs text-yellow-300">
                    {plan.users_at_limit} пользователей достигли лимита
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {analytics.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <CreditCard size={48} className="mx-auto mb-2 opacity-50" />
            <p>Тарифные планы не найдены</p>
          </div>
        )}
      </div>

      {/* Tariff Eligibility Checker */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <CheckCircle size={20} />
          Проверка тарифной доступности
        </h3>
        
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            placeholder="ID пользователя"
            className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500"
          />
          <button
            onClick={checkTariffEligibility}
            disabled={!testUserId.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 rounded-lg font-medium transition"
          >
            Проверить
          </button>
        </div>

        {eligibility && (
          <div className={`p-4 rounded-lg ${
            eligibility.eligible ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {eligibility.eligible ? (
                <CheckCircle size={20} className="text-green-400" />
              ) : (
                <AlertCircle size={20} className="text-red-400" />
              )}
              <span className={`font-semibold ${eligibility.eligible ? 'text-green-400' : 'text-red-400'}`}>
                {eligibility.eligible ? 'Доступен тарифный план' : 'Требуется оплата'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Тип подписки:</span>
                <span className="ml-2 text-gray-200">{eligibility.subscription_type}</span>
              </div>
              <div>
                <span className="text-gray-400">Месячный лимит:</span>
                <span className="ml-2 text-gray-200">{eligibility.monthly_limit}</span>
              </div>
              <div>
                <span className="text-gray-400">Использовано:</span>
                <span className="ml-2 text-gray-200">{eligibility.used_this_month}</span>
              </div>
              <div>
                <span className="text-gray-400">Остается:</span>
                <span className="ml-2 text-gray-200">{eligibility.remaining_items}</span>
              </div>
            </div>

            {eligibility.needs_payment && (
              <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-400">Рекомендуемая цена:</span>
                <span className="ml-2 font-semibold text-yellow-400">
                  {formatCurrency(eligibility.suggested_price)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Subscriptions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Users size={20} />
          Активные подписки
        </h3>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {subscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-200">
                    {subscription.users.username}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {subscription.users.phone}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-teal-400">
                    {subscription.dim_subscription_types.name}
                  </div>
                  {subscription.tariff_plans && (
                    <div className="text-xs text-gray-500">
                      {formatCurrency(subscription.tariff_plans.monthly_fee)}/мес
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Использование: {subscription.used_this_month} из {subscription.monthly_limit}
                </span>
                <span className="text-xs text-gray-500">
                  {((subscription.used_this_month / subscription.monthly_limit) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    getUsageColor(subscription.used_this_month, subscription.monthly_limit)
                  }`}
                  style={{
                    width: `${Math.min((subscription.used_this_month / subscription.monthly_limit) * 100, 100)}%`
                  }}
                />
              </div>

              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    с {new Date(subscription.start_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {subscription.end_date && (
                  <span>
                    до {new Date(subscription.end_date).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {subscriptions.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Активных подписок нет
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
