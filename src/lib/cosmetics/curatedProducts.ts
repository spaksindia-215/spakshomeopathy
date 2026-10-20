import type { Product, VariantSlot } from '@/lib/mongodb/schemas';

export interface CosmeticProduct extends Product {
  cosmeticType: 'homeopathic' | 'allopathic' | 'ayurvedic';
}

const emptySlot: VariantSlot = {
  pImage: null,
  pName: null,
  pMrp: null,
  pPrice: null,
  pDesc: null,
};

function makeCosmetic(data: {
  legacyId: number;
  pName: string;
  pHeading: string;
  pPrice: number;
  pMrp: number;
  pSlug: string;
  pBestimg?: string | null;
  pDesc: string;
  cosmeticType: 'homeopathic' | 'allopathic' | 'ayurvedic';
}): CosmeticProduct {
  return {
    legacyId: data.legacyId,
    pCat: 1,
    pSubcat: null,
    pOcat: null,
    ptype: null,
    pTop: 1,
    pTrending: 1,
    pFeatured: 1,
    uid: null,
    pName: data.pName,
    pHeading: data.pHeading,
    pBestimg: data.pBestimg ?? null,
    pMrp: data.pMrp,
    pPrice: data.pPrice,
    pQuantity: 15,
    pRating: 5,
    pShortDesc: data.pHeading,
    pDesc: data.pDesc,
    pColor: null,
    pSize: null,
    videoLink: null,
    reffNo: null,
    hsnCode: null,
    shippingTime: null,
    searchTerms: `${data.pName} ${data.pHeading} ${data.cosmeticType} skincare cosmetics face care`,
    pSlug: data.pSlug,
    pDesc1: null,
    slot2: emptySlot,
    slot3: emptySlot,
    slot4: emptySlot,
    slot5: emptySlot,
    slot6: emptySlot,
    slot7: emptySlot,
    slot8: emptySlot,
    slot9: emptySlot,
    slot10: emptySlot,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    images: [],
    reviews: [],
    specifications: [],
    pStatus: 1,
    cosmeticType: data.cosmeticType,
  };
}

