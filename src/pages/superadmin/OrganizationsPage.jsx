// src/pages/superadmin/OrganizationsPage.jsx
import { useEffect, useState } from 'react';
import { listOrganizations, deleteOrganization } from '../../lib/api/organizations';
import CreateOrganizationModal from '../../components/modals/CreateOrganizationModal';
import AppLayout from '../../components/layout/AppLayout';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listOrganizations();
      setOrgs(data);
    } catch (err) {
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreated() {
    setShowCreateModal(false);
    refresh();
  }

  async function handleDelete(org) {
    const programNote = org.programs?.length
      ? ` and its program "${org.programs[0].name}" (including all residents, modules, and records)`
      : '';
    const confirmed = window.confirm(
      `Delete "${org.name}"${programNote}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteOrganization(org.id);
      refresh();
    } catch (err) {
      alert(err.message || 'Failed to delete organization');
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Organizations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hospitals and institutions using medphystrack.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New organization
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : orgs.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No organizations yet. Create one to get started.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Program
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{org.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {org.programs?.length ? (
                      <span className="text-slate-700">{org.programs[0].name}</span>
                    ) : (
                      <span className="text-amber-600">No program yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(org)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </AppLayout>
  );
}
