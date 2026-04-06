import { notFound } from 'next/navigation';
import { parseSlug } from '@/lib/slug';
import { fetchAnimeDetail } from '@/lib/content-detail';
import { ContentDetailPage } from '@/components/content-detail-page';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  try {
    const data = await fetchAnimeDetail(Number(id));
    return {
      title: `${data.title} — Anime · AMDB`,
      description: data.overview?.slice(0, 155) ?? undefined,
      openGraph: {
        title: data.title,
        description: data.overview?.slice(0, 155) ?? undefined,
        images: data.posterUrl ? [data.posterUrl] : undefined,
      },
    };
  } catch {
    return { title: 'Anime — AMDB' };
  }
}

export default async function AnimePage({ params }: Props) {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  const malId = Number(id);

  if (isNaN(malId)) notFound();

  let data;
  try {
    data = await fetchAnimeDetail(malId);
  } catch {
    notFound();
  }

  return <ContentDetailPage data={data} />;
}
