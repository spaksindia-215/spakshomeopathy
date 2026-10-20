import { redirect } from 'next/navigation';
import { getCategoryBySlug, getProductCategoryBySlug } from '@/lib/demo/categories';
import { getProductBySlugLive } from '@/lib/homeopathy/liveQueries';

export default async function ProductsDynamicCatchall({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Is it a disease category (e.g. mouth-tongue-17ae2)?
  const diseaseCat = getCategoryBySlug(slug);
  if (diseaseCat) {
    redirect(`/homeopathy/category/${slug}`);
  }

  // 2. Is it a product category (e.g. from /categories/[cat])?
  const prodCat = getProductCategoryBySlug(slug);
  if (prodCat) {
    redirect(`/category-poducts/${slug}`);
  }

  // 3. Is it a product slug?
  const product = await getProductBySlugLive(slug);
  if (product) {
    redirect(`/homeopathy/product/${slug}`);
  }

  // 4. Default fallback to products catalog
  redirect('/homeopathy/products');
}
