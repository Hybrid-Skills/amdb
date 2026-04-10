import type { Content, ContentType, UserContent } from '@prisma/client';

export type { ContentType };

export interface ContentWithEnrichment extends Content {
  enrichments?: { source: string; data: unknown }[];
  userContent?: UserContent[];
}
