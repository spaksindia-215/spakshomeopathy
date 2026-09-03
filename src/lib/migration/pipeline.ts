/**
 * Pipeline orchestration.
 *
 * Owner instruction (M3-B §2): "Build an explicit pipeline: MariaDB/SQL
 * source → Extraction → Transformation → Validation → MongoDB document
 * generation → Verification. Each stage must be independently testable.
 * Do not make the migration script a single opaque command."
 *
 * This module is a THIN COORDINATOR, not a monolith — it calls the four
 * stages implemented in extract/, transform/, validate/, verify/ in
 * sequence and assembles their outputs into a report. Every function it
 * calls is independently exported and independently unit-tested (see
 * tests/migration/*.test.ts) — this file adds no logic of its own beyond
 * sequencing and result-assembly.
 *
 * "MongoDB document generation" (the 5th named pipeline stage) is
 * DELIBERATELY NOT a separate module in this phase — validated documents
 * (ValidationReport.accepted) ARE the generated documents; there is no
 * additional transformation between "validated" and "ready to write."
 * §7's dry-run mode stops exactly here, before any write. A future phase
 * that adds actual persistence would add a thin `generate.ts` wrapping
 * `migrationState.ts`'s `upsertByLegacyId`, called once per accepted
 * document — not built in M3-B, per the owner's "no production writes"
 * boundary (and no development writes either — see the CLI's own
 * dry-run-only stance in scripts/migrate.ts).
 */

import { extractTable } from './extract';
import {
  transformUsers,
  transformProducts,
  transformCategories,
  transformProductCategories,
  transformOrders,
  transformOrderProducts,
  transformPayments,
  transformAppointments,
  transformEnquiries,
  transformSliders,
  transformPinCodes,
  transformPosts,
  transformHomeopathyMasters,
  transformBlogs,
  transformBlogCategories,
  transformStatezones,
  transformCities,
} from './transform';
import { validateEntity } from './validate';
import {
  detectOrderOrphans,
  detectDuplicateIdentities,
  buildEntitySection,
  buildParityReport,
  EXPECTED_TYPE_CONVERSIONS,
  type MigrationParityReport,
} from './verify';
import {
  userSchema,
  productSchema,
  categorySchema,
  productCategorySchema,
  orderSchema,
  orderProductSchema,
  paymentSchema,
  appointmentSchema,
  enquirySchema,
  sliderSchema,
  pinCodeSchema,
  postSchema,
  homeopathyMasterSchema,
  blogSchema,
  blogCategorySchema,
  statezoneSchema,
  citySchema,
} from '@/lib/mongodb/schemas';

/**
 * Runs the full extraction→transformation→validation pipeline for every
 * entity named in the owner's M3-B "required capabilities" list, against
 * an in-memory SQL dump string. Always a dry-run in the sense that this
 * function itself never touches any database — see scripts/migrate.ts for
 * the CLI wrapper that makes "dry-run" an explicit, user-facing mode
 * distinct from "would eventually write" (which this phase does not
 * implement at all).
 */
