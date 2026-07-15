'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCompany } from '@/hooks/useCompany';

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access to everything' },
  { value: 'hr', label: 'HR', desc: 'Employees, leave, overtime, offer letters' },
  { value: 'finance', label: 'Finance', desc: 'Payroll, contractors, reports' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
];

export default function TeamPage() {
  const { companyId, profile, role, loading: companyLoading } = useCompany();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', companyId).order('created_at');
    setMembers(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRoleChange(memberId, newRole) {
    setError('');
    const { error: updateError } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId).eq('company_id', companyId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    load();
  }

  async function handleGenerateInvite() {
    setError('');
    setInviting(true);

    // Same shape as the employee portal token: a random opaque credential,
    // not a guessable id+timestamp combination.
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error: inviteError } = await supabase.from('team_invites').insert({
      token,
      company_id: companyId,
      role: inviteRole,
      created_by: profile?.id,
      expires_at: expiresAt.toISOString(),
    });

    setInviting(false);

    if (inviteError) {
      setError(inviteError.message);
      return;
    }

    const link = `${window.location.origin}/signup?invite=${token}`;
    await navigator.clipboard.writeText(link);
    alert(`Invite link copied to clipboard (role: ${inviteRole}). It expires in 14 days and works once.`);
  }

  const isAdmin = role === 'admin';

  if (companyLoading || loading) {
    return <p className="font-num" style={{ color: '#6b6355' }}>Loading…</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="page-eyebrow">HR</span>
          <h1>Team</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 className="card-title">Invite teammates</h2>
        {isAdmin ? (
          <>
            <p style={{ fontSize: 14, color: '#4a4438', marginBottom: 16 }}>
              Generate a one-time link for a specific role. Send it to them yourself (email, Slack, WhatsApp) —
              anyone with the link can join your company workspace at that role, so treat it like a password.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sharp)', fontSize: 14 }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={handleGenerateInvite} disabled={inviting}>
                {inviting ? 'Generating…' : 'Generate invite link'}
              </button>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#4a4438', marginBottom: 0 }}>
            Only admins can invite new teammates. Ask an admin on your team to send you an invite link if you need
            to add someone.
          </p>
        )}
      </div>

      {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card">
        <h2 className="card-title">Members ({members.length})</h2>
        <div className="table-scroll">
<table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Joined</th>
              {isAdmin && <th>Change role</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  {member.full_name}
                  {member.id === profile?.id && <span style={{ fontSize: 12, color: '#6b6355' }}> (you)</span>}
                </td>
                <td>
                  <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{member.role}</span>
                </td>
                <td>{new Date(member.created_at).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      disabled={member.id === profile?.id}
                      style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sharp)', fontSize: 13 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="card-title">Role permissions</h2>
        <div className="table-scroll">
<table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.value}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>
    </div>
  );
}
