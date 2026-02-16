'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bell, BellRing, X, Check, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

export default function NotificationCenter() {
  const supabase = createClient();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const priorityIcons = {
    low: <Info size={16} className="text-blue-400" />,
    medium: <Bell size={16} className="text-yellow-400" />,
    high: <AlertCircle size={16} className="text-orange-400" />,
    urgent: <AlertCircle size={16} className="text-red-400" />
  };

  const priorityColors = {
    low: 'border-l-blue-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-orange-500',
    urgent: 'border-l-red-500'
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'employee_notifications'
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const clubId = user.user.user_metadata?.club_id;
      if (!clubId) return;

      const { data, error } = await supabase
        .from('employee_notifications')
        .select('*')
        .eq('club_id', clubId)
        .or(`recipient_id.is.null,recipient_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('employee_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('employee_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('employee_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} мин назад`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} ч назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all"
      >
        {unreadCount > 0 ? (
          <BellRing size={22} className="text-teal-400 animate-pulse" />
        ) : (
          <Bell size={22} />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold rounded-full h-5 min-w-5 px-1 flex items-center justify-center shadow-lg shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 card shadow-2xl z-50 animate-fade-in">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Уведомления</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium transition"
                  >
                    Прочитать все
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Загружаем уведомления...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-2 opacity-50" />
                <p>Уведомлений нет</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-750 transition-colors border-l-4 ${priorityColors[notification.priority]} ${
                      !notification.is_read ? 'bg-gray-750/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {priorityIcons[notification.priority]}
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-100' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-gray-400 hover:text-teal-400 transition"
                                title="Отметить как прочитанное"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-400 transition"
                              title="Удалить"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
