import { notFound } from 'next/navigation';
import { parseSlug, siteUrl } from '@/lib/slug';
import { fetchMovieDetail } from '@/lib/content-detail';
import { ContentDetailPage } from '@/components/content-detail-page';
import type { Metadata } from 'next';

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { id } = parseSlug(slug);
  const baseUrl = siteUrl;
  // v2 metadata force revalidation

  try {
    const data = await fetchMovieDetail(id);
    const yearSuffix = data.year ? ` (${data.year})` : '';
    const leadActor = data.cast[0]?.name || 'a star-studded cast';
    const director = data.crew.director || 'talented filmmakers';
    const rating = data.tmdbRating || 'N/A';
    const pageUrl = `${baseUrl}/movie/${slug}`;

    return {
      title: `${data.title}${yearSuffix} Streaming on, Ratings, Similar movies, Cast, Plot | AMDB`,
      description: `View ${data.title}${yearSuffix} ratings from all major review platforms. Featuring ${leadActor} and directed by ${director}. Explore box office revenue, budget, runtime and personalized recommendations.`,
      alternates: {
        canonical: pageUrl,
      },
      openGraph: {
        title: `${data.title}${yearSuffix}: Ratings, reviews and see where to stream`,
        description: `⭐ ${rating}/10 | See what the community is saying about ${data.title}. View ratings, cast, and where to stream.`,
        url: pageUrl,
        type: 'video.movie',
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

  let data;
  try {
    data = await fetchMovieDetail(id);
  } catch {
    notFound();
  }

  return <ContentDetailPage data={data} />;
}
