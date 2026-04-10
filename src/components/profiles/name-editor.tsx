'use client';

import * as React from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface NameEditorProps {
  name: string;
  profileId: string;
  onUpdate: (name: string) => void;
}

export function NameEditor({ name, profileId, onUpdate }: NameEditorProps) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setValue(name); return; }
    setSaving(true);
    onUpdate(trimmed); // optimistic
    setEditing(false);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
    } catch {
      onUpdate(name); // revert
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setValue(name);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          maxLength={30}
          className="text-2xl font-black bg-transparent border-b border-white/30 focus:border-white outline-none text-white w-full max-w-[200px]"
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-green-400 hover:text-green-300">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={handleCancel} className="p-1 text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-2xl font-black text-white">{name}</h1>
      <Pencil className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
    </button>
  );
}
