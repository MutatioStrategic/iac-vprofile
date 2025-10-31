/**
 * UUIDv7 Utility Tests
 *
 * Tests the UUIDv7 generation and utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateUUIDv7,
  extractTimestamp,
  isValidUUIDv7,
  compareUUIDv7
} from '@/lib/utils/uuidv7';

describe('UUIDv7 Utilities', () => {
  describe('generateUUIDv7', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUIDv7();

      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUIDv7();
      const uuid2 = generateUUIDv7();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with version 7', () => {
      const uuid = generateUUIDv7();
      const versionChar = uuid.charAt(14);

      expect(versionChar).toBe('7');
    });

    it('should generate time-ordered UUIDs', () => {
      const uuid1 = generateUUIDv7();
      // Small delay to ensure different timestamps
      const delay = () => new Promise(resolve => setTimeout(resolve, 2));

      return delay().then(() => {
        const uuid2 = generateUUIDv7();

        // UUID1 should be lexicographically smaller than UUID2
        expect(uuid1 < uuid2).toBe(true);
      });
    });

    it('should generate 100 unique UUIDs', () => {
      const uuids = new Set();

      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUIDv7());
      }

      expect(uuids.size).toBe(100);
    });
  });

  describe('extractTimestamp', () => {
    it('should extract timestamp from UUIDv7', () => {
      const beforeTime = Date.now();
      const uuid = generateUUIDv7();
      const afterTime = Date.now();

      const extractedTime = extractTimestamp(uuid);

      expect(extractedTime).not.toBeNull();
      expect(extractedTime!).toBeGreaterThanOrEqual(beforeTime);
      expect(extractedTime!).toBeLessThanOrEqual(afterTime);
    });

    it('should return null for invalid UUID', () => {
      const timestamp = extractTimestamp('invalid-uuid');

      expect(timestamp).toBeNull();
    });

    it('should return null for non-v7 UUID', () => {
      const uuidv4 = '550e8400-e29b-41d4-a716-446655440000';
      const timestamp = extractTimestamp(uuidv4);

      expect(timestamp).toBeNull();
    });

    it('should extract consistent timestamps', () => {
      const uuid = generateUUIDv7();
      const time1 = extractTimestamp(uuid);
      const time2 = extractTimestamp(uuid);

      expect(time1).toBe(time2);
    });
  });

  describe('isValidUUIDv7', () => {
    it('should validate correct UUIDv7', () => {
      const uuid = generateUUIDv7();

      expect(isValidUUIDv7(uuid)).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      expect(isValidUUIDv7('not-a-uuid')).toBe(false);
      expect(isValidUUIDv7('12345')).toBe(false);
      expect(isValidUUIDv7('')).toBe(false);
    });

    it('should reject UUIDv4', () => {
      const uuidv4 = '550e8400-e29b-41d4-a716-446655440000';

      expect(isValidUUIDv7(uuidv4)).toBe(false);
    });

    it('should reject malformed UUIDs', () => {
      expect(isValidUUIDv7('550e8400-e29b-71d4-a716-446655440000')).toBe(true); // v7
      expect(isValidUUIDv7('550e8400-e29b-61d4-a716-446655440000')).toBe(false); // v6
      expect(isValidUUIDv7('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // v5
    });

    it('should handle null and undefined', () => {
      expect(isValidUUIDv7(null as any)).toBe(false);
      expect(isValidUUIDv7(undefined as any)).toBe(false);
    });
  });

  describe('compareUUIDv7', () => {
    it('should compare two UUIDv7s by time', async () => {
      const uuid1 = generateUUIDv7();

      // Ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));

      const uuid2 = generateUUIDv7();

      const comparison = compareUUIDv7(uuid1, uuid2);

      expect(comparison).toBeLessThan(0); // uuid1 < uuid2
    });

    it('should return 0 for same UUID', () => {
      const uuid = generateUUIDv7();

      expect(compareUUIDv7(uuid, uuid)).toBe(0);
    });

    it('should return positive for uuid1 > uuid2', async () => {
      const uuid1 = generateUUIDv7();
      await new Promise(resolve => setTimeout(resolve, 2));
      const uuid2 = generateUUIDv7();

      expect(compareUUIDv7(uuid2, uuid1)).toBeGreaterThan(0);
    });

    it('should return null for invalid UUIDs', () => {
      const validUuid = generateUUIDv7();

      expect(compareUUIDv7('invalid', validUuid)).toBeNull();
      expect(compareUUIDv7(validUuid, 'invalid')).toBeNull();
      expect(compareUUIDv7('invalid1', 'invalid2')).toBeNull();
    });

    it('should sort array of UUIDs correctly', async () => {
      const uuids: string[] = [];

      // Generate UUIDs with small delays
      for (let i = 0; i < 5; i++) {
        uuids.push(generateUUIDv7());
        if (i < 4) await new Promise(resolve => setTimeout(resolve, 2));
      }

      // Shuffle array
      const shuffled = [...uuids].sort(() => Math.random() - 0.5);

      // Sort using compareUUIDv7
      const sorted = shuffled.sort((a, b) => compareUUIDv7(a, b) || 0);

      expect(sorted).toEqual(uuids);
    });
  });

  describe('integration tests', () => {
    it('should maintain time ordering across multiple generations', async () => {
      const uuids: string[] = [];
      const timestamps: number[] = [];

      for (let i = 0; i < 10; i++) {
        const uuid = generateUUIDv7();
        uuids.push(uuid);
        timestamps.push(extractTimestamp(uuid)!);

        if (i < 9) await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Check that timestamps are in ascending order
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }

      // Check that UUIDs are lexicographically sorted
      const sortedUuids = [...uuids].sort();
      expect(sortedUuids).toEqual(uuids);
    });

    it('should validate generated UUIDs', () => {
      for (let i = 0; i < 20; i++) {
        const uuid = generateUUIDv7();
        expect(isValidUUIDv7(uuid)).toBe(true);
      }
    });
  });
});
