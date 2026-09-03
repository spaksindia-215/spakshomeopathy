/**
 * Route inventory for baseline capture.
 *
 * Derived from blueprint.md §3 (the ~170-route inventory) filtered to routes
 * that are GET-reachable and therefore capturable as a visual/DOM baseline.
 *
 * NOT INCLUDED (and why):
 *   - POST-only routes (form submissions). Capturing these would create
 *     production data — enquiries, appointments, orders, reviews. Contract
 *     F-1/NN-10 and basic prudence forbid writing to the live system.
 *   - GET routes with destructive side effects (destroy-*, update-*-status,
 *     cancel-order, change-order-status, remove-cart, cart/update).
 *     Blueprint §16.3 documents these as state-changing GETs.
 *   - /testMail — sends real email on every visit (blueprint §3.1 #56).
 *
 * Dynamic-route slugs were discovered from the LIVE site on 2026-08-01, not
 * invented, so each resolves to real content.
 */

export type AuthRole = 'guest' | 'buyer' | 'admin';

export interface RouteSpec {
  /** URL path relative to the site root. */
  path: string;
  /** Stable identifier used for baseline filenames. */
  id: string;
  /** Roles this route should be captured under. */
  roles: AuthRole[];
  /** Blueprint route number(s) for traceability. */
  ref: string;
  /** Expected classification from blueprint.md / contract §9.2. */
  note?: string;
}

/** Public routes — capturable as guest. Blueprint §3.1. */
export const PUBLIC_ROUTES: RouteSpec[] = [
  { path: '/', id: 'home-root', roles: ['guest', 'buyer'], ref: '§3.1 #1' },
  { path: '/home', id: 'home-alias', roles: ['guest'], ref: '§3.1 #2' },
  { path: '/products', id: 'products-herbs-list', roles: ['guest'], ref: '§3.1 #3' },
  { path: '/diseases-list', id: 'diseases-list', roles: ['guest'], ref: '§3.1 #5' },
  {
    path: '/videos',
    id: 'videos-broken',
    roles: ['guest'],
    ref: '§3.1 #6',
    note: 'B-01: returns 404 view by design',
  },
  { path: '/about', id: 'about', roles: ['guest'], ref: '§3.1 #12' },
  { path: '/mother-tincture', id: 'mother-tincture', roles: ['guest'], ref: '§3.1 #13' },
  { path: '/contact', id: 'contact', roles: ['guest'], ref: '§3.1 #14' },
  { path: '/login', id: 'login', roles: ['guest'], ref: '§3.1 #16' },
  { path: '/seller-register', id: 'seller-register', roles: ['guest'], ref: '§3.1 #17' },
  { path: '/register', id: 'register', roles: ['guest'], ref: '§3.1 #18' },
  { path: '/details', id: 'details', roles: ['guest'], ref: '§3.1 #23' },
  { path: '/terms', id: 'terms', roles: ['guest'], ref: '§3.1 #31' },
  { path: '/privacy-policy', id: 'privacy-policy', roles: ['guest'], ref: '§3.1 #32' },
  { path: '/video', id: 'video', roles: ['guest'], ref: '§3.1 #33' },
  { path: '/return-policy', id: 'return-policy', roles: ['guest'], ref: '§3.1 #34' },
  { path: '/cart-list', id: 'cart-list', roles: ['guest', 'buyer'], ref: '§3.1 #35' },
  {
    path: '/shopping-cart',
    id: 'shopping-cart-broken',
    roles: ['guest'],
    ref: '§3.1 #26',
    note: 'B-16: renders without required view data',
  },
  { path: '/top-poducts', id: 'top-poducts-sic', roles: ['guest'], ref: '§3.1 #11' },
  { path: '/consultancy', id: 'consultancy', roles: ['guest'], ref: '§3.1 #54' },
  { path: '/reset-password', id: 'reset-password', roles: ['guest'], ref: '§3.1 #49' },
  { path: '/update-password', id: 'update-password', roles: ['guest'], ref: '§3.1 #51' },
  {
    path: '/order-placed',
    id: 'order-placed-broken',
    roles: ['guest'],
    ref: '§3.1 #48',
    note: 'B-17: renders without required view data',
  },
];

/**
 * Dynamic public routes. Slugs discovered from the live site 2026-08-01.
 */
export const DYNAMIC_ROUTES: RouteSpec[] = [
  {
    path: '/diseases-details/bones-16396',
    id: 'diseases-details-bones',
    roles: ['guest'],
    ref: '§3.1 #7',
  },
  {
    path: '/diseases-details/brain-ddb94',
    id: 'diseases-details-brain',
    roles: ['guest'],
    ref: '§3.1 #7',
  },
  {
    path: '/diseases-details/cancer-9f29b',
    id: 'diseases-details-cancer',
    roles: ['guest'],
    ref: '§3.1 #7',
  },
  {
    path: '/product-details/agaricus-200-rhus-tox-q-oocab',
    id: 'product-details-agaricus',
    roles: ['guest'],
    ref: '§3.1 #40',
    note: 'Multi-slot product — exercises the 10-slot price calculator',
  },
  {
    path: '/product-details/bryonia-alba-200-rhus-tox-q-e5nzy',
    id: 'product-details-bryonia',
    roles: ['guest'],
    ref: '§3.1 #40',
  },
  {
    path: '/product-details/colchicum-aut-200-xstxg',
    id: 'product-details-colchicum',
    roles: ['guest'],
    ref: '§3.1 #40',
  },
  {
    path: '/productsbydisease/24',
    id: 'productsbydisease-24',
    roles: ['guest'],
    ref: '§3.1 #4',
    note: 'Param is used as an integer category id, not a slug',
  },
];

