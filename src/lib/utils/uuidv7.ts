/**
 * UUIDv7 Generator
 *
 * UUIDv7 provides time-ordered UUIDs that are excellent for:
 * - Database indexing (better than random UUIDs)
 * - Sorting by creation time
 * - Distributed systems
 *
 * Format: 48-bit timestamp + 12-bit random + 62-bit random
 */

/**
 * Generate a UUIDv7 string
 *
 * @returns A UUIDv7 string in format xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
 */
export function generateUUIDv7(): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now();

  // Create a buffer for the UUID (16 bytes)
  const bytes = new Uint8Array(16);

  // Fill with random values first
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for Node.js environments without crypto.getRandomValues
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set timestamp (48 bits = 6 bytes)
  // Big-endian encoding
  bytes[0] = (timestamp >> 40) & 0xff;
  bytes[1] = (timestamp >> 32) & 0xff;
  bytes[2] = (timestamp >> 24) & 0xff;
  bytes[3] = (timestamp >> 16) & 0xff;
  bytes[4] = (timestamp >> 8) & 0xff;
  bytes[5] = timestamp & 0xff;

  // Set version (4 bits) to 7
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Set variant (2 bits) to 10
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert to hex string with dashes
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Extract timestamp from UUIDv7
 *
 * @param uuid - UUIDv7 string
 * @returns Timestamp in milliseconds, or null if invalid
 */
export function extractTimestamp(uuid: string): number | null {
  try {
    // Remove dashes and validate format
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32) return null;

    // Check version is 7
    const version = parseInt(hex[12], 16);
    if ((version & 0xf0) !== 0x70) return null;

    // Extract timestamp bytes (first 48 bits = 12 hex chars)
    const timestampHex = hex.slice(0, 12);
    const timestamp = parseInt(timestampHex, 16);

    return timestamp;
  } catch {
    return null;
  }
}

/**
 * Validate UUIDv7 format
 *
 * @param uuid - String to validate
 * @returns true if valid UUIDv7
 */
export function isValidUUIDv7(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;

  // Check format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(uuid)) return false;

  // Try to extract timestamp
  const timestamp = extractTimestamp(uuid);
  return timestamp !== null;
}

/**
 * Generate multiple UUIDv7s in sequence
 * Ensures each UUID is unique even when generated in same millisecond
 *
 * @param count - Number of UUIDs to generate
 * @returns Array of UUIDv7 strings
 */
export function generateUUIDv7Batch(count: number): string[] {
  const uuids: string[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    let uuid: string;
    // Ensure uniqueness
    do {
      uuid = generateUUIDv7();
    } while (usedIds.has(uuid));

    usedIds.add(uuid);
    uuids.push(uuid);
  }

  return uuids;
}

/**
 * Compare two UUIDv7s chronologically
 *
 * @param a - First UUID
 * @param b - Second UUID
 * @returns -1 if a < b, 0 if equal, 1 if a > b, null if invalid
 */
export function compareUUIDv7(a: string, b: string): number | null {
  const tsA = extractTimestamp(a);
  const tsB = extractTimestamp(b);

  if (tsA === null || tsB === null) return null;

  if (tsA < tsB) return -1;
  if (tsA > tsB) return 1;

  // If timestamps are equal, compare full UUIDs lexicographically
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Sort array of UUIDv7s chronologically
 *
 * @param uuids - Array of UUIDs to sort
 * @returns Sorted array (does not modify original)
 */
export function sortUUIDv7(uuids: string[]): string[] {
  return [...uuids].sort((a, b) => {
    const cmp = compareUUIDv7(a, b);
    return cmp !== null ? cmp : 0;
  });
}

/**
 * Get age of UUIDv7 in milliseconds
 *
 * @param uuid - UUIDv7 string
 * @returns Age in milliseconds, or null if invalid
 */
export function getUUIDv7Age(uuid: string): number | null {
  const timestamp = extractTimestamp(uuid);
  if (timestamp === null) return null;

  return Date.now() - timestamp;
}
