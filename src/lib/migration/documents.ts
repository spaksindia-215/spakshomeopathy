/**
 * Accepted-document extraction — M3-C's bridge between the M3-B pipeline
 * (which reports COUNTS via `runPipeline`/`MigrationParityReport`) and an
 * actual write path (which needs the DOCUMENTS themselves).
 *
 * WHY A SEPARATE FUNCTION, NOT A CHANGE TO `runPipeline` (pipeline.ts)
 * ------------------------------------------------------------------------
 * `runPipeline`'s return shape (`MigrationParityReport`) is explicitly
 * owner-accepted in M3-B ("migration parity reporting" is listed among
 * the things that "must remain unchanged" in the M3-B review). Modifying
 * its signature to also return raw documents would be a change to an
 * already-accepted deliverable for no necessary reason — this file
 * achieves the same goal (get the validated documents for writing)
 * WITHOUT touching `runPipeline` or its 9 passing pipeline tests at all.
 *
 * NO TRANSFORMATION LOGIC IS DUPLICATED HERE. Every function called below
 * (`extractTable`, `transformX`, `validateEntity`) is the EXACT SAME
 * function `runPipeline` calls — this file does not reimplement any
 * mapping rule. Per owner instruction (M3-C §4): "Use the exact M3-B
 * transformation logic. Do not create a second transformation
 * implementation." This file is a second CALLER of the same logic, not a
 * second IMPLEMENTATION of it.
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
  type User,
  type Product,
  type Category,
  type ProductCategory,
  type Order,
  type OrderProduct,
  type Payment,
  type Appointment,
  type Enquiry,
  type Slider,
  type PinCode,
  type Post,
  type HomeopathyMaster,
  type Blog,
  type BlogCategory,
  type Statezone,
  type City,
} from '@/lib/mongodb/schemas';
import { COLLECTIONS } from '@/lib/mongodb/collections';

export interface AcceptedDocuments {
  [COLLECTIONS.users]: User[];
  [COLLECTIONS.products]: Product[];
  [COLLECTIONS.categories]: Category[];
  [COLLECTIONS.productCategories]: ProductCategory[];
  [COLLECTIONS.orders]: Order[];
  [COLLECTIONS.orderProducts]: OrderProduct[];
  [COLLECTIONS.payments]: Payment[];
  [COLLECTIONS.appointments]: Appointment[];
  [COLLECTIONS.enquiries]: Enquiry[];
  [COLLECTIONS.sliders]: Slider[];
  [COLLECTIONS.pinCodes]: PinCode[];
  [COLLECTIONS.posts]: Post[];
  [COLLECTIONS.homeopathyMaster]: HomeopathyMaster[];
  [COLLECTIONS.blogs]: Blog[];
  [COLLECTIONS.blogCategories]: BlogCategory[];
  [COLLECTIONS.statezones]: Statezone[];
  [COLLECTIONS.cities]: City[];
}

/**
 * Runs extraction → transformation → validation for every M3-B-covered
 * entity and returns the ACCEPTED documents (not a summary report) keyed
 * by collection name, ready to be handed to
 * `ValidatedRepository.upsertByLegacyId`.
 *
 * Rejected records are NOT included here (by design — this function's
 * purpose is "give me what's ready to write"; call `runPipeline` on the
 * same `dumpText` separately to get the full parity report, including
 * rejections, warnings, and relationship issues, exactly as M3-B built it).
 */
export function getAcceptedDocuments(dumpText: string): AcceptedDocuments {
  const buyerProfileRows = extractTable(dumpText, 'buyer_profile');
  const imageRows = extractTable(dumpText, 'product_images');
  const reviewRows = extractTable(dumpText, 'product_review');
  const specificationRows = extractTable(dumpText, 'product_specification');

  return {
    [COLLECTIONS.users]: validateEntity(
      'users',
      transformUsers(extractTable(dumpText, 'users'), buyerProfileRows),
      userSchema
    ).accepted,
    [COLLECTIONS.products]: validateEntity(
      'products',
      transformProducts(
        extractTable(dumpText, 'products'),
        imageRows,
        reviewRows,
        specificationRows
      ),
      productSchema
    ).accepted,
    [COLLECTIONS.categories]: validateEntity(
      'categories',
      transformCategories(extractTable(dumpText, 'categories')),
      categorySchema
    ).accepted,
    [COLLECTIONS.productCategories]: validateEntity(
      'productCategories',
      transformProductCategories(extractTable(dumpText, 'product_category')),
      productCategorySchema
    ).accepted,
    [COLLECTIONS.orders]: validateEntity(
      'orders',
      transformOrders(extractTable(dumpText, 'orders')),
      orderSchema
    ).accepted,
    [COLLECTIONS.orderProducts]: validateEntity(
      'orderProducts',
      transformOrderProducts(extractTable(dumpText, 'orderproducts')),
      orderProductSchema
    ).accepted,
    [COLLECTIONS.payments]: validateEntity(
      'payments',
      transformPayments(extractTable(dumpText, 'payments')),
      paymentSchema
    ).accepted,
    [COLLECTIONS.appointments]: validateEntity(
      'appointments',
      transformAppointments(extractTable(dumpText, 'tbl_appointment')),
      appointmentSchema
    ).accepted,
    [COLLECTIONS.enquiries]: validateEntity(
      'enquiries',
      transformEnquiries(extractTable(dumpText, 'enquiries')),
      enquirySchema
    ).accepted,
    [COLLECTIONS.sliders]: validateEntity(
      'sliders',
      transformSliders(extractTable(dumpText, 'slider')),
      sliderSchema
    ).accepted,
    [COLLECTIONS.pinCodes]: validateEntity(
      'pinCodes',
      transformPinCodes(extractTable(dumpText, 'pin_codes')),
      pinCodeSchema
    ).accepted,
    [COLLECTIONS.posts]: validateEntity(
      'posts',
      transformPosts(extractTable(dumpText, 'tbl_post')),
      postSchema
    ).accepted,
    [COLLECTIONS.homeopathyMaster]: validateEntity(
      'homeopathyMaster',
      transformHomeopathyMasters(extractTable(dumpText, 'tbl_homeopathy')),
      homeopathyMasterSchema
    ).accepted,
    [COLLECTIONS.blogs]: validateEntity(
      'blogs',
      transformBlogs(extractTable(dumpText, 'blogs')),
      blogSchema
    ).accepted,
    [COLLECTIONS.blogCategories]: validateEntity(
      'blogCategories',
      transformBlogCategories(extractTable(dumpText, 'blog_category')),
      blogCategorySchema
    ).accepted,
    [COLLECTIONS.statezones]: validateEntity(
      'statezones',
      transformStatezones(extractTable(dumpText, 'statezones')),
      statezoneSchema
    ).accepted,
    [COLLECTIONS.cities]: validateEntity(
      'cities',
      transformCities(extractTable(dumpText, 'cities')),
      citySchema
    ).accepted,
  };
}
