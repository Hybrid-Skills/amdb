/**
 * Standalone Backfill Script for Content Metadata.
 * Inlines logic to avoid module resolution issues.
 * 
 * Run: npx tsx scripts/backfill-content-metadata.ts
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// 1. Inlined getShortDescription logic
function getShortDescription(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/\[Written by MAL\]|\(Source: .*\)/gi, '')
    .replace(/\r?\n|\r/g, ' ')
    .trim();
  if (!cleaned) return null;
  const sentenceRegex = /[^\.!\?]+[\.!\?]+(?=\s|$)/g;
  const sentences = cleaned.match(sentenceRegex) || [cleaned];
  let result = sentences[0];
  if (result.length < 60 && sentences.length > 1) {
    const combined = result + ' ' + sentences[1];
    if (combined.length <= 200) result = combined;
  }
  if (result.length > 180) {
    result = result.substring(0, 160).split(' ').slice(0, -1).join(' ').trim() + '...';
  }
  return result.trim();
}

// 2. Simple TMDB fetcher
async function fetchTmdb(endpoint: string, apiKey: string) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

const prisma = new PrismaClient();

async function main() {
  // Load API Key manually from .env.local or .env
  let apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    const envs = ['.env.local', '.env'];
    for (const file of envs) {
      const p = path.join(process.cwd(), file);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const match = content.match(/^TMDB_API_KEY=(.*)$/m);
        if (match) {
          apiKey = match[1].trim();
          break;
        }
      }
    }
  }

  if (!apiKey) {
    console.error('ERROR: TMDB_API_KEY not found in environment or .env files.');
    process.exit(1);
  }

  console.log('--- Starting Standalone Metadata Backfill ---');

  const rows = await prisma.content.findMany({
    include: {
      enrichments: {
        where: { source: 'omdb' },
        take: 1
      }
    }
  });

  console.log(`Found ${rows.length} records.`);
  let updatedCount = 0;
  let networkCalls = 0;

  for (const row of rows) {
    const updates: any = {};
    const omdbData = (row.enrichments[0]?.data as any);

    // shortDescription logic
    if (!row.shortDescription) {
      if (omdbData?.Plot && omdbData.Plot !== 'N/A') {
        updates.shortDescription = omdbData.Plot;
      } else {
        updates.shortDescription = getShortDescription(row.overview);
      }
    }

    // Tagline logic (Movie/TV only)
    if (!row.tagline && (row.contentType === 'MOVIE' || row.contentType === 'TV_SHOW') && row.tmdbId) {
      try {
        const typePath = row.contentType === 'TV_SHOW' ? 'tv' : 'movie';
        const details = await fetchTmdb(`/${typePath}/${row.tmdbId}`, apiKey);
        networkCalls++;
        if (details?.tagline) {
          updates.tagline = details.tagline;
        }
      } catch (e) {
        console.error(`Failed ${row.id}:`, e);
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.content.update({ where: { id: row.id }, data: updates });
      updatedCount++;
      if (updatedCount % 20 === 0) console.log(`Progress: ${updatedCount} rows...`);
    }

    // Rate limiting safeguard
    if (Object.keys(updates).includes('tagline')) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  console.log(`\nFinished. Updated ${updatedCount} rows. Network calls: ${networkCalls}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
