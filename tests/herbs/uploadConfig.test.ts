/**
 * `@/lib/herbs/uploads/config` tests (UNIT — pure validation, no
 * filesystem access).
 */

import { describe, it, expect } from 'vitest';
import {
  isAllowedImageType,
  extensionForType,
  validateUploadFile,
  MAX_UPLOAD_BYTES,
} from '@/lib/herbs/uploads/config';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

describe('isAllowedImageType / extensionForType', () => {
  it('accepts jpeg, png, webp', () => {
    expect(isAllowedImageType('image/jpeg')).toBe(true);
    expect(isAllowedImageType('image/png')).toBe(true);
    expect(isAllowedImageType('image/webp')).toBe(true);
  });

  it('rejects other types, including other image types', () => {
    expect(isAllowedImageType('image/gif')).toBe(false);
    expect(isAllowedImageType('image/svg+xml')).toBe(false);
    expect(isAllowedImageType('application/pdf')).toBe(false);
    expect(isAllowedImageType('text/html')).toBe(false);
  });

  it('maps each allowed type to the expected extension', () => {
    expect(extensionForType('image/jpeg')).toBe('jpg');
    expect(extensionForType('image/png')).toBe('png');
    expect(extensionForType('image/webp')).toBe('webp');
  });
});

describe('validateUploadFile', () => {
  it('rejects a null file', () => {
    const error = validateUploadFile(null);
    expect(error?.code).toBe('no-file');
  });

  it('rejects an empty (zero-byte) file', () => {
    const file = makeFile('empty.png', 'image/png', 0);
    const error = validateUploadFile(file);
    expect(error?.code).toBe('no-file');
  });

  it('rejects a disallowed MIME type', () => {
    const file = makeFile('malicious.svg', 'image/svg+xml', 1024);
    const error = validateUploadFile(file);
    expect(error?.code).toBe('bad-type');
  });

  it('rejects a file over the size limit', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', MAX_UPLOAD_BYTES + 1);
    const error = validateUploadFile(file);
    expect(error?.code).toBe('too-large');
  });

  it('accepts a well-formed jpeg within the size limit', () => {
    const file = makeFile('ashwagandha.jpg', 'image/jpeg', 1024 * 100);
    expect(validateUploadFile(file)).toBeNull();
  });

  it('accepts a file exactly at the size limit', () => {
    const file = makeFile('exact.png', 'image/png', MAX_UPLOAD_BYTES);
    expect(validateUploadFile(file)).toBeNull();
  });
});
