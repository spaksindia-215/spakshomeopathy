import type { HerbFormCategory, WellnessCategoryInfo } from '../types';

/**
 * "Shop by Herb Form" categories (CR-003 §8/§10.5). Original Spaks
 * naming/content — not copied from any reference site's category labels.
 */
export const HERB_FORM_CATEGORIES: HerbFormCategory[] = [
  {
    form: 'whole-herbs',
    label: 'Whole Herbs',
    description: 'Unprocessed dried herbs in their natural form',
    icon: 'leaf',
  },
  {
    form: 'powders',
    label: 'Herb Powders',
    description: 'Finely ground herbs for easy daily use',
    icon: 'mortar',
  },
  {
    form: 'roots',
    label: 'Roots',
    description: 'Traditional root herbs, whole or sliced',
    icon: 'root',
  },
  {
    form: 'leaves',
    label: 'Leaves',
    description: 'Dried leaves for teas, infusions and powders',
    icon: 'leaves',
  },
  {
    form: 'seeds',
    label: 'Seeds',
    description: 'Medicinal and culinary seeds',
    icon: 'seed',
  },
  {
    form: 'flowers',
    label: 'Flowers',
    description: 'Dried flowers used in traditional wellness routines',
    icon: 'flower',
  },
  {
    form: 'gums-resins',
    label: 'Gums & Resins',
    description: 'Natural gums and resins in raw form',
    icon: 'droplet',
  },
  {
    form: 'herbal-extracts',
    label: 'Herbal Extracts',
    description: 'Concentrated herbal extracts',
    icon: 'flask',
  },
  {
    form: 'herbal-oils',
    label: 'Herbal Oils',
    description: 'Cold-pressed and infused herbal oils',
    icon: 'oil',
  },
  {
    form: 'herbal-tea',
    label: 'Herbal Tea',
    description: 'Blended herbal teas and infusions',
    icon: 'tea',
  },
  {
    form: 'herbal-combinations',
    label: 'Herbal Combinations',
    description: 'Curated multi-herb blends and combo packs',
    icon: 'bundle',
  },
];

/**
 * "Shop by Wellness" categories (CR-003 §9 — wellness-oriented language
 * only, no treatment/cure claims, per contract §42-equivalent guidance in
 * the original brief).
 */
export const WELLNESS_CATEGORIES: WellnessCategoryInfo[] = [
  {
    key: 'hair-care',
    label: 'Hair Care',
    description: 'Herbs traditionally used to support healthy-looking hair',
    icon: 'hair',
  },
  {
    key: 'skin-care',
    label: 'Skin Care',
    description: 'Herbs valued in traditional skin-care routines',
    icon: 'skin',
  },
  {
    key: 'digestion',
    label: 'Digestion',
    description: 'Herbs commonly used to support everyday digestion',
    icon: 'digestion',
  },
  {
    key: 'immunity',
    label: 'Immunity',
    description: 'Herbs traditionally used for general immune wellness',
    icon: 'shield',
  },
  {
    key: 'joint-care',
    label: 'Joint & Bone Care',
    description: 'Herbs used in traditional joint and mobility routines',
    icon: 'bone',
  },
  {
    key: 'stress-relaxation',
    label: 'Stress & Relaxation',
    description: 'Herbs associated with calm and relaxation practices',
    icon: 'calm',
  },
  {
    key: 'womens-wellness',
    label: "Women's Wellness",
    description: "Herbs traditionally used to support women's wellness",
    icon: 'woman',
  },
  {
    key: 'mens-wellness',
    label: "Men's Wellness",
    description: "Herbs traditionally used to support men's wellness",
    icon: 'man',
  },
  {
    key: 'respiratory-wellness',
    label: 'Respiratory Wellness',
    description: 'Herbs traditionally used for respiratory comfort',
    icon: 'lungs',
  },
  {
    key: 'general-wellness',
    label: 'General Wellness',
    description: 'Everyday herbs for general wellbeing routines',
    icon: 'wellness',
  },
  {
    key: 'weight-management',
    label: 'Weight Management',
    description: 'Herbs used alongside healthy lifestyle routines',
    icon: 'scale',
  },
  {
    key: 'heart-wellness',
    label: 'Heart Wellness',
    description: 'Herbs traditionally associated with heart health routines',
    icon: 'heart',
  },
  {
    key: 'brain-memory',
    label: 'Brain & Memory',
    description: 'Herbs traditionally used to support focus and memory',
    icon: 'brain',
  },
];

export function getHerbFormLabel(form: string): string {
  return HERB_FORM_CATEGORIES.find((c) => c.form === form)?.label ?? form;
}

export function getWellnessLabel(key: string): string {
  return WELLNESS_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
