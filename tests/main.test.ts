// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const github = require('@actions/github');

import {run} from '../src/main';

import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';

const tempDir = path.join(os.tmpdir(), 'update-dotnet-sdk-temp');
const globalJsonPath = path.join(tempDir, 'global.json');

describe('update-dotnet-sdk tests', () => {
  const inputs = {
    'GITHUB_API_URL': 'https://github.local/api/v3',
    'GITHUB_REPOSITORY': '',
    'GITHUB_SERVER_URL': 'https://github.local',
    'INPUT_GLOBAL-JSON-FILE': globalJsonPath,
    'INPUT_LABELS': 'foo,bar',
    'INPUT_REPO-TOKEN': 'my-token',
    'INPUT_USER-EMAIL': 'github-actions[bot]@users.noreply.github.com',
    'INPUT_USER-NAME': 'github-actions[bot]'
  };

  beforeEach(async () => {
    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }

    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(core, 'error').mockImplementation(() => {});
    jest.spyOn(core, 'setFailed').mockImplementation(() => {});
    await io.rmRF(tempDir);
  });

  afterEach(async () => {
    try {
      await io.rmRF(path.join(tempDir, 'global.json'));
      await io.rmRF(tempDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 5000);

  test('Updates the .NET SDK in global.json if a new version is available', async () => {
    const sdkVersion = '3.1.201';
    const jsonContents = `{${os.EOL}"sdk": {${os.EOL}"version": "${sdkVersion}"${os.EOL}}${os.EOL}}`;

    await createTestGitRepo(globalJsonPath, jsonContents);

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
                html_url: 'https://github.local/martincostello/update-dotnet-sdk/pull/42'
              }
            })
        }
      }
    });

    await run();

    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenCalledTimes(0);

    assertOutputValue('pull-request-html-url', 'https://github.local/martincostello/update-dotnet-sdk/pull/42');
    assertOutputValue('pull-request-number', '42');
    assertOutputValue('sdk-updated', 'true');
    assertOutputValue('security', 'true');

    const globalJson = JSON.parse(fs.readFileSync(globalJsonPath, {encoding: 'utf8'}));

    const actualVersion: string = globalJson.sdk.version;

    expect(actualVersion).not.toBe(sdkVersion);
  }, 30000);
});

function assertOutputValue(name: string, value: string): void {
  const outputPath = process.env['GITHUB_OUTPUT'];
  if (outputPath) {
    const buffer = fs.readFileSync(outputPath);
    const content = buffer.toString();
    expect(content).toContain(`${name}<<`);
    expect(content).toContain(`${os.EOL}${value}${os.EOL}`);
  } else {
    const expected = `::set-output name=${name}::${value}${os.EOL}`
    expect(process.stdout.write).toHaveBeenCalledWith(expected);
  }
}

async function createTestGitRepo(path: string, data: string): Promise<void> {
  if (!fs.existsSync(tempDir)) {
    await io.mkdirP(tempDir);
  }

  fs.appendFileSync(path, data);
  fs.writeFileSync(path, data);

  const options = {
    cwd: tempDir,
    ignoreReturnCode: true
  };

  let execGit = async (...args: string[]) => {
    await exec.exec('git', args, options);
  };

  await execGit('init');
  await execGit('config', 'core.safecrlf', 'false');
  await execGit('config', 'user.email', 'test@test.local');
  await execGit('config', 'user.name', 'test');
  await execGit('add', '.');
  await execGit('commit', '-m', 'Initial commit');
}
