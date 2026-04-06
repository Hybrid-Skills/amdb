import type { Content, ContentType, Profile, UserContent } from '@prisma/client';

export type { ContentType };

export interface ContentWithEnrichment extends Content {
  enrichments?: { source: string; data: unknown }[];
  userContent?: UserContent[];
}

export interface ProfileWithCount extends Profile {
  _count?: { userContent: number };
}

// Extend next-auth session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
