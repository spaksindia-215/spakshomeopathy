/**
 * Barrel export for the MongoDB repository layer.
 *
 * M3-A covered: users, products, categories/productCategories, pinCodes,
 * and the DR-01 orders/orderProducts/payments group. Other collections
 * (appointments/enquiries/posts/geo/sliders/vestigial) had schemas
 * (../schemas) but no repository class yet — none of M3-A's authorized
 * scope required them, and adding a repository following
 * `ValidatedRepository`'s established pattern is mechanical when a later
 * phase needs one.
 *
 * M4-PREP (docs/M4-PREPARATION.md) added two of those: `enquiryRepository`
 * and `appointmentRepository`, needed by the new service layer
 * (../../services/enquiryService.ts, ../../services/appointmentService.ts).
 * posts/geo/sliders/vestigial still have no repository — still genuinely
 * not needed by any built slice yet, same reasoning as above.
 */

export * from './base';
export * from './userRepository';
export * from './productRepository';
export * from './categoryRepository';
export * from './pinCodeRepository';
export * from './orderRepository';
export * from './enquiryRepository';
export * from './appointmentRepository';
