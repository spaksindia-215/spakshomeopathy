import type { HerbArticle, HerbTestimonial } from '../types';

/**
 * Demo testimonials (CR-003 §21) — original placeholder content, clearly
 * not real customer records. Structured so it can later be replaced by
 * database/admin-managed testimonials without changing the component that
 * renders them.
 */
export const HERB_TESTIMONIALS: HerbTestimonial[] = [
  {
    id: 't1',
    name: 'Demo Customer — Priya S.',
    location: 'Delhi',
    rating: 5,
    quote:
      'I have been using the Ashwagandha powder as part of my evening routine for a few months now — easy to order and it always arrives well packed.',
  },
  {
    id: 't2',
    name: 'Demo Customer — Rohit K.',
    location: 'Pune',
    rating: 4,
    quote:
      'Good quality herbs and the variant sizes make it easy to try something new without committing to a large pack.',
  },
  {
    id: 't3',
    name: 'Demo Customer — Anjali M.',
    location: 'Bengaluru',
    rating: 5,
    quote:
      'The Triphala and Amla powders are now a regular part of my routine. Packaging is neat and delivery was quick.',
  },
];

/**
 * Demo herbal-education articles (CR-003 §23) — placeholder entries only;
 * no CMS/blog backend is wired yet, matching this brief's fallback
 * instruction ("create a clean component that can later connect to a
 * CMS/database").
 */
export const HERB_ARTICLES: HerbArticle[] = [
  {
    id: 'a1',
    title: 'Understanding Herb Forms: Powder vs. Whole vs. Extract',
    slug: 'understanding-herb-forms',
    excerpt:
      'A short guide to the different forms herbs are sold in, and how the form typically affects how you use them at home.',
    readTime: '4 min read',
    category: 'Herbal Knowledge',
  },
  {
    id: 'a2',
    title: 'A Beginner’s Guide to Building a Daily Herbal Routine',
    slug: 'beginners-guide-daily-herbal-routine',
    excerpt:
      'Practical, general information on introducing herbs into an everyday wellness routine gradually.',
    readTime: '5 min read',
    category: 'Ayurveda & Herbs',
  },
  {
    id: 'a3',
    title: 'How to Store Dried Herbs and Powders Correctly',
    slug: 'how-to-store-dried-herbs',
    excerpt: 'Simple storage tips to help your herbs and powders stay fresh for longer.',
    readTime: '3 min read',
    category: 'Herbal Guides',
  },
];
