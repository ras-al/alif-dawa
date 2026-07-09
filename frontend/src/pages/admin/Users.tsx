import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users').then(r => setUsers(r.data.data)).catch(() => addToast('Failed to load users', 'error')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggle = async (id: number) => {
    try {
      await api.put(`/users/${id}/toggle`);
      addToast('User status updated', 'success');
      fetchUsers();
    } catch { addToast('Failed', 'error'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', form);
      addToast('User created', 'success');
      setShowForm(false);
      setForm({ username: '', password: '', role: 'admin' });
      fetchUsers();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleResetPassword = async (id: number) => {
    const password = prompt('Enter new password (min 6 characters):');
    if (!password || password.length < 6) { addToast('Password too short', 'error'); return; }
    try {
      await api.put(`/users/${id}/reset-password`, { password });
      addToast('Password reset', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534]">
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input required placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md flex-1 focus:outline-none focus:ring-1 focus:ring-[#14532D]" />
          <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md flex-1 focus:outline-none focus:ring-1 focus:ring-[#14532D]" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Username</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden sm:table-cell">Last Login</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 text-slate-900 font-medium">{u.username}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 capitalize">{u.role}</span></td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleToggle(u.id)} className="text-xs text-slate-600 hover:text-slate-900 underline">
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleResetPassword(u.id)} className="text-xs text-slate-600 hover:text-slate-900 underline">
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
