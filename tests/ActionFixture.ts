// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as io from '@actions/io';
import * as os from 'os';
import * as path from 'path';
import { jest } from '@jest/globals';
import { createGitRepo, execGit } from './TestHelpers';

const github = require('@actions/github');

export class ActionFixture {
  public commitMessagePrefix: string = '';
  public pullNumber: string = '42';
  public repo: string = 'martincostello/update-dotnet-sdk';

  private tempDir: string = '';
  private globalJsonPath: string = '';
  private githubStepSummary: string = '';

  constructor(private initialSdkVersion: string) {
  }

  get path(): string {
    return this.tempDir;
  }

  async initialize(): Promise<void> {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(core, 'error').mockImplementation(() => {});
    jest.spyOn(core, 'setFailed').mockImplementation(() => {});

    this.tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'update-dotnet-sdk-'));
    this.globalJsonPath = path.join(this.tempDir, 'global.json');
    this.githubStepSummary = path.join(this.tempDir, 'github-step-summary.md');

    await createGitRepo(this.globalJsonPath, `{
      "sdk": {
        "version": "${this.initialSdkVersion}"
      }
    }`);

    this.setupEnvironment();
    this.setupPullRequest();
  }

  async destroy(): Promise<void> {
    try {
      await io.rmRF(this.tempDir);
    } catch {
      console.log(`Failed to remove fixture directory '${this.path}'.`);
    }
  }

  async commitMessage(): Promise<string> {
    return await execGit(['log', '-1', '--pretty=%B'], this.tempDir);
  }

  async sdkVersion():  Promise<string> {
    const globalJson = JSON.parse(await fs.promises.readFile(this.globalJsonPath, {encoding: 'utf8'}));
    return globalJson.sdk.version;
  }

  private setupEnvironment(): void {
    const inputs = {
      'GITHUB_API_URL': 'https://github.local/api/v3',
      'GITHUB_REPOSITORY': '',
      'GITHUB_SERVER_URL': 'https://github.local',
      'GITHUB_STEP_SUMMARY': this.githubStepSummary,
      'INPUT_COMMIT-MESSAGE-PREFIX': this.commitMessagePrefix,
      'INPUT_GLOBAL-JSON-FILE': this.globalJsonPath,
      'INPUT_LABELS': 'foo,bar',
      'INPUT_REPO-TOKEN': 'my-token',
      'INPUT_USER-EMAIL': 'github-actions[bot]@users.noreply.github.com',
      'INPUT_USER-NAME': 'github-actions[bot]'
    };

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
  }

  private setupPullRequest(): void {
    github.getOctokit = jest.fn().mockReturnValue({
      rest: {
        issues: {
          addLabels: () => Promise.resolve({})
        },
        pulls: {
          create: () =>
            Promise.resolve({
              data: {
                number: this.pullNumber,
                html_url: `https://github.local/${this.repo}/pull/${this.pullNumber}`,
                head: {
                  ref: `update-dotnet-sdk-${this.initialSdkVersion}`
                }
              }
            })
        }
      }
    });
  }
}
