'use client';

import { useState } from 'react';

export default function ProfileEditor({ userInfo, internalUserId, onSuccess }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: userInfo?.email || '',
    business_name: userInfo?.business_name || '',
    address: userInfo?.address || '',
    contact_phone: userInfo?.contact_phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/users/${internalUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setEditing(false);
        onSuccess?.();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        setError(err.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Error updating profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-400/50 text-red-100 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2 bg-(--surface) border border-(--border) text-(--text) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>
          <div>
            <label className="block text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-2">Business Name</label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => setForm({...form, business_name: e.target.value})}
              className="w-full px-3 py-2 bg-(--surface) border border-(--border) text-(--text) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>
          <div>
            <label className="block text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-2">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({...form, address: e.target.value})}
              rows="3"
              className="w-full px-3 py-2 bg-(--surface) border border-(--border) text-(--text) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>
          <div>
            <label className="block text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-2\">Contact Phone</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm({...form, contact_phone: e.target.value})}
              className="w-full px-3 py-2 bg-(--surface) border border-(--border) text-(--text) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--primary) font-semibold py-2 rounded-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing(true)}
        className="px-3 py-1 text-sm rounded-lg bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) transition-all"
      >
        Edit
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {userInfo?.email && (
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-1">Email</p>
            <p className="font-medium text-(--text)">{userInfo.email}</p>
          </div>
        )}
        {userInfo?.business_name && (
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-1">Business Name</p>
            <p className="font-medium text-(--text)">{userInfo.business_name}</p>
          </div>
        )}
        {userInfo?.address && (
          <div className="md:col-span-2">
            <p className="text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-1">Address</p>
            <p className="font-medium text-(--text) whitespace-pre-wrap">{userInfo.address}</p>
          </div>
        )}
        {userInfo?.contact_phone && (
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-[0.12em] mb-1">Contact Phone</p>
            <p className="font-medium text-(--text)">{userInfo.contact_phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}
