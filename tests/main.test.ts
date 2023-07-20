// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { ActionFixture } from './ActionFixture';

describe('update-dotnet-sdk', () => {
  describe.each([
    ['3.1.201', '', '3.1', 'Update .NET SDK'],
    ['3.1.201', 'chore:', '3.1', 'chore: Update .NET SDK'],
    ['6.0.100', '', '6.0', 'Update .NET SDK'],
    ['7.0.100', '', '7.0', 'Update .NET SDK'],
  ])('for the %s SDK with a commit prefix of "%s"', (
    sdkVersion: string,
    commitMessagePrefix: string,
    expectedChannel: string,
    expectedCommitMessage: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion, commitMessagePrefix);
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
        expect(actualSdkVersion.startsWith(`${expectedChannel}.`)).toBe(true);
        expect(actualSdkVersion).not.toBe(sdkVersion);
      });

      test('generates the expected Git commit message', async () => {
        const actualCommitMessage = await fixture.commitMessage();
        expect(actualCommitMessage.startsWith(expectedCommitMessage)).toBe(true);
      });

      test('outputs the branch name', () => {
        expect(fixture.getOutput('branch-name')).toBe(`update-dotnet-sdk-${sdkVersion}`);
      });

      test('outputs the pull request URL', () => {
        expect(fixture.getOutput('pull-request-html-url')).toBe(`https://github.local/${fixture.repo}/pull/${fixture.pullNumber}`);
      });

      test('outputs the pull request number', () => {
        expect(fixture.getOutput('pull-request-number')).toBe(fixture.pullNumber);
      });

      test('outputs that the SDK was updated', () => {
        expect(fixture.getOutput('sdk-updated')).toBe('true');
      });

      test('outputs that update includes security fixes', () => {
        expect(fixture.getOutput('security')).toBe('true');
      });
    });
  });
});
