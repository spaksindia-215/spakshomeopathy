/**
 * Test fixtures for the M3-A MongoDB data layer.
 *
 * Minimal, valid documents for each schema under test — used to verify
 * that a well-formed document (one that would actually result from a
 * faithful migration of a real MariaDB row) passes validation, and that
 * deliberately-malformed variants are rejected. NOT used against any real
 * database connection — these are pure in-memory objects for schema/
 * mapping unit tests.
 */

import type { User } from '@/lib/mongodb/schemas';
import type { Product } from '@/lib/mongodb/schemas';
import type { Order, OrderProduct, Payment } from '@/lib/mongodb/schemas';
import type { Category } from '@/lib/mongodb/schemas';
import type { PinCode } from '@/lib/mongodb/schemas';

export const validUser: User = {
  legacyId: 1,
  name: 'Test User',
  email: 'test@example.com',
  mobile: '9876543210',
  emailVerifiedAt: null,
  password: '$2y$10$fakeHashForTestingOnly',
  image: null,
  utype: 3,
  status: 1,
  rememberToken: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

export const validUserWithBuyerProfile: User = {
  ...validUser,
  buyerProfile: {
    legacyId: 1,
    pinCode: '110025',
    fullAddress: 'Test Address',
    houseNo: '12',
    landmark: null,
    state: 'Delhi',
    country: 'India',
    deliveryType: null,
  },
};

// Minimal variant-slot shape reused across all 9 empty slots below.
const emptySlot = { pImage: null, pName: null, pMrp: null, pPrice: null, pDesc: null };

export const validProduct: Product = {
  legacyId: 1,
  pCat: 5,
  pSubcat: null,
  pOcat: null,
  ptype: null,
  pTop: null,
  pTrending: null,
  pFeatured: null,
  uid: null, // matches source reality — always null (B-07/B-08)
  pName: 'Test Product',
  pHeading: 'Test Product Heading', // NOT NULL in source
  pBestimg: 'test-image.jpg',
  pMrp: 100,
  pPrice: 90,
  pQuantity: 10,
  pRating: 4,
  pShortDesc: null,
  pDesc: 'A test product description',
  pColor: null,
  pSize: null,
  videoLink: null,
  reffNo: null,
  hsnCode: null,
  shippingTime: null,
  searchTerms: null,
  pSlug: 'test-product',
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
  pStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  images: [{ legacyId: 1, pImage: 'test-image-2.jpg' }],
  reviews: [],
  specifications: [],
};

export const validOrder: Order = {
  legacyId: 1,
  qrTransectionId: 'QR-TEST-001', // NOT NULL in source
  custId: 1,
  sellerId: null,
  groupId: 100,
  productId: 1,
  quantity: 2,
  sellPrice: '90', // source: varchar — preserved as a string
  deliveryPrice: 0, // P-09: always 0
  totalPrice: 180,
  orderId: 1200101, // P-16 format, illustrative
  orderNotes: null,
  orderStatus: 1,
  payMode: 'qr',
  orderDate: '2026-01-01',
  deliveryDate: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

export const validOrderProduct: OrderProduct = {
  legacyId: 1,
  groupId: 100,
  productId: 1,
  orderImage: 'test-image.jpg',
  quantity: 2,
  sellPrice: 90, // source: int — a NUMBER here, unlike orders.sellPrice
  deliveryCharge: 0,
  totalPrice: 180,
  sellerId: null,
  buyerId: 1,
  trackingCode: null,
  delaveryDate: null, // sic
  delaveryBy: null, // sic
  orderStatus: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

export const validPayment: Payment = {
  legacyId: 1,
  pid: 1,
  qunt: 2, // sic
  gid: 100,
  cid: 1,
  sid: null,
  amount: 90,
  totalAmount: 180,
  orderId: '1200101', // source: varchar — a STRING here, unlike orders.orderId
  payStatus: 0,
  orderStatus: 1,
  adminFee: 9, // P-17 illustrative
  sellerPay: 81,
  discount: 0,
  payMode: 'online_payment',
  payDate: '',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

export const validCategory: Category = {
  legacyId: 1,
  name: 'Test Disease',
  image: 'test.jpg',
  slug: 'test-disease-a1b2c',
  type: 'N',
  status: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

export const validPinCode: PinCode = {
  legacyId: 1,
  uid: null,
  country: 'India',
  pincode: '110025',
  location: 'South Delhi',
  status: '1', // source: varchar, not numeric — see schemas/pinCode.ts
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};
