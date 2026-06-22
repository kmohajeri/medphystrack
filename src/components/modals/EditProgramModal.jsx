// src/components/modals/EditProgramModal.jsx
import { useState } from 'react';
import { updateProgram } from '../../lib/api/programs';

export default function EditProgramModal({ program, onClose, onSaved }) {
  const [name, setName] = useState(program.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Program name is required');
      return;
    }
    if (trimmed === program.name) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProgram(program.id, { name: trimmed });
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Failed to rename program');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Rename Program</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update the name for this residency program. The change is logged automatically.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="program-name" className="block text-sm font-medium text-slate-700">
              Program name
            </label>
            <input
              id="program-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
