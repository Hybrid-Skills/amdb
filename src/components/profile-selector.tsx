'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  isDefault: boolean;
  _count?: { userContent: number };
}

interface ProfileSelectorProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSelect: (id: string) => void;
  onProfilesChange: () => void;
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

function ProfileAvatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' };
  return (
    <div
      className={cn('rounded-md flex items-center justify-center font-bold text-white', sizes[size])}
      style={{ backgroundColor: profile.avatarColor }}
    >
      {profile.name[0].toUpperCase()}
    </div>
  );
}

export function ProfileSelector({
  profiles,
  activeProfileId,
  onSelect,
  onProfilesChange,
}: ProfileSelectorProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState(AVATAR_COLORS[0]);
  const [loading, setLoading] = React.useState(false);

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setLoading(true);
    await fetch(`/api/profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    setLoading(false);
    onProfilesChange();
  }

  async function handleDelete(id: string) {
    setLoading(true);
    // Optimistic: remove from local state via parent refresh
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    setLoading(false);
    onProfilesChange();
    if (activeProfileId === id && profiles.length > 1) {
      const other = profiles.find((p) => p.id !== id);
      if (other) onSelect(other.id);
    }
  }

  async function handleAddProfile() {
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), avatarColor: newColor }),
    });
    if (res.ok) {
      const profile = await res.json();
      setAdding(false);
      setNewName('');
      onProfilesChange();
      onSelect(profile.id);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto no-scrollbar py-1">
      {profiles.map((profile) => (
        <div key={profile.id} className="relative group">
          {editingId === profile.id ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 bg-card border border-border rounded-lg px-2 py-1"
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(profile.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="bg-transparent text-sm w-24 outline-none"
                maxLength={30}
              />
              <button onClick={() => handleRename(profile.id)} className="text-green-400 hover:text-green-300">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(profile.id)}
              onDoubleClick={() => { setEditingId(profile.id); setEditName(profile.name); }}
              title="Click to select · Double-click to rename"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm shrink-0',
                activeProfileId === profile.id
                  ? 'border-2 border-purple-500 bg-purple-500/10 text-foreground ring-1 ring-purple-500/20'
                  : 'border-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground',
              )}
            >
              <ProfileAvatar profile={profile} size="sm" />
              <span className="font-medium">{profile.name}</span>
            </motion.button>
          )}

          {/* Delete controls */}
          {editingId !== profile.id && !profile.isDefault && (
            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-0.5 bg-card border border-border rounded-md p-0.5 shadow z-10">
              <button
                onClick={() => setDeletingId(profile.id)}
                className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                title="Delete profile"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add profile */}
      {profiles.length < 5 && (
        adding ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5"
          >
            <div className="flex gap-1">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={cn('w-4 h-4 rounded-full border-2', newColor === c ? 'border-white' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddProfile();
                if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="Profile name"
              className="bg-transparent text-sm w-28 outline-none placeholder:text-muted-foreground"
              maxLength={30}
            />
            <button onClick={handleAddProfile} disabled={loading || !newName.trim()} className="text-green-400 hover:text-green-300 disabled:opacity-40">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAdding(true)}
            className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-purple-500/50 transition-colors"
            title="Add Profile"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        )
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setDeletingId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold mb-2">Delete profile?</p>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete the profile and all its ratings. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(deletingId)} disabled={loading}>
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
