// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as core from '@actions/core';
import * as fs from 'fs';
import * as io from '@actions/io';
import * as os from 'os';
import * as path from 'path';
import { jest } from '@jest/globals';
import { createEmptyFile, createGitRepo, createTemporaryDirectory, execGit } from './TestHelpers';
import { run } from '../src/main';

const github = require('@actions/github');

export class ActionFixture {
  public channel: string = '';
  public pullNumber: string = '42';
  public repo: string = 'martincostello/update-dotnet-sdk';
  public quality: string = '';
  public stepSummary: string = '';

  private tempDir: string = '';
  private globalJsonPath: string = '';
  private outputPath: string = '';
  private outputs: Record<string, string> = {};

  constructor(
    private readonly initialSdkVersion: string,
    private readonly commitMessagePrefix = ''
  ) {}

  get path(): string {
    return this.tempDir;
  }

  async initialize(): Promise<void> {
    this.tempDir = await createTemporaryDirectory();
    this.globalJsonPath = path.join(this.tempDir, 'global.json');
    this.outputPath = path.join(this.tempDir, 'github-outputs');

    await createEmptyFile(this.outputPath);
    await createGitRepo(this.globalJsonPath, this.initialSdkVersion);

    this.setupEnvironment();
    this.setupMocks();
  }

  async run(): Promise<void> {
    await run();

    const content = await fs.promises.readFile(this.outputPath, 'utf8');

    const lines = content.split(os.EOL);
    for (let index = 0; index < lines.length; index += 3) {
      const key = lines[index].split('<<')[0];
      const value = lines[index + 1];
      this.outputs[key] = value;
    }
  }

  async destroy(): Promise<void> {
    try {
      await io.rmRF(this.tempDir);
    } catch {
      console.log(`Failed to remove fixture directory '${this.path}'.`);
    }
  }

  getOutput(name: string): string {
    return this.outputs[name];
  }

  async commitMessage(): Promise<string> {
    return await execGit(['log', '-1', '--pretty=%B'], this.tempDir);
  }

  async sdkVersion(): Promise<string> {
    const globalJson = JSON.parse(await fs.promises.readFile(this.globalJsonPath, { encoding: 'utf8' }));
    return globalJson.sdk.version;
  }

  private setupEnvironment(): void {
    const inputs = {
      'GITHUB_API_URL': 'https://github.local/api/v3',
      'GITHUB_OUTPUT': this.outputPath,
      'GITHUB_REPOSITORY': this.repo,
      'GITHUB_RUN_ID': '123',
      'GITHUB_SERVER_URL': 'https://github.local',
      'INPUT_CHANNEL': this.channel,
      'INPUT_COMMIT-MESSAGE-PREFIX': this.commitMessagePrefix,
      'INPUT_GLOBAL-JSON-FILE': this.globalJsonPath,
      'INPUT_LABELS': 'foo,bar',
      'INPUT_QUALITY': this.quality,
      'INPUT_REPO-TOKEN': 'my-token',
      'INPUT_USER-EMAIL': 'github-actions[bot]@users.noreply.github.com',
      'INPUT_USER-NAME': 'github-actions[bot]',
    };

    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
  }

  private setupMocks(): void {
    jest.spyOn(core, 'setFailed').mockImplementation(() => {});
    this.setupLogging();
    this.setupPullRequest();
  }

  private setupLogging(): void {
    const logger = (level: string, arg: string | Error) => {
      console.debug(`[${level}] ${arg}`);
    };

    jest.spyOn(core, 'debug').mockImplementation((arg) => {
      logger('debug', arg);
    });
    jest.spyOn(core, 'info').mockImplementation((arg) => {
      logger('info', arg);
    });
    jest.spyOn(core, 'notice').mockImplementation((arg) => {
      logger('notice', arg);
    });
    jest.spyOn(core, 'warning').mockImplementation((arg) => {
      logger('warning', arg);
    });
    jest.spyOn(core, 'error').mockImplementation((arg) => {
      logger('error', arg);
    });

    jest.spyOn(core.summary, 'addRaw').mockImplementation((text: string) => {
      this.stepSummary += text;
      return core.summary;
    });
    jest.spyOn(core.summary, 'write').mockReturnThis();
  }

  private setupPullRequest(): void {
    github.getOctokit = jest.fn().mockReturnValue({
      rest: {
        issues: {
          addLabels: () => Promise.resolve({}),
        },
        pulls: {
          create: () =>
            Promise.resolve({
              data: {
                number: this.pullNumber,
                html_url: `https://github.local/${this.repo}/pull/${this.pullNumber}`,
                head: {
                  ref: `update-dotnet-sdk-${this.initialSdkVersion}`,
                },
              },
            }),
        },
      },
    });
  }
}
