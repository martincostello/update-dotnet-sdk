// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { ActionFixture } from './ActionFixture';

describe('update-dotnet-sdk', () => {
  describe.each([
    ['daily', '8.0'],
    ['daily', '8.0.1xx'],
    ['daily', '8.0.1xx-preview7'],
  ])('for %s builds for channel "%s"', (quality: string, channel: string) => {
    const sdkVersion = '8.0.100-preview.6.23330.14';
    const commitMessagePrefix = '';

    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion, commitMessagePrefix);
      fixture.channel = channel;
      fixture.quality = quality;

      await fixture.initialize();
    });

    afterAll(async () => {
      await fixture.destroy();
    }, 5000);

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, 30000);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the SDK version in global.json', async () => {
        const actualSdkVersion = await fixture.sdkVersion();
        expect(actualSdkVersion).not.toBe(sdkVersion);
        expect(actualSdkVersion.startsWith('8.0.100-')).toBe(true);
      });
    });
  });
});