export function runPipeline(dumpText: string): MigrationParityReport {
  const sections = [];

  // --- users (+ embedded buyer_profile) ---
  const userRows = extractTable(dumpText, 'users');
  const buyerProfileRows = extractTable(dumpText, 'buyer_profile');
  const userOutcomes = transformUsers(userRows, buyerProfileRows);
  const userValidation = validateEntity('users', userOutcomes, userSchema);
  const userDuplicates = detectDuplicateIdentities('users', userValidation.accepted);
  sections.push(
    buildEntitySection(userValidation, userDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'users: 1:1 field copy',
      'buyer_profile: embedded as buyerProfile, matched by uid, absent (not null) when no match exists',
    ])
  );

  // --- products (+ embedded images/reviews/specifications) ---
  const productRows = extractTable(dumpText, 'products');
  const imageRows = extractTable(dumpText, 'product_images');
  const reviewRows = extractTable(dumpText, 'product_review');
  const specificationRows = extractTable(dumpText, 'product_specification');
  const productOutcomes = transformProducts(productRows, imageRows, reviewRows, specificationRows);
  const productValidation = validateEntity('products', productOutcomes, productSchema);
  const productDuplicates = detectDuplicateIdentities('products', productValidation.accepted);
  sections.push(
    buildEntitySection(productValidation, productDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'products: 1:1 field copy, 10 variant slots individually mapped (not restructured, F-20)',
      'product_images/product_review/product_specification: embedded as arrays, matched by p_id',
    ])
  );

  // --- categories, productCategories ---
  const categoryRows = extractTable(dumpText, 'categories');
  const categoryOutcomes = transformCategories(categoryRows);
  const categoryValidation = validateEntity('categories', categoryOutcomes, categorySchema);
  const categoryDuplicates = detectDuplicateIdentities('categories', categoryValidation.accepted);
  sections.push(
    buildEntitySection(categoryValidation, categoryDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'categories: 1:1 field copy, slug preserved unsanitized (P-07)',
    ])
  );

  const productCategoryRows = extractTable(dumpText, 'product_category');
  const productCategoryOutcomes = transformProductCategories(productCategoryRows);
  const productCategoryValidation = validateEntity(
    'productCategories',
    productCategoryOutcomes,
    productCategorySchema
  );
  const productCategoryDuplicates = detectDuplicateIdentities(
    'productCategories',
    productCategoryValidation.accepted
  );
  sections.push(
    buildEntitySection(
      productCategoryValidation,
      productCategoryDuplicates,
      EXPECTED_TYPE_CONVERSIONS,
      [
        'product_category: 1:1 field copy, parentId preserved as plain field (self-referential tree)',
      ]
    )
  );

  // --- orders, orderProducts, payments (DR-01) ---
  const orderRows = extractTable(dumpText, 'orders');
  const orderProductRows = extractTable(dumpText, 'orderproducts');
  const paymentRows = extractTable(dumpText, 'payments');

  const orderOutcomes = transformOrders(orderRows);
  const orderValidation = validateEntity('orders', orderOutcomes, orderSchema);
  const orderDuplicates = detectDuplicateIdentities('orders', orderValidation.accepted);
  sections.push(
    buildEntitySection(orderValidation, orderDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'orders: 1:1 field copy, sellPrice preserved as string, orderId preserved as number',
    ])
  );

  const orderProductOutcomes = transformOrderProducts(orderProductRows);
  const orderProductValidation = validateEntity(
    'orderProducts',
    orderProductOutcomes,
    orderProductSchema
  );
  const orderProductDuplicates = detectDuplicateIdentities(
    'orderProducts',
    orderProductValidation.accepted
  );
  sections.push(
    buildEntitySection(orderProductValidation, orderProductDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'orderproducts: 1:1 field copy, sellPrice preserved as number, DelaveryDate/DelaveryBy misspellings preserved',
    ])
  );

  const paymentOutcomes = transformPayments(paymentRows);
  const paymentValidation = validateEntity('payments', paymentOutcomes, paymentSchema);
  const paymentDuplicates = detectDuplicateIdentities('payments', paymentValidation.accepted);
  sections.push(
    buildEntitySection(paymentValidation, paymentDuplicates, EXPECTED_TYPE_CONVERSIONS, [
      'payments: 1:1 field copy, orderId preserved as string, qunt misspelling preserved',
    ])
  );

  // Order-group relationship verification — GroupId/gid orphan detection
  const orderOrphanReport = detectOrderOrphans(
    orderValidation.accepted,
    orderProductValidation.accepted,
    paymentValidation.accepted
  );

  // --- appointments, enquiries ---
  const appointmentRows = extractTable(dumpText, 'tbl_appointment');
  const appointmentOutcomes = transformAppointments(appointmentRows);
  const appointmentValidation = validateEntity(
    'appointments',
    appointmentOutcomes,
    appointmentSchema
  );
  sections.push(
    buildEntitySection(
      appointmentValidation,
      detectDuplicateIdentities('appointments', appointmentValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['tbl_appointment: 1:1 field copy, no relationships']
    )
  );

  const enquiryRows = extractTable(dumpText, 'enquiries');
  const enquiryOutcomes = transformEnquiries(enquiryRows);
  const enquiryValidation = validateEntity('enquiries', enquiryOutcomes, enquirySchema);
  sections.push(
    buildEntitySection(
      enquiryValidation,
      detectDuplicateIdentities('enquiries', enquiryValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      [
        'enquiries: 1:1 field copy, NO spam filtering (DR-07 default — migrate all rows per NN-8/NN-10)',
      ]
    )
  );

  // --- sliders, pincodes ---
  const sliderRows = extractTable(dumpText, 'slider');
  const sliderOutcomes = transformSliders(sliderRows);
  const sliderValidation = validateEntity('sliders', sliderOutcomes, sliderSchema);
  sections.push(
    buildEntitySection(
      sliderValidation,
      detectDuplicateIdentities('sliders', sliderValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['slider: 1:1 field copy — table has 0 rows in production, expected empty result (P-18)']
    )
  );

  const pinCodeRows = extractTable(dumpText, 'pin_codes');
  const pinCodeOutcomes = transformPinCodes(pinCodeRows);
  const pinCodeValidation = validateEntity('pinCodes', pinCodeOutcomes, pinCodeSchema);
  sections.push(
    buildEntitySection(
      pinCodeValidation,
      detectDuplicateIdentities('pinCodes', pinCodeValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      [
        'pin_codes: 1:1 field copy of the REAL columns (pincode/location/country/uid) — DR-03 unresolved, see schema/repository comments',
      ]
    )
  );

  // --- posts, homeopathyMaster, blogs, blogCategories ---
  const postRows = extractTable(dumpText, 'tbl_post');
  const postOutcomes = transformPosts(postRows);
  const postValidation = validateEntity('posts', postOutcomes, postSchema);
  sections.push(
    buildEntitySection(
      postValidation,
      detectDuplicateIdentities('posts', postValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['tbl_post: 1:1 field copy, post_diseases/post_homeopathy preserved as reference fields']
    )
  );

  const homeopathyRows = extractTable(dumpText, 'tbl_homeopathy');
  const homeopathyOutcomes = transformHomeopathyMasters(homeopathyRows);
  const homeopathyValidation = validateEntity(
    'homeopathyMaster',
    homeopathyOutcomes,
    homeopathyMasterSchema
  );
  sections.push(
    buildEntitySection(
      homeopathyValidation,
      detectDuplicateIdentities('homeopathyMaster', homeopathyValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['tbl_homeopathy: 1:1 field copy']
    )
  );

  const blogRows = extractTable(dumpText, 'blogs');
  const blogOutcomes = transformBlogs(blogRows);
  const blogValidation = validateEntity('blogs', blogOutcomes, blogSchema);
  sections.push(
    buildEntitySection(
      blogValidation,
      detectDuplicateIdentities('blogs', blogValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['blogs: 1:1 field copy, blog_catid preserved as categoryId reference field']
    )
  );

  const blogCategoryRows = extractTable(dumpText, 'blog_category');
  const blogCategoryOutcomes = transformBlogCategories(blogCategoryRows);
  const blogCategoryValidation = validateEntity(
    'blogCategories',
    blogCategoryOutcomes,
    blogCategorySchema
  );
  sections.push(
    buildEntitySection(
      blogCategoryValidation,
      detectDuplicateIdentities('blogCategories', blogCategoryValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['blog_category: 1:1 field copy']
    )
  );

  // --- statezones, cities ---
  const statezoneRows = extractTable(dumpText, 'statezones');
  const statezoneOutcomes = transformStatezones(statezoneRows);
  const statezoneValidation = validateEntity('statezones', statezoneOutcomes, statezoneSchema);
  sections.push(
    buildEntitySection(
      statezoneValidation,
      detectDuplicateIdentities('statezones', statezoneValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['statezones: 1:1 field copy']
    )
  );

  const cityRows = extractTable(dumpText, 'cities');
  const cityOutcomes = transformCities(cityRows);
  const cityValidation = validateEntity('cities', cityOutcomes, citySchema);
  sections.push(
    buildEntitySection(
      cityValidation,
      detectDuplicateIdentities('cities', cityValidation.accepted),
      EXPECTED_TYPE_CONVERSIONS,
      ['cities: 1:1 field copy, ZoneId preserved as zoneId reference field']
    )
  );

  return buildParityReport('dry-run', sections, { orders: orderOrphanReport });
}