export const CURATED_COSMETIC_PRODUCTS: CosmeticProduct[] = [
  // --- 1. Homeopathic Cosmetics ---
  makeCosmetic({
    legacyId: 8001,
    pName: 'Spaks Calendula & Berberis Skin Glow Cream',
    pHeading: 'Homeopathic Radiance & Acne Blemish Care',
    pPrice: 280,
    pMrp: 350,
    pSlug: 'spaks-calendula-berberis-skin-glow-cream',
    pBestimg: '1672657144g1.png',
    pDesc: '<p>Enriched with pure Calendula and Berberis Aquifolium mother tinctures, this soothing formula fades blemishes, promotes cell renewal, and restores natural skin radiance without harsh chemicals.</p>',
    cosmeticType: 'homeopathic',
  }),
  makeCosmetic({
    legacyId: 8002,
    pName: 'Arnica & Jaborandi Herbal Hair Tonic',
    pHeading: 'Anti-Dandruff & Follicle Rejuvenation',
    pPrice: 340,
    pMrp: 420,
    pSlug: 'arnica-jaborandi-hair-tonic',
    pBestimg: '1672657141gRhus-tox.png',
    pDesc: '<p>Combines Arnica Montana and Jaborandi extracts to stimulate blood circulation to the scalp, curb dandruff, and strengthen roots from within.</p>',
    cosmeticType: 'homeopathic',
  }),
  makeCosmetic({
    legacyId: 8003,
    pName: 'Echinacea & Thuja Antiseptic Face Wash',
    pHeading: 'Gentle Antimicrobial Deep Cleanser',
    pPrice: 240,
    pMrp: 300,
    pSlug: 'echinacea-thuja-face-cleanser',
    pBestimg: '1673693165gskin5.jpg',
    pDesc: '<p>A balanced botanical cleanser featuring Echinacea Angustifolia and Thuja Occidentalis to neutralize surface bacteria, soothe breakouts, and maintain natural skin pH.</p>',
    cosmeticType: 'homeopathic',
  }),
  makeCosmetic({
    legacyId: 8004,
    pName: 'Silicea & Natrum Mur Radiance Complexion Lotion',
    pHeading: 'Hydrating Cellular Elasticity Lotion',
    pPrice: 390,
    pMrp: 480,
    pSlug: 'silicea-natrum-mur-radiance-lotion',
    pBestimg: '1673680713gskin1.jpg',
    pDesc: '<p>Formulated with tissue salts Silicea 6X and Natrum Muriaticum 6X to deeply hydrate dry tissues and restore firm elasticity.</p>',
    cosmeticType: 'homeopathic',
  }),

  // --- 2. Allopathic Cosmetics ---
  makeCosmetic({
    legacyId: 8005,
    pName: 'Derm-Care Niacinamide 10% + Zinc 1% Blemish Serum',
    pHeading: 'Clinical Pore Minimizing & Sebum Balancing Serum',
    pPrice: 499,
    pMrp: 650,
    pSlug: 'derm-care-niacinamide-zinc-serum',
    pBestimg: '1672919150gproducth.png',
    pDesc: '<p>Formulated with 10% pure Niacinamide and 1% Zinc PCA to visibly reduce blemish severity, tighten enlarged pores, and balance oily secretions.</p>',
    cosmeticType: 'allopathic',
  }),
  makeCosmetic({
    legacyId: 8006,
    pName: 'Hydra-Protect Sunscreen Gel SPF 50+ PA++++',
    pHeading: 'Ultra-Lightweight Broad Spectrum Photoprotection',
    pPrice: 450,
    pMrp: 599,
    pSlug: 'hydra-protect-sunscreen-gel-spf50',
    pBestimg: '1672988705g2.png',
    pDesc: '<p>Advanced hybrid UVA/UVB filters combined with hyaluronic acid for non-greasy, water-resistant daily protection against photoaging and sunburn.</p>',
    cosmeticType: 'allopathic',
  }),
  makeCosmetic({
    legacyId: 8007,
    pName: 'Salicylic Acid 2% Deep Pore Exfoliating Cleanser',
    pHeading: 'BHA Clarifying Acne Control Cleanser',
    pPrice: 320,
    pMrp: 420,
    pSlug: 'salicylic-acid-2-deep-pore-cleanser',
    pBestimg: '1673680954gskin2.jpg',
    pDesc: '<p>Penetrates deep into lipid-rich pores to break down stubborn congestion, dissolve blackheads, and prevent future breakouts without stripping natural moisture.</p>',
    cosmeticType: 'allopathic',
  }),
  makeCosmetic({
    legacyId: 8008,
    pName: 'Ceramide & Hyaluronic Acid Barrier Repair Cream',
    pHeading: 'Intensive Skin Barrier Recovery & Moisture Lock',
    pPrice: 550,
    pMrp: 720,
    pSlug: 'ceramide-hyaluronic-acid-barrier-cream',
    pBestimg: '1673687167gskin4.jpg',
    pDesc: '<p>Formulated with essential skin-identical ceramides (1, 3, 6-II) and multi-molecular hyaluronic acid to restore compromised lipid barriers and seal in deep hydration.</p>',
    cosmeticType: 'allopathic',
  }),

  // --- 3. Ayurvedic Cosmetics ---
  makeCosmetic({
    legacyId: 8009,
    pName: 'Kumkumadi Miraculous Beauty Ayurvedic Tailam',
    pHeading: 'Kashmiri Saffron & 26 Herb Illuminating Face Oil',
    pPrice: 699,
    pMrp: 899,
    pSlug: 'kumkumadi-miraculous-beauty-tailam',
    pBestimg: '1673005250g3.png',
    pDesc: '<p>Handcrafted according to Ashtanga Hridaya texts, this precious elixir features pure Kashmiri saffron, sandalwood, lotus stamen, and goat milk to impart timeless skin radiance.</p>',
    cosmeticType: 'ayurvedic',
  }),
  makeCosmetic({
    legacyId: 8010,
    pName: 'Bhringraj & Amla Intensive Herbal Kesh Hair Oil',
    pHeading: 'Authentic Kshirpak Ayurvedic Hair Growth Oil',
    pPrice: 380,
    pMrp: 490,
    pSlug: 'bhringraj-amla-kesh-hair-oil',
    pBestimg: '1673850955gskin8.jpg',
    pDesc: '<p>Slow-infused with Bhringraj, Amla, Brahmi, and sesame oil to nourish the scalp, delay graying, and promote thick, lustrous locks.</p>',
    cosmeticType: 'ayurvedic',
  }),
  makeCosmetic({
    legacyId: 8011,
    pName: 'Ubtan Radiance Clay Pack with Haldi & Chandan',
    pHeading: 'Exfoliating Herbal De-Tan Skin Polishing Pack',
    pPrice: 280,
    pMrp: 360,
    pSlug: 'ubtan-radiance-clay-pack-haldi-chandan',
    pBestimg: '1673849865gskin7.jpg',
    pDesc: '<p>A classic blend of wild turmeric (Kasturi Manjal), red sandalwood, chickpea flour, and rose petals to gently buff away tan, unclog pores, and restore soft skin.</p>',
    cosmeticType: 'ayurvedic',
  }),
  makeCosmetic({
    legacyId: 8012,
    pName: 'Neem & Tulsi Herbal Purifying Botanical Wash',
    pHeading: 'Gentle Cooling Anti-Pollution Cleanser',
    pPrice: 230,
    pMrp: 299,
    pSlug: 'neem-tulsi-herbal-botanical-wash',
    pBestimg: '1673849378gskin6.jpg',
    pDesc: '<p>Crafted with organic Neem leaves and holy Basil (Tulsi) to wash away environmental pollutants, soothe heat rashes, and clarify the complexion.</p>',
    cosmeticType: 'ayurvedic',
  }),
];
