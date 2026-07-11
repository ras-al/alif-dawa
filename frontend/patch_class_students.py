import re

with open('/home/rasal/Documents/MyWorks/alif/frontend/src/pages/class/ClassStudents.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace(
    "import { Search } from 'lucide-react';",
    "import { Search, Edit2 } from 'lucide-react';\nimport Modal from '../../components/Modal';\nimport { useToast } from '../../contexts/ToastContext';"
)

# State
content = content.replace(
    "  const [loading, setLoading] = useState(true);",
    "  const [loading, setLoading] = useState(true);\n  const [showForm, setShowForm] = useState(false);\n  const [editingStudent, setEditingStudent] = useState<Student | null>(null);"
)

# Table headers
content = content.replace(
    """<th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Phone</th>
              </tr>""",
    """<th className="text-left px-4 py-2.5 font-medium text-slate-600 hidden md:table-cell">Phone</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Actions</th>
              </tr>"""
)

# Table row
content = content.replace(
    """<td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{s.phone || '—'}</td>
                </tr>""",
    """<td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{s.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => { setEditingStudent(s); setShowForm(true); }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded inline-flex items-center justify-center"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>"""
)

# Add Modal Component below Pagination
content = content.replace(
    """      {/* Pagination */}
      {totalPages > 1 && (""",
    """      <StudentFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingStudent(null); }}
        student={editingStudent}
        onSuccess={() => { setShowForm(false); setEditingStudent(null); fetchStudents(); }}
      />

      {/* Pagination */}
      {totalPages > 1 && ("""
)

# Append Modal function definition at the end
content += """

// Student form modal (simplified for class level)
function StudentFormModal({ isOpen, onClose, student, onSuccess }: {
  isOpen: boolean; onClose: () => void; student: Student | null; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: '', father_name: '', phone: '', address: ''
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name,
        father_name: student.father_name || '',
        phone: student.phone || '',
        address: student.address || ''
      });
    }
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (student) {
        // We only send fields that are editable by the class
        await api.put(`/students/${student.id}`, form);
        addToast('Student updated', 'success');
        onSuccess();
      }
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to save student', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Student Details">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Father/Guardian Name</label>
          <input
            value={form.father_name}
            onChange={(e) => setForm({ ...form, father_name: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm
              focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-3 py-1.5 text-sm font-medium text-white bg-[#14532D] rounded-md hover:bg-[#166534] disabled:opacity-50">
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
"""

with open('/home/rasal/Documents/MyWorks/alif/frontend/src/pages/class/ClassStudents.tsx', 'w') as f:
    f.write(content)

