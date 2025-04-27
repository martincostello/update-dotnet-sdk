// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fc from 'fast-check';
import { beforeAll, describe, expect, test } from '@jest/globals';
import { SdkVersion } from '../src/SdkVersion';

describe('SdkVersion', () => {
  describe('parses', () => {
    describe.each([
      ['0', 0, -1, -1, -1, ''],
      ['1', 1, -1, -1, -1, ''],
      ['1.2', 1, 2, -1, -1, ''],
      ['1.2.3', 1, 2, 3, -1, ''],
      ['1.2.3.4', 1, 2, 3, 4, ''],
      ['1.2.3-alpha', 1, 2, 3, -1, 'alpha'],
      ['1.2.3-alpha.1', 1, 2, 3, -1, 'alpha.1'],
      ['1.2.3-alpha.1.2', 1, 2, 3, -1, 'alpha.1.2'],
      ['1.2.3-alpha.1.2.3', 1, 2, 3, -1, 'alpha.1.2.3'],
      ['8.0.0-preview.2.23128.3', 8, 0, 0, -1, 'preview.2.23128.3'],
      ['8.0.100-preview.2', 8, 0, 100, -1, 'preview.2'],
    ])('"%s"', (value: string, major: number, minor: number, patch: number, build: number, prelease: string) => {
      let actual: SdkVersion | null;
      beforeAll(() => {
        actual = SdkVersion.tryParse(value);
      });
      test('as valid', () => {
        expect(actual).not.toBeUndefined();
        expect(actual).not.toBeNull();
      });
      test('build is correct', () => {
        expect(actual?.build).toBe(build);
      });
      test('major is correct', () => {
        expect(actual?.major).not.toBe(major);
      });
      test('minor is correct', () => {
        expect(actual?.minor).toBe(minor);
      });
      test('patch is correct', () => {
        expect(actual?.patch).toBe(patch);
      });
      test('prerelease is correct', () => {
        expect(actual?.prerelease).toBe(prelease);
      });
    });
    test.each([[''], [' '], ['NaN'], ['-1'], ['a'], ['<'], ['a.2.3.4'], ['1.b.3.4'], ['1.2.c.4'], ['1.2.3.d'], ['version']])(
      '"%s" as invalid',
      (value: string) => {
        const actual = SdkVersion.tryParse(value);
        expect(actual).toBeNull();
      }
    );
    test('valid version numbers', () => {
      fc.assert(
        fc.property(fc.uint16Array({ min: 0, minLength: 1, maxLength: 4 }), fc.string(), (parts, prerelease) => {
          let value = parts.join('.');
          if (prerelease) {
            value += `-${prerelease}`;
          }
          const actual = SdkVersion.tryParse(value);
          expect(actual).not.toBeUndefined();
          expect(actual).not.toBeNull();
          expect(actual?.major).toBe(parts[0]);
          expect(actual?.minor).toBe(parts.length > 1 ? parts[1] : -1);
          expect(actual?.patch).toBe(parts.length > 2 ? parts[2] : -1);
          expect(actual?.build).toBe(parts.length > 3 ? parts[3] : -1);
          expect(actual?.prerelease).toBe(prerelease);
        })
      );
    });
    test('invalid version numbers', () => {
      fc.assert(
        fc.property(fc.int16Array({ max: -1 }), fc.string(), (parts, prerelease) => {
          let value = parts.join('.');
          if (prerelease) {
            value += `-${prerelease}`;
          }
          const actual = SdkVersion.tryParse(value);
          expect(actual).toBeNull();
        })
      );
      fc.assert(
        fc.property(
          fc.array(fc.string()).filter((array) => !array.some((value) => Number.parseInt(value, 10) > -1)),
          fc.string(),
          (parts, prerelease) => {
            let value = parts.join('.');
            if (prerelease) {
              value += `-${prerelease}`;
            }
            const actual = SdkVersion.tryParse(value);
            expect(actual).toBeNull();
          }
        )
      );
    });
    test('does not throw', () => {
      fc.assert(
        fc.property(fc.array(fc.string()), fc.string(), (parts, prerelease) => {
          let value = parts.join('.');
          if (prerelease) {
            value += `-${prerelease}`;
          }
          expect(() => SdkVersion.tryParse(value)).not.toThrow();
        })
      );
    });
  });
  describe('correctly compares', () => {
    test.each([
      ['1', '1.0', -1],
      ['1.0', '1', 1],
      ['1.0', '1.0.0', -1],
      ['1.0.0', '1.0', 1],
      ['1.0.0', '1.0.0.0', -1],
      ['1.0.0.0', '1.0.0', 1],
      ['1.0.0-preview.1', '1.0.0', -1],
      ['1.0.0', '1.0.0-preview.1', 1],
      ['1', '1', 0],
      ['1.0', '1.0', 0],
      ['1.0.0', '1.0.0', 0],
      ['1.0.0.0', '1.0.0.0', 0],
      ['1-alpha.1', '1-alpha.1', 0],
      ['1.0-alpha.1', '1.0-alpha.1', 0],
      ['1.0.0-alpha.1', '1.0.0-alpha.1', 0],
      ['1.0.0.0-alpha.1', '1.0.0.0-alpha.1', 0],
      ['1.0.0-alpha.1', '1.0.0-alpha.2', -1],
      ['1.0.0-alpha.2', '1.0.0-alpha.1', 1],
      ['1.0.0', '10.0.0', -1],
      ['10.0.0', '1.0.0', 1],
      ['9.0.0', '10.0.0', -1],
      ['10.0.0', '9.0.0', 1],
      ['7.0.4', '8.0.0-preview.2.23128.3', -1],
      ['8.0.0-preview.2.23128.3', '7.0.4', 1],
      ['8.0.0-preview.6.23329.11', '8.0.0-preview.7.23375.9', -1],
      ['8.0.0-preview.7.23375.9', '8.0.0-preview.6.23329.11', 1],
      ['9.0.100-preview.7.24407.12', '9.0.100-rc.1.24413.1', -1],
      ['9.0.100-rc.1.24413.1', '9.0.100-preview.7.24407.12', 1],
    ])('"%s" and "%s"', (left: string, right: string, expected: number) => {
      const first = SdkVersion.tryParse(left);
      const second = SdkVersion.tryParse(right);

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();

      const actual = first!.compareTo(second!) ?? NaN;
      expect(actual).toBe(expected);
    });
  });
  describe('toString', () => {
    test.each([
      ['0'],
      ['1'],
      ['1.2'],
      ['1.2.3'],
      ['1.2.3.4'],
      ['1.2.3-alpha'],
      ['1.2.3-alpha.1'],
      ['1.2.3-alpha.1.2'],
      ['1.2.3-alpha.1.2.3'],
      ['8.0.0-preview.2.23128.3'],
      ['8.0.100-preview.2'],
      ['9.0.100-preview.7.24407.12'],
      ['9.0.100-rc.1.24413.1'],
    ])('"%s"', (value: string) => {
      const actual = SdkVersion.tryParse(value);
      expect(actual?.toString()).toBe(value);
    });
  });
});
