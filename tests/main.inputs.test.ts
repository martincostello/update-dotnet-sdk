// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { afterAll, beforeAll, describe, expect, vi, test } from 'vitest';
import { ActionFixture } from './ActionFixture';
import * as core from '@actions/core';

const timeout = 30000;
const outputs = [
  ['aspnetcore-version'],
  ['branch-name'],
  ['commit-sha'],
  ['pull-request-html-url'],
  ['pull-request-number'],
  ['pull-requests-closed'],
  ['runtime-version'],
  ['sdk-updated'],
  ['sdk-version'],
  ['security'],
  ['windows-desktop-version'],
];

describe('update-dotnet-sdk', () => {
  beforeAll(() => {
    Date.now = vi.fn(() => new Date(Date.UTC(2023, 8 - 1, 25)).valueOf());
  });

  describe.each([
    ['close-superseded', 'false', 'close-superseded-false'],
    ['close-superseded', 'true', 'close-superseded-true'],
  ])('when %s is %s', (name: string, value: string, scenario: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture('6.0.100');
      await fixture.initialize(scenario, {
        [name]: value,
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

      test('updates the SDK version in global.json', () => {
        expect(fixture.committedSdkVersion()).toMatchSnapshot();
      });

      test('generates the expected commit message', () => {
        expect(fixture.commitMessage()).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe('when draft is true', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture('10.0.100-preview.4.25216.37');

      fixture.channel = '10.0.1xx';
      fixture.quality = 'daily';

      await fixture.initialize('draft-true', {
        draft: 'true',
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

      test('opens the pull request as a draft', () => {
        expect(fixture.getOutput('pull-request-number')).toBe('42');
      });
    });
  });
});
