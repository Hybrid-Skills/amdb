'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

function CrewDepartmentAccordion({ title, members }: { title: string; members: CrewMember[] }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-colors hover:border-white/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between group transition-colors"
      >
        <span className="text-sm font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
          {title} <span className="ml-2 text-xs text-white/30 font-bold">({members.length})</span>
        </span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-white/40" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/40" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-0 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 border-t border-white/5 mt-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {members.map((member, i) => (
            <div key={`${member.id}-${i}`} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-xs text-white/40 italic">{member.job}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CrewDepartmentAccordion;
