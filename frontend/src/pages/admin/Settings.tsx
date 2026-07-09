import { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/settings')
      .then(r => setSettings(r.data))
      .catch(() => addToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      addToast('Settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Institution Settings</h1>
      <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl space-y-4">
        {[
          { key: 'institution_name', label: 'Institution Name' },
          { key: 'institution_address', label: 'Address' },
          { key: 'institution_phone', label: 'Phone' },
          { key: 'institution_email', label: 'Email' },
          { key: 'max_marks', label: 'Maximum Marks per Subject' },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <input
              value={settings[field.key] || ''}
              onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
            />
          </div>
        ))}
        <div className="pt-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
