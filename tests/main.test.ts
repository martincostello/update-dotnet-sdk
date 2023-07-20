// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { assertOutputValue, createGitRepo, execGit } from './TestHelpers';
import { run } from '../src/main';

const github = require('@actions/github');

describe('update-dotnet-sdk tests', () => {
  let tempDir: string;
  let globalJsonPath: string;
  let githubStepSummary: string;
  let inputs: any;

  beforeEach(async () => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(core, 'error').mockImplementation(() => {});
    jest.spyOn(core, 'setFailed').mockImplementation(() => {});

    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'update-dotnet-sdk-'));
    globalJsonPath = path.join(tempDir, 'global.json');
    githubStepSummary = path.join(tempDir, 'github-step-summary.md');

    inputs = {
      'GITHUB_API_URL': 'https://github.local/api/v3',
      'GITHUB_REPOSITORY': '',
      'GITHUB_SERVER_URL': 'https://github.local',
      'GITHUB_STEP_SUMMARY': githubStepSummary,
      'INPUT_COMMIT-MESSAGE-PREFIX': 'chore: ',
      'INPUT_GLOBAL-JSON-FILE': globalJsonPath,
      'INPUT_LABELS': 'foo,bar',
      'INPUT_REPO-TOKEN': 'my-token',
      'INPUT_USER-EMAIL': 'github-actions[bot]@users.noreply.github.com',
      'INPUT_USER-NAME': 'github-actions[bot]'
    };

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
  });

  afterEach(async () => {
    try {
      await io.rmRF(tempDir);
    } catch {
      console.log(`Failed to remove test directory '${tempDir}'.`);
    }
  }, 5000);

  test('Updates the .NET SDK in global.json if a new version is available', async () => {
    const sdkVersion = '3.1.201';
    const jsonContents = `{
      "sdk": {
        "version": "${sdkVersion}"
      }
    }`;

    await createGitRepo(globalJsonPath, jsonContents);

    github.getOctokit = jest.fn().mockReturnValue({
      rest: {
        issues: {
          addLabels: () => Promise.resolve({})
        },
        pulls: {
          create: () =>
            Promise.resolve({
              data: {
                number: '42',
                html_url: 'https://github.local/martincostello/update-dotnet-sdk/pull/42',
                head: {
                  ref: 'update-dotnet-sdk-3.1.201'
                }
              }
            })
        }
      }
    });

    await run();

    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenCalledTimes(0);

    await assertOutputValue('branch-name', 'update-dotnet-sdk-3.1.201');
    await assertOutputValue('pull-request-html-url', 'https://github.local/martincostello/update-dotnet-sdk/pull/42');
    await assertOutputValue('pull-request-number', '42');
    await assertOutputValue('sdk-updated', 'true');
    await assertOutputValue('security', 'true');

    const globalJson = JSON.parse(await fs.promises.readFile(globalJsonPath, {encoding: 'utf8'}));

    const actualVersion: string = globalJson.sdk.version;

    expect(actualVersion).not.toBe(sdkVersion);

    const commitMessage = await execGit(['log', '-1', '--pretty=%B'], tempDir);

    expect(commitMessage.startsWith(`chore: Update .NET SDK`)).toBe(true);
  }, 30000);
});
