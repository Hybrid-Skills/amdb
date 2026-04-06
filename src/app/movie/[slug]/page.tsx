import { notFound } from 'next/navigation';
import { parseSlug } from '@/lib/slug';
import { fetchMovieDetail } from '@/lib/content-detail';
import { ContentDetailPage } from '@/components/content-detail-page';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  try {
    const data = await fetchMovieDetail(Number(id));
    return {
      title: `${data.title} (${data.year}) — AMDB`,
      description: data.overview?.slice(0, 155) ?? undefined,
      openGraph: {
        title: data.title,
        description: data.overview?.slice(0, 155) ?? undefined,
        images: data.posterUrl ? [data.posterUrl] : undefined,
      },
    };
  } catch {
    return { title: 'Movie — AMDB' };
  }
}

export default async function MoviePage({ params }: Props) {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  const tmdbId = Number(id);

  if (isNaN(tmdbId)) notFound();

  let data;
  try {
    data = await fetchMovieDetail(tmdbId);
  } catch {
    notFound();
  }

  return <ContentDetailPage data={data} />;
}
