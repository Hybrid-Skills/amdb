import { notFound } from 'next/navigation';
import { parseSlug } from '@/lib/slug';
import { fetchTvDetail } from '@/lib/content-detail';
import { ContentDetailPage } from '@/components/content-detail-page';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  try {
    const data = await fetchTvDetail(Number(id));
    return {
      title: `${data.title} — TV Show · AMDB`,
      description: data.overview?.slice(0, 155) ?? undefined,
      openGraph: {
        title: data.title,
        description: data.overview?.slice(0, 155) ?? undefined,
        images: data.posterUrl ? [data.posterUrl] : undefined,
      },
    };
  } catch {
    return { title: 'TV Show — AMDB' };
  }
}

export default async function TvPage({ params }: Props) {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  const tmdbId = Number(id);

  if (isNaN(tmdbId)) notFound();

  let data;
  try {
    data = await fetchTvDetail(tmdbId);
  } catch {
    notFound();
  }

  return <ContentDetailPage data={data} />;
}
