// src/components/modals/CreateProgramModal.jsx
import { useState } from 'react';
import { provisionProgram } from '../../lib/api/programs';

/**
 * Props:
 * - organizations: orgs that don't already have a program (caller filters
 *   this — programs.org_id is UNIQUE, one program per org)
 * - onClose()
 * - onCreated(programId)
 */
export default function CreateProgramModal({ organizations, onClose, onCreated }) {
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? '');
  const [programName, setProgramName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orgId) {
      setError('Select an organization');
      return;
    }
    if (!programName.trim()) {
      setError('Program name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const newProgramId = await provisionProgram({
        orgId,
        programName: programName.trim(),
      });
      onCreated(newProgramId);
    } catch (err) {
      setError(err.message || 'Failed to create program');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">New Residency Program</h2>
        <p className="mt-1 text-sm text-slate-500">
          This copies the full 13-module stock curriculum into the new program.
          The Program Admin can customize it after their first login.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="org-select" className="block text-sm font-medium text-slate-700">
              Organization
            </label>
            {organizations.length === 0 ? (
              <p className="mt-1 text-sm text-amber-600">
                No organizations available — every existing organization
                already has a program. Create a new organization first.
              </p>
            ) : (
              <select
                id="org-select"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={saving}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="program-name" className="block text-sm font-medium text-slate-700">
              Program name
            </label>
            <input
              id="program-name"
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g. BayCare Medical Physics Residency"
              disabled={saving}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>

          {saving && (
            <div className="flex items-center gap-3 rounded-md bg-indigo-50 px-4 py-3">
              <svg
                className="h-4 w-4 flex-shrink-0 animate-spin text-indigo-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-indigo-700">
                Copying the 13-module curriculum into this program — this takes about 15 seconds…
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || organizations.length === 0}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? 'Provisioning…' : 'Create program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
