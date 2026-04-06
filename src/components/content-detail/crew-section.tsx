import * as React from 'react';
import { fetchMovieCredits, fetchTvCredits } from '@/lib/content-detail';
import CrewDepartmentAccordion from './crew-accordion';

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

interface CrewSectionProps {
  tmdbId: number;
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME';
}

const deptOrder = ['Directing', 'Writing', 'Production', 'Camera', 'Sound', 'Art', 'Costume & Make-Up', 'Editing', 'Visual Effects', 'Other'];

export async function CrewSection({ tmdbId, contentType }: CrewSectionProps) {
  const credits = contentType === 'MOVIE' 
    ? await fetchMovieCredits(tmdbId) 
    : await fetchTvCredits(tmdbId);
  
  const fullCrew = credits.fullCrew;
  if (!fullCrew?.length) return null;

  const crewByDept = fullCrew.reduce((acc: Record<string, CrewMember[]>, c: CrewMember) => {
    const dept = c.department || 'Other';
    acc[dept] = acc[dept] ?? [];
    acc[dept].push(c);
    return acc;
  }, {} as Record<string, CrewMember[]>);

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Full Crew
      </h2>
      <div className="flex flex-col gap-2">
        {deptOrder
          .filter((dept) => crewByDept[dept]?.length)
          .map((dept) => (
            <CrewDepartmentAccordion
              key={dept}
              title={dept}
              members={crewByDept[dept]}
            />
          ))}
      </div>
    </section>
  );
}