/** Buyer-protected routes. Blueprint §3.2. Requires buyer credentials. */
export const BUYER_ROUTES: RouteSpec[] = [
  { path: '/myaccount', id: 'buyer-myaccount', roles: ['buyer'], ref: '§3.2 #63' },
  { path: '/profile', id: 'buyer-profile', roles: ['buyer'], ref: '§3.2 #60' },
  { path: '/change-password', id: 'buyer-change-password', roles: ['buyer'], ref: '§3.2 #62' },
  { path: '/manage-orders', id: 'buyer-manage-orders', roles: ['buyer'], ref: '§3.2 #58' },
  {
    path: '/buyer-panel',
    id: 'buyer-panel-broken',
    roles: ['buyer'],
    ref: '§3.2 #57',
    note: 'B-02: 500, SellerPanel method does not exist',
  },
];

/** Admin routes. Blueprint §3.3. Requires admin credentials. */
export const ADMIN_ROUTES: RouteSpec[] = [
  { path: '/admin/login', id: 'admin-login', roles: ['guest'], ref: '§3.3 #70' },
  { path: '/admin/home', id: 'admin-dashboard', roles: ['admin'], ref: '§3.3 #73' },
  { path: '/admin/product-list', id: 'admin-product-list', roles: ['admin'], ref: '§3.3 #121' },
  { path: '/admin/add-product', id: 'admin-add-product', roles: ['admin'], ref: '§3.3 #104' },
  { path: '/admin/cat-list', id: 'admin-cat-list', roles: ['admin'], ref: '§3.3 #120' },
  { path: '/admin/add-hurbcat', id: 'admin-add-category', roles: ['admin'], ref: '§3.3 #103' },
  { path: '/admin/post-list', id: 'admin-post-list', roles: ['admin'], ref: '§3.3 #99' },
  { path: '/admin/add-post', id: 'admin-add-post', roles: ['admin'], ref: '§3.3 #97' },
  { path: '/admin/manage-buyers', id: 'admin-manage-buyers', roles: ['admin'], ref: '§3.3 #80' },
  { path: '/admin/order-list', id: 'admin-order-list', roles: ['admin'], ref: '§3.3 #136' },
  {
    path: '/admin/enquires-list',
    id: 'admin-enquires-list-sic',
    roles: ['admin'],
    ref: '§3.3 #155',
  },
  {
    path: '/admin/appointment-list',
    id: 'admin-appointment-list',
    roles: ['admin'],
    ref: '§3.3 #163',
  },
  { path: '/admin/review-list', id: 'admin-review-list', roles: ['admin'], ref: '§3.3 #158' },
  { path: '/admin/blog-list', id: 'admin-blog-list', roles: ['admin'], ref: '§3.3 #135' },
  { path: '/admin/slider-list', id: 'admin-slider-list', roles: ['admin'], ref: '§3.3 #151' },
  { path: '/admin/zones-list', id: 'admin-zones-list', roles: ['admin'], ref: '§3.3 #166' },
  { path: '/admin/city-list', id: 'admin-city-list', roles: ['admin'], ref: '§3.3 #170' },
  {
    path: '/admin/change-password',
    id: 'admin-change-password',
    roles: ['admin'],
    ref: '§3.3 #164',
  },
  { path: '/admin/user-profile', id: 'admin-user-profile', roles: ['admin'], ref: '§3.3 #75' },
  {
    path: '/admin/pin-code-list',
    id: 'admin-pin-code-list',
    roles: ['admin'],
    ref: '§3.3 #141',
    note: 'B-09 context: list renders; save/update throw SQL errors',
  },
  {
    path: '/admin/subscriber-list',
    id: 'admin-subscriber-list-broken',
    roles: ['admin'],
    ref: '§3.3 #152',
    note: 'B-10: undefined variable in view',
  },
  {
    path: '/admin/active-products',
    id: 'admin-active-products-broken',
    roles: ['admin'],
    ref: '§3.3 #122',
    note: 'B-07: broken join on always-NULL products.uid',
  },
  {
    path: '/admin/profile',
    id: 'admin-profile-broken',
    roles: ['admin'],
    ref: '§3.3 #83',
    note: 'B-03: 500, AdminProfile method does not exist',
  },
];

/** Non-Laravel URLs living inside public/. Blueprint §3.4. */
export const LEGACY_ROUTES: RouteSpec[] = [
  { path: '/Dandruff/', id: 'legacy-dandruff', roles: ['guest'], ref: '§3.4' },
  { path: '/hair-dandruff/', id: 'legacy-hair-dandruff', roles: ['guest'], ref: '§3.4' },
  { path: '/enlarged-prostate/', id: 'legacy-enlarged-prostate', roles: ['guest'], ref: '§3.4' },
  { path: '/record/', id: 'legacy-record', roles: ['guest'], ref: '§3.4' },
];

export const ALL_ROUTES: RouteSpec[] = [
  ...PUBLIC_ROUTES,
  ...DYNAMIC_ROUTES,
  ...BUYER_ROUTES,
  ...ADMIN_ROUTES,
  ...LEGACY_ROUTES,
];

/** Routes capturable without credentials. */
export function routesForRole(role: AuthRole): RouteSpec[] {
  return ALL_ROUTES.filter((r) => r.roles.includes(role));
}
