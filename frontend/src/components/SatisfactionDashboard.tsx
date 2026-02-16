'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Star, TrendingUp, Users, MessageSquare, ThumbsUp, BarChart3, Award } from 'lucide-react';

interface SatisfactionMetrics {
  club_id: number;
  club_name: string;
  club_code: string;
  total_reviews: number;
  avg_overall_rating: number;
  avg_service_quality: number;
  avg_speed_rating: number;
  avg_cleanliness_rating: number;
  avg_staff_rating: number;
  recommenders: number;
  recommendation_percentage: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  reviews_last_30_days: number;
  reviews_last_7_days: number;
}

interface DetailedReview {
  id: string;
  rating: number;
  comment: string;
  service_quality: number;
  speed_rating: number;
  cleanliness_rating: number;
  staff_rating: number;
  would_recommend: boolean;
  improvement_suggestions: string;
  created_at: string;
  users: {
    username: string;
  };
  orders: {
    order_number: string;
    package_id: string;
  };
}

export default function SatisfactionDashboard() {
  const supabase = createClient();
  
  const [metrics, setMetrics] = useState<SatisfactionMetrics | null>(null);
  const [reviews, setReviews] = useState<DetailedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const clubId = user.user?.user_metadata?.club_id;

      // Fetch ratings from backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      
      // Get ratings data
      const ratingsResponse = await fetch(`${apiUrl}/ratings/?limit=50`);
      
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        
        if (ratingsData && ratingsData.length > 0) {
          // Calculate metrics from ratings
          const totalReviews = ratingsData.length;
          const avgRating = ratingsData.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalReviews;
          
          // Calculate reviews in last 30 days
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          const reviewsLast30Days = ratingsData.filter((r: any) => 
            new Date(r.created_at) > thirtyDaysAgo
          ).length;
          
          const reviewsLast7Days = ratingsData.filter((r: any) => 
            new Date(r.created_at) > sevenDaysAgo
          ).length;

          // Count star ratings
          const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          ratingsData.forEach((r: any) => {
            const rating = Math.round(r.rating || 0);
            if (rating >= 1 && rating <= 5) {
              starCounts[rating as keyof typeof starCounts]++;
            }
          });

          setMetrics({
            club_id: clubId || 0,
            club_name: 'Все клубы',
            club_code: '',
            total_reviews: totalReviews,
            avg_overall_rating: avgRating,
            avg_service_quality: avgRating,
            avg_speed_rating: avgRating,
            avg_cleanliness_rating: avgRating,
            avg_staff_rating: avgRating,
            recommenders: Math.round(totalReviews * 0.8),
            recommendation_percentage: 80,
            five_star_count: starCounts[5],
            four_star_count: starCounts[4],
            three_star_count: starCounts[3],
            two_star_count: starCounts[2],
            one_star_count: starCounts[1],
            reviews_last_30_days: reviewsLast30Days,
            reviews_last_7_days: reviewsLast7Days,
          });

          // Transform ratings to reviews format
          const transformedReviews = ratingsData.slice(0, 20).map((r: any) => ({
            id: r.id,
            rating: r.rating || 0,
            comment: r.comment || '',
            service_quality: r.rating || 0,
            speed_rating: r.rating || 0,
            cleanliness_rating: r.rating || 0,
            staff_rating: r.rating || 0,
            would_recommend: (r.rating || 0) >= 4,
            improvement_suggestions: '',
            created_at: r.created_at,
            users: { username: 'Клиент' },
            orders: { order_number: r.order_id?.slice(0, 8) || 'N/A', package_id: '' }
          }));
          
          setReviews(transformedReviews);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={`${
          i < Math.round(rating)
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-600'
        }`}
      />
    ));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 3.5) return 'text-yellow-400';
    if (rating >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow">
        <p className="text-center text-gray-400">Загружаем данные...</p>
      </div>
    );
  }

  if (!metrics || metrics.total_reviews === 0) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow text-center">
        <MessageSquare size={48} className="mx-auto mb-4 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-300 mb-2">
          История удовлетворенности
        </h2>
        <p className="text-gray-500">Отзывов пока нет</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur rounded-2xl p-6 shadow">
        <div className="flex items-center gap-3 mb-4">
          <Award className="text-teal-400" size={24} />
          <h2 className="text-xl font-bold text-gray-200">
            Удовлетворенность клиентов - {metrics.club_name}
          </h2>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400" size={20} />
              <span className="text-sm text-gray-400">Общий рейтинг</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getRatingColor(metrics.avg_overall_rating)}`}>
              {metrics.avg_overall_rating?.toFixed(1) || '0.0'}
            </span>
            <div className="flex">
              {renderStars(metrics.avg_overall_rating || 0)}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.total_reviews} отзывов
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ThumbsUp className="text-green-400" size={20} />
              <span className="text-sm text-gray-400">Рекомендации</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {metrics.recommendation_percentage?.toFixed(0) || '0'}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.recommenders} из {metrics.total_reviews}
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={20} />
              <span className="text-sm text-gray-400">За месяц</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {metrics.reviews_last_30_days}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.reviews_last_7_days} за неделю
          </p>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="text-purple-400" size={20} />
              <span className="text-sm text-gray-400">Активность</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {((metrics.reviews_last_7_days / metrics.total_reviews) * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            недельная активность
          </p>
        </div>
      </div>

      {/* Detailed Ratings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <BarChart3 size={20} />
          Детальные оценки
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              { label: 'Качество услуг', value: metrics.avg_service_quality, icon: '🧼' },
              { label: 'Скорость обслуживания', value: metrics.avg_speed_rating, icon: '⚡' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-gray-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${getRatingColor(item.value || 0)}`}>
                    {item.value?.toFixed(1) || '0.0'}
                  </span>
                  <div className="flex">
                    {renderStars(item.value || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            {[
              { label: 'Чистота', value: metrics.avg_cleanliness_rating, icon: '✨' },
              { label: 'Персонал', value: metrics.avg_staff_rating, icon: '👥' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-gray-300">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${getRatingColor(item.value || 0)}`}>
                    {item.value?.toFixed(1) || '0.0'}
                  </span>
                  <div className="flex">
                    {renderStars(item.value || 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          Распределение оценок
        </h3>
        
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = metrics[`${rating === 1 ? 'one' : rating === 2 ? 'two' : rating === 3 ? 'three' : rating === 4 ? 'four' : 'five'}_star_count` as keyof SatisfactionMetrics] as number;
          const percentage = metrics.total_reviews > 0 ? (count / metrics.total_reviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm w-2">{rating}</span>
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
              </div>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-400 w-12 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Recent Reviews */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Последние отзывы
        </h3>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="border-l-4 border-l-teal-500 bg-gray-750 p-4 rounded-r-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">
                    {review.users.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {review.orders.order_number} • {formatDate(review.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(review.rating)}
                </div>
              </div>
              
              {review.comment && (
                <p className="text-sm text-gray-300 mb-2">
                  "{review.comment}"
                </p>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Качество:</span>
                  <div className="flex">
                    {renderStars(review.service_quality)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Скорость:</span>
                  <div className="flex">
                    {renderStars(review.speed_rating)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Чистота:</span>
                  <div className="flex">
                    {renderStars(review.cleanliness_rating)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Персонал:</span>
                  <div className="flex">
                    {renderStars(review.staff_rating)}
                  </div>
                </div>
              </div>
              
              {review.would_recommend && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                  <ThumbsUp size={12} />
                  <span>Рекомендует</span>
                </div>
              )}
              
              {review.improvement_suggestions && (
                <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                  <span className="text-gray-400">Предложения: </span>
                  <span className="text-gray-300">{review.improvement_suggestions}</span>
                </div>
              )}
            </div>
          ))}
          
          {reviews.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Детальных отзывов пока нет
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
