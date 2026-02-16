'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Star } from 'lucide-react';

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id: string;
  users: {
    username: string;
  };
  orders: {
    package_id: string;
    club: {
      name: string;
    };
  };
}

interface RatingStats {
  average: number;
  total: number;
  distribution: { [key: number]: number };
}

export default function RatingsAnalytics() {
  const supabase = createClient();
  
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        const clubId = user.user?.user_metadata?.club_id;

        let query = supabase
          .from('client_ratings')
          .select(`
            id,
            rating,
            comment,
            created_at,
            order_id,
            users!inner(username),
            orders!inner(
              package_id,
              clubs!inner(name)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        // Filter by club if not super admin
        if (clubId && clubId !== 0) {
          query = query.eq('orders.club_id', clubId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching ratings:', error);
          return;
        }

        const ratingsData = data as Rating[];
        setRatings(ratingsData);

        // Calculate statistics
        if (ratingsData.length > 0) {
          const total = ratingsData.length;
          const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
          const average = sum / total;

          const distribution = ratingsData.reduce((acc, r) => {
            acc[r.rating] = (acc[r.rating] || 0) + 1;
            return acc;
          }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as { [key: number]: number });

          setStats({ average, total, distribution });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [supabase]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={`${
          i < rating
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-600'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow">
        <p className="text-center text-gray-400">Загружаем отзывы...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow space-y-6">
      <h2 className="text-lg font-semibold text-teal-400 text-center">
        Отзывы клиентов
      </h2>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-teal-400">
            {stats.average.toFixed(1)}
          </div>
          <div className="text-sm text-gray-400">Средняя оценка</div>
          <div className="flex justify-center mt-1">
            {renderStars(Math.round(stats.average))}
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-teal-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Всего отзывов</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Распределение оценок</h3>
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center gap-2 mb-2">
            <span className="text-sm w-4">{rating}</span>
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all"
                style={{
                  width: `${stats.total > 0 ? (stats.distribution[rating] / stats.total) * 100 : 0}%`
                }}
              />
            </div>
            <span className="text-sm text-gray-400 w-8">
              {stats.distribution[rating]}
            </span>
          </div>
        ))}
      </div>

      {/* Recent Ratings */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Последние отзывы</h3>
        <div className="max-h-64 overflow-y-auto space-y-3">
          {ratings.slice(0, 10).map((rating) => (
            <div key={rating.id} className="bg-gray-800 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {rating.users.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {rating.orders.package_id}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(rating.rating)}
                </div>
              </div>
              
              {rating.comment && (
                <p className="text-sm text-gray-300 mb-2">"{rating.comment}"</p>
              )}
              
              <div className="text-xs text-gray-500">
                {new Date(rating.created_at).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
          
          {ratings.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Отзывов пока нет
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
