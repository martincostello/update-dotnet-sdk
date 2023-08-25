// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { ActionFixture } from './ActionFixture';

const timeout = 30000;
const inputs = [
  ['branch-name'],
  ['pull-request-html-url'],
  ['pull-request-number'],
  ['pull-requests-closed'],
  ['sdk-updated'],
  ['sdk-version'],
  ['security'],
];

describe('update-dotnet-sdk', () => {
  beforeAll(() => {
    Date.now = jest.fn(() => new Date(Date.UTC(2023, 8 - 1, 25)).valueOf());
  });

  describe.each([
    ['2.1', '2.1.500', ''],
    ['3.1', '3.1.201', ''],
    ['3.1', '3.1.201', 'chore:'],
    ['6.0', '6.0.100', ''],
    ['7.0', '7.0.100', ''],
    ['7.0-sdk-only', '7.0.307', ''],
    ['8.0', '8.0.100-preview.6.23330.14', ''],
  ])('%s for the %s SDK with a commit prefix of "%s"', (scenario: string, sdkVersion: string, commitMessagePrefix: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion, commitMessagePrefix);
      await fixture.initialize(scenario);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory()).toMatchSnapshot();
      });

      test('generates the expected Git diff', async () => {
        expect(await fixture.diff()).toMatchSnapshot();
      });

      test('generates the expected GitHub step summary', async () => {
        expect(fixture.stepSummary).toMatchSnapshot();
      });

      test.each(inputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe.each([
    ['2.1', '2.1.818'],
    ['3.1', '3.1.426'],
    ['6.0', '6.0.413'],
    ['7.0', '7.0.400'],
    ['8.0', '8.0.100-preview.7.23376.3'],
  ])('%s when the .NET SDK is up-to-date', (scenario: string, sdkVersion: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion);
      await fixture.initialize(scenario);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('does not update the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test.each(inputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe.each([
    ['daily', '8.0'],
    ['daily', '8.0.1xx'],
    ['daily', '8.0.1xx-preview7'],
  ])('%s builds for channel "%s"', (quality: string, channel: string) => {
    const sdkVersion = '8.0.100-preview.6.23330.14';

    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion);
      fixture.channel = channel;
      fixture.quality = quality;

      await fixture.initialize(`${quality}-${channel}`);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test('generates the expected GitHub step summary', async () => {
        expect(fixture.stepSummary).toMatchSnapshot();
      });

      test.each(inputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe('when dry-run is true', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture('6.0.100');
      await fixture.initialize('dry-run', {
        'dry-run': 'true',
      });
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test.each(inputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });
});
