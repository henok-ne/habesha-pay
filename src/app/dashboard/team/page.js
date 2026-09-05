'use client';

import { useEffect, useState } from 'react';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'viewer', label: 'Viewer' },
];

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [currentRole, setCurrentRole] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState(null);

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [creatingInvite, setCreatingInvite] = useState(false);

  async function loadTeam() {
    try {
      setLoading(true);

      const response = await fetch('/api/team', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load team.');
      }

      setMembers(data.members || []);
      setInvites(data.invites || []);
      setCurrentRole(data.role || '');
      setCurrentUserId(data.currentUserId || '');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function changeRole(memberId, role) {
    try {
      setSavingMemberId(memberId);

      const response = await fetch('/api/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update role.');
      }

      setMembers((previousMembers) =>
        previousMembers.map((member) =>
          member.id === memberId
            ? {
                ...member,
                role: data.member.role,
              }
            : member
        )
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingMemberId(null);
    }
  }

  async function createInvitation(event) {
    event.preventDefault();

    if (!email.trim()) {
      alert('Please enter an email address.');
      return;
    }

    try {
      setCreatingInvite(true);

      const response = await fetch('/api/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to create invitation.');
      }

      const invitationLink = data.invite.invitationLink;

      await navigator.clipboard.writeText(invitationLink);

      alert(
        `Invitation created and copied to your clipboard.\n\n${invitationLink}`
      );

      setEmail('');
      setInviteRole('viewer');

      await loadTeam();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreatingInvite(false);
    }
  }

  function formatDate(date) {
    if (!date) return '—';

    return new Date(date).toLocaleDateString();
  }

  function getRoleLabel(role) {
    return (
      ROLES.find((item) => item.value === role)?.label || role
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your company members and invitations.
        </p>
      </div>

      {currentRole === 'admin' && (
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Invite team member</h2>

          <form
            onSubmit={createInvitation}
            className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto]"
          >
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@example.com"
              className="rounded-md border px-3 py-2"
              required
            />

            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="rounded-md border px-3 py-2"
            >
              {ROLES.filter((role) => role.value !== 'admin').map(
                (role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              disabled={creatingInvite}
              className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {creatingInvite ? 'Creating...' : 'Create invite'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Team members</h2>
        </div>

        {members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No team members found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead className="border-b bg-gray-50 text-left text-sm">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => {
                  const isCurrentUser =
                    member.id === currentUserId;

                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-6 py-4 font-medium">
                        {member.fullName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-gray-500">
                            You
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {member.email}
                      </td>

                      <td className="px-6 py-4">
                        {currentRole === 'admin' && !isCurrentUser ? (
                          <select
                            value={member.role}
                            disabled={savingMemberId === member.id}
                            onChange={(event) =>
                              changeRole(
                                member.id,
                                event.target.value
                              )
                            }
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            {ROLES.map((role) => (
                              <option
                                key={role.value}
                                value={role.value}
                              >
                                {role.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">
                            {getRoleLabel(member.role)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(member.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {currentRole === 'admin' && (
        <section className="rounded-lg border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">Pending invitations</h2>
          </div>

          {invites.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              No pending invitations.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="border-b bg-gray-50 text-left text-sm">
                  <tr>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Expires</th>
                    <th className="px-6 py-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4 text-sm">
                        {invite.email}
                      </td>

                      <td className="px-6 py-4 text-sm">
                        {getRoleLabel(invite.role)}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(invite.expiresAt)}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(invite.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}