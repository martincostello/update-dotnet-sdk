// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { afterAll, beforeAll, describe, expect, vi, test } from 'vitest';

vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>();
  return {
    ...actual,
    setFailed: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    summary: {
      ...actual.summary,
      addRaw: vi.fn((text: string) => {
        // Call the real implementation but also mock it
        return actual.summary.addRaw(text);
      }),
      write: vi.fn(() => actual.summary),
    },
  };
});

import * as core from '@actions/core';
import { ActionFixture } from './ActionFixture';

const timeout = 30000;
const outputs = [
  ['aspnetcore-version'],
  ['branch-name'],
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
    ['dry-run', 'true', 'dry-run'],
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

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });
});
