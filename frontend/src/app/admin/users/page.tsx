'use client';

import { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Search, 
  Phone, 
  Mail,
  Shield,
  Building2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  phone: string;
  email?: string;
  role?: string;
  club_id?: number;
  telegram_id?: string;
  created_at: string;
  subscription_expires_at?: string;
}

interface Club {
  id: number;
  name: string;
  code: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    email: '',
    role: 'client',
    club_id: '',
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchUsers();
    fetchClubs();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/users?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch(`${apiUrl}/clubs/`);
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
      }
    } catch (err) {
      console.error('Error fetching clubs:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = editingUser 
        ? `${apiUrl}/users/${editingUser.id}`
        : `${apiUrl}/users/`;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          club_id: formData.club_id ? parseInt(formData.club_id) : null,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: editingUser ? 'Пользователь обновлен' : 'Пользователь создан' });
        setShowModal(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Ошибка при сохранении' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка соединения с сервером' });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Удалить пользователя?')) return;

    try {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Пользователь удален' });
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: 'Ошибка при удалении' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка соединения с сервером' });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      phone: user.phone || '',
      email: user.email || '',
      role: user.role || 'client',
      club_id: user.club_id?.toString() || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      phone: '',
      email: '',
      role: 'client',
      club_id: '',
    });
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleLabel = (role?: string) => {
    const roles: Record<string, string> = {
      client: 'Клиент',
      courier: 'Курьер',
      laundry: 'Прачечная',
      admin: 'Админ',
      super: 'Супер-админ',
    };
    return roles[role || 'client'] || role;
  };

  const getRoleBadgeColor = (role?: string) => {
    const colors: Record<string, string> = {
      client: 'bg-gray-500',
      courier: 'bg-blue-500',
      laundry: 'bg-yellow-500',
      admin: 'bg-purple-500',
      super: 'bg-red-500',
    };
    return colors[role || 'client'] || 'bg-gray-500';
  };

  return (
    <main className="min-h-screen bg-gradient-main">
      {/* Header */}
      <div className="glass border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="animate-fade-in">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Управление пользователями
              </h1>
              <p className="text-gray-400 mt-1">
                {users.length} пользователей в системе
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                resetForm();
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={18} />
              Добавить пользователя
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Message */}
        {message && (
          <div className={`mb-6 flex items-center gap-2 p-4 rounded-xl animate-fade-in ${
            message.type === 'success' 
              ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
              : 'bg-red-500/15 text-red-400 border border-red-500/30'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Поиск по имени, телефону или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto mb-4 text-gray-600" size={48} />
              <p className="text-gray-400">Пользователи не найдены</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Пользователь</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Контакты</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Роль</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Клуб</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Дата регистрации</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-semibold">
                            {user.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-white">{user.username || 'Без имени'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Phone size={14} className="text-gray-500" />
                              {user.phone}
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Mail size={14} className="text-gray-500" />
                              {user.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs text-white ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.club_id ? (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Building2 size={14} className="text-gray-500" />
                            {clubs.find(c => c.id === user.club_id)?.name || `Клуб #${user.club_id}`}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition"
                            title="Редактировать"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
                            title="Удалить"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
            <div className="card p-6 m-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Имя пользователя</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7..."
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email (опционально)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Роль</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input"
                  >
                    <option value="client">Клиент</option>
                    <option value="courier">Курьер</option>
                    <option value="laundry">Прачечная</option>
                    <option value="admin">Админ клуба</option>
                    <option value="super">Супер-админ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Клуб (опционально)</label>
                  <select
                    value={formData.club_id}
                    onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Без клуба</option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name} ({club.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingUser ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
