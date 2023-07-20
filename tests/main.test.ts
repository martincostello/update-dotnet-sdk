// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { assertOutputValue } from './TestHelpers';
import { run } from '../src/main';
import { ActionFixture } from './ActionFixture';

describe.each([
  ['3.1.201', '', '3.1', 'Update .NET SDK'],
  ['3.1.201', 'chore:', '3.1', 'chore: Update .NET SDK'],
  ['6.0.100', '', '6.0', 'Update .NET SDK'],
  ['7.0.100', '', '7.0', 'Update .NET SDK'],
])('update-dotnet-sdk tests', (
  sdkVersion: string,
  commitMessagePrefix: string,
  expectedChannel: string,
  expectedCommitMessage: string) => {
  let fixture: ActionFixture;

  beforeEach(async () => {
    fixture = new ActionFixture(sdkVersion);
    fixture.commitMessagePrefix = commitMessagePrefix;
    await fixture.initialize();
  });

  afterEach(async () => {
    await fixture.destroy();
  }, 5000);

  test(`Updates the .NET ${sdkVersion} SDK in global.json if a new version is available`, async () => {
    await run();

    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenCalledTimes(0);

    await assertOutputValue('branch-name', `update-dotnet-sdk-${sdkVersion}`);
    await assertOutputValue('pull-request-html-url', `https://github.local/${fixture.repo}/pull/${fixture.pullNumber}`);
    await assertOutputValue('pull-request-number', fixture.pullNumber);
    await assertOutputValue('sdk-updated', 'true');
    await assertOutputValue('security', 'true');

    const actualSdkVersion = await fixture.sdkVersion();
    expect(actualSdkVersion.startsWith(`${expectedChannel}.`)).toBe(true);
    expect(actualSdkVersion).not.toBe(sdkVersion);

    const actualCommitMessage = await fixture.commitMessage();
    expect(actualCommitMessage.startsWith(expectedCommitMessage)).toBe(true);
  }, 30000);
});
