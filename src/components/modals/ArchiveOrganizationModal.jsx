// src/components/modals/ArchiveOrganizationModal.jsx
import { useState } from 'react';
import { archiveOrganization } from '../../lib/api/organizations';

export default function ArchiveOrganizationModal({ org, onClose, onArchived }) {
  const [confirmName, setConfirmName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isMatch = confirmName.trim() === org.name;

  const programNote = org.programs?.length
    ? ` The linked program "${org.programs[0].name}" will remain intact but will no longer appear in active lists.`
    : '';

  async function handleConfirm() {
    if (!isMatch) return;
    setSaving(true);
    setError(null);
    try {
      await archiveOrganization(org.id);
      onArchived();
    } catch (err) {
      setError(err.message || 'Failed to archive organization');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Archive Organization</h2>
        <p className="mt-1 text-sm text-slate-500">
          Archiving hides this organization from active lists but preserves all data and
          resident records.{programNote} This action is logged and can be reversed.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="confirm-name" className="block text-sm font-medium text-slate-700">
              Type <span className="font-semibold text-slate-900">{org.name}</span> to confirm
            </label>
            <input
              id="confirm-name"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoFocus
              placeholder={org.name}
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
              onClick={handleConfirm}
              disabled={!isMatch || saving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? 'Archiving…' : 'Archive organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
