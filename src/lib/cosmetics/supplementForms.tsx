import type { ReactNode } from 'react';

export type SupplementFormIconType =
  | 'pill'
  | 'powder'
  | 'syrup'
  | 'drops'
  | 'gummies'
  | 'effervescent'
  | 'tea'
  | 'softgel';

export interface SupplementFormItem {
  id: string;
  label: string;
  description: string;
  iconBg: string;
  iconColor: string;
  icon: SupplementFormIconType;
  href: string;
}

export const NUTRITION_SUPPLEMENT_FORMS: SupplementFormItem[] = [
  {
    id: 'tablets-capsules',
    label: 'Capsules & Tablets',
    description: 'Daily multivitamins, mineral complexes & standardized herbal extracts',
    iconBg: '#e8f5e9',
    iconColor: '#0a6a4b',
    icon: 'pill',
    href: '/nutrition?form=tablets-capsules',
  },
  {
    id: 'powders',
    label: 'Herb & Protein Powders',
    description: 'Plant-based proteins, superfood powders & stamina vitality blends',
    iconBg: '#fef3c7',
    iconColor: '#b45309',
    icon: 'powder',
    href: '/nutrition?form=powders',
  },
  {
    id: 'syrups',
    label: 'Liquid Tonics & Syrups',
    description: 'Fast-absorbing herbal tonics, digestive syrups & vitalizers',
    iconBg: '#e0f2fe',
    iconColor: '#0369a1',
    icon: 'syrup',
    href: '/nutrition?form=syrups',
  },
  {
    id: 'drops',
    label: 'Herbal Drops & Tinctures',
    description: 'Concentrated botanical drops for immunity & vital organ health',
    iconBg: '#ecfdf5',
    iconColor: '#047857',
    icon: 'drops',
    href: '/nutrition?form=drops',
  },
  {
    id: 'gummies',
    label: 'Gummies & Chewables',
    description: 'Delicious daily vitamins for hair, radiant skin glow & nails',
    iconBg: '#fce7f3',
    iconColor: '#be185d',
    icon: 'gummies',
    href: '/nutrition?form=gummies',
  },
  {
    id: 'effervescent',
    label: 'Effervescent Tablets',
    description: 'Instant fizzy drink tablets for rapid hydration & Vitamin C boost',
    iconBg: '#ffedd5',
    iconColor: '#c2410c',
    icon: 'effervescent',
    href: '/nutrition?form=effervescent',
  },
  {
    id: 'teas',
    label: 'Herbal Teas & Infusions',
    description: 'Natural detox, antioxidant green teas & calming nighttime brews',
    iconBg: '#f0fdf4',
    iconColor: '#15803d',
    icon: 'tea',
    href: '/nutrition?form=teas',
  },
  {
    id: 'softgels',
    label: 'Softgels & Botanical Oils',
    description: 'Omega-3, Evening Primrose & pure cold-pressed herbal softgels',
    iconBg: '#fef9c3',
    iconColor: '#a16207',
    icon: 'softgel',
    href: '/nutrition?form=softgels',
  },
];

export function SupplementFormIcon({
  name,
  size = 26,
}: {
  name: SupplementFormIconType;
  size?: number;
}): ReactNode {
  switch (name) {
    case 'pill':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 0 1-7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case 'powder':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 11h14a7 7 0 0 1-14 0Z" />
          <path d="M17 4l-4 7" />
          <circle cx="18" cy="4" r="1.5" />
          <path d="M4 19h16" />
        </svg>
      );
    case 'syrup':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="7" y="7" width="10" height="14" rx="2" />
          <path d="M10 3h4v4h-4z" />
          <path d="M9 3h6" />
          <path d="M7 13h10" />
          <path d="M12 10v6" />
        </svg>
      );
    case 'drops':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M12 9a3 3 0 0 0-3 3" />
        </svg>
      );
    case 'gummies':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      );
    case 'effervescent':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12l-1.5 15a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3L6 3Z" />
          <circle cx="10" cy="11" r="1" />
          <circle cx="14" cy="9" r="1.2" />
          <circle cx="11" cy="15" r="1.5" />
          <circle cx="13" cy="13" r="1" />
        </svg>
      );
    case 'tea':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      );
    case 'softgel':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="12" rx="7" ry="9" transform="rotate(-30 12 12)" />
          <path d="M10 8c1.5-1 3.5-.5 4.5 1" />
        </svg>
      );
    default:
      return null;
  }
}
