/**
 * Transforms for structurally simple entities — appointments, enquiries,
 * sliders, pincodes, posts (+ homeopathyMaster/blogs/blogCategories),
 * geo (statezones/cities). Grouped in one file because each has no
 * non-trivial embedding/matching logic (unlike users→buyerProfile or
 * products→images/reviews/specs), matching how docs/M3-DATABASE-MAPPING.md
 * itself groups these under "Remaining tables — summary treatment."
 */

import type {
  Appointment,
  Enquiry,
  Slider,
  PinCode,
  Post,
  HomeopathyMaster,
  Blog,
  BlogCategory,
  Statezone,
  City,
} from '@/lib/mongodb/schemas';
import { toDate, toLegacyId } from '@/lib/mongodb/mapping';
import type { SourceRecord, TransformOutcome } from './types';

function s(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
function n(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function withId<T>(row: SourceRecord, build: (legacyId: number) => T): TransformOutcome<T> {
  const legacyId = row.id;
  if (typeof legacyId !== 'number') {
    return {
      ok: false,
      legacyId: typeof legacyId === 'string' ? legacyId : null,
      reason: 'missing/invalid id',
      sourceRecord: row,
    };
  }
  try {
    const value = build(toLegacyId(legacyId));
    return { ok: true, value, legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformAppointment(row: SourceRecord): TransformOutcome<Appointment> {
  return withId(row, (legacyId) => ({
    legacyId,
    name: s(row.name),
    age: n(row.age),
    gender: s(row.gender),
    phone: s(row.phone),
    appointmentDate: s(row.appointment_date),
    consultantHour: s(row.consultant_hour),
    createdAt: toDate(row.created_at as string) ?? new Date(0),
    updatedAt: toDate(row.updated_at as string) ?? new Date(0),
  }));
}

export function transformEnquiry(row: SourceRecord): TransformOutcome<Enquiry> {
  // Per owner instruction (M3-B §1): no spam filtering — every row
  // migrates, including the ~16,386-row mostly-spam enquiries table
  // (DR-07 default, docs/M3-OWNER-DECISION-RECORDS.md).
  return withId(row, (legacyId) => ({
    legacyId,
    name: s(row.name),
    email: s(row.email),
    mobile: s(row.mobile), // P-01: always null today — preserved, not populated
    subject: s(row.subject),
    message: s(row.message),
    createdAt: toDate(row.created_at as string) ?? new Date(0),
    updatedAt: toDate(row.updated_at as string) ?? new Date(0),
  }));
}

export function transformSlider(row: SourceRecord): TransformOutcome<Slider> {
  return withId(row, (legacyId) => ({
    legacyId,
    sliderTitle: s(row.slider_title) ?? '',
    sliderSubtitle: s(row.slider_subtitle) ?? '',
    sliderImage: s(row.slider_image) ?? '',
    sliderStatus: n(row.slider_status) ?? 0,
    createdAt: toDate(row.created_at as string),
    updatedAt: toDate(row.updated_at as string),
  }));
}

export function transformPinCode(row: SourceRecord): TransformOutcome<PinCode> {
  // Describes the collection's REAL shape (pincode/location/country/uid),
  // not the mismatched column names B-09's controller writes — see
  // src/lib/mongodb/schemas/pinCode.ts and repositories/pinCodeRepository.ts.
  return withId(row, (legacyId) => ({
    legacyId,
    uid: n(row.uid),
    country: s(row.country),
    pincode: s(row.pincode),
    location: s(row.location),
    status: s(row.status), // source: varchar, not numeric — preserved
    createdAt: toDate(row.created_at as string),
    updatedAt: toDate(row.updated_at as string),
  }));
}

export function transformPost(row: SourceRecord): TransformOutcome<Post> {
  const legacyId = row.id;
  if (legacyId === null || legacyId === undefined || typeof legacyId !== 'number') {
    return { ok: false, legacyId: null, reason: 'missing id', sourceRecord: row };
  }
  try {
    // p_id is NOT NULL varchar(400) in source — a genuinely unusual
    // column (see schemas/post.ts's header note). If missing, this is a
    // real data-integrity finding for the verify stage to report.
    const pId = s(row.p_id);
    if (pId === null) {
      return {
        ok: false,
        legacyId,
        reason: 'p_id is NOT NULL in source but was null/missing',
        sourceRecord: row,
      };
    }
    const post: Post = {
      legacyId: toLegacyId(legacyId),
      pId,
      homeopathyId: n(row.post_homeopathy),
      diseaseId: n(row.post_diseases),
      postTitle: s(row.post_title),
      postImage: s(row.post_image),
      postDesc: s(row.post_desc),
      postStatus: n(row.post_status),
      createdAt: toDate(row.created_at as string) ?? new Date(0),
      updatedAt: toDate(row.updated_at as string) ?? new Date(0),
    };
    return { ok: true, value: post, legacyId };
  } catch (e) {
    return {
      ok: false,
      legacyId,
      reason: e instanceof Error ? e.message : String(e),
      sourceRecord: row,
    };
  }
}

export function transformHomeopathyMaster(row: SourceRecord): TransformOutcome<HomeopathyMaster> {
  return withId(row, (legacyId) => ({
    legacyId,
    name: s(row.name),
    image: s(row.image),
    slug: s(row.slug),
    status: n(row.status),
    createdAt: toDate(row.created_at as string) ?? new Date(0),
  }));
}

export function transformBlog(row: SourceRecord): TransformOutcome<Blog> {
  return withId(row, (legacyId) => ({
    legacyId,
    categoryId: n(row.blog_catid),
    blogTitle: s(row.blog_title),
    blogImage: s(row.blog_image),
    blogDesc: s(row.blog_desc),
    blogAuthor: s(row.blog_author),
    blogSlug: s(row.blog_slug),
    blogStatus: n(row.blog_status),
    createdAt: toDate(row.created_at as string),
    updatedAt: toDate(row.updated_at as string),
  }));
}

export function transformBlogCategory(row: SourceRecord): TransformOutcome<BlogCategory> {
  return withId(row, (legacyId) => ({
    legacyId,
    bcatName: s(row.bcat_name),
    bcatImage: s(row.bcat_image),
    bcatSlug: s(row.bcat_slug),
    createdAt: toDate(row.created_at as string),
    updatedAt: toDate(row.updated_at as string),
  }));
}

export function transformStatezone(row: SourceRecord): TransformOutcome<Statezone> {
  return withId(row, (legacyId) => ({
    legacyId,
    countryId: n(row.CountryId),
    zoneName: s(row.ZoneName),
    status: n(row.status),
    createdAt: toDate(row.created_at as string) ?? new Date(0),
    updatedAt: toDate(row.updated_at as string) ?? new Date(0),
  }));
}

export function transformCity(row: SourceRecord): TransformOutcome<City> {
  return withId(row, (legacyId) => ({
    legacyId,
    zoneId: n(row.ZoneId),
    cityName: s(row.CityName),
    pinCode: n(row.PinCode),
    status: n(row.status),
    createdAt: toDate(row.created_at as string),
    updatedAt: toDate(row.updated_at as string) ?? new Date(0),
  }));
}

// Batch entry points — one per entity, thin wrappers for pipeline
// consistency with the other transform files.
export const transformAppointments = (rows: SourceRecord[]) => rows.map(transformAppointment);
export const transformEnquiries = (rows: SourceRecord[]) => rows.map(transformEnquiry);
export const transformSliders = (rows: SourceRecord[]) => rows.map(transformSlider);
export const transformPinCodes = (rows: SourceRecord[]) => rows.map(transformPinCode);
export const transformPosts = (rows: SourceRecord[]) => rows.map(transformPost);
export const transformHomeopathyMasters = (rows: SourceRecord[]) =>
  rows.map(transformHomeopathyMaster);
export const transformBlogs = (rows: SourceRecord[]) => rows.map(transformBlog);
export const transformBlogCategories = (rows: SourceRecord[]) => rows.map(transformBlogCategory);
export const transformStatezones = (rows: SourceRecord[]) => rows.map(transformStatezone);
export const transformCities = (rows: SourceRecord[]) => rows.map(transformCity);
