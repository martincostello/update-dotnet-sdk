// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as path from 'path';
import * as io from '@actions/io';

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

import { DotNetSdkUpdater } from '../src/DotNetSdkUpdater';
import { UpdateOptions } from '../src/UpdateOptions';
import { createGlobalJsonForVersion, createTemporaryDirectory } from './TestHelpers';
import { setup } from './fixtures';

const timeout = 15000;

const repo = 'owner/repository';
const runId = '123';
const serverUrl = 'https://github.local';

const getChannel = async (version: string): Promise<any> => {
  return JSON.parse(await fs.promises.readFile(path.join(__dirname, 'fixtures', 'releases', `${version}.json`), { encoding: 'utf8' }));
};

describe('DotNetSdkUpdater', () => {
  beforeAll(async () => {
    await setup('releases/daily-8.0');
  });

  describe('tryUpdateSdk', () => {
    let updater: DotNetSdkUpdater;
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await createTemporaryDirectory();

      const globalJsonPath = path.join(tempDir, 'global.json');
      await createGlobalJsonForVersion(globalJsonPath, '99');

      updater = new DotNetSdkUpdater({
        accessToken: '',
        branch: '',
        channel: '',
        closeSuperseded: false,
        commitMessage: '',
        commitMessagePrefix: '',
        dryRun: false,
        generateStepSummary: false,
        globalJsonPath: globalJsonPath,
        labels: '',
        repo,
        runId,
        runRepo: repo,
        securityOnly: false,
        serverUrl,
        userEmail: '',
        userName: '',
      });
    });

    afterAll(async () => {
      await io.rmRF(tempDir);
    });

    test('throws if the SDK version is invalid', async () => {
      await expect(updater.tryUpdateSdk()).rejects.toThrow(/\'99\' is not a valid version/);
    });
  });

  describe('tryUpdateSdk', () => {
    let updater: DotNetSdkUpdater;
    let tempDir: string;

    beforeAll(async () => {
      tempDir = await createTemporaryDirectory();

      const globalJsonPath = path.join(tempDir, 'global.json');
      await createGlobalJsonForVersion(globalJsonPath, '99.0.100-preview.1.23115.2');

      updater = new DotNetSdkUpdater({
        accessToken: '',
        branch: '',
        channel: '99.0',
        closeSuperseded: false,
        commitMessage: '',
        commitMessagePrefix: '',
        dryRun: false,
        generateStepSummary: false,
        globalJsonPath: globalJsonPath,
        labels: '',
        quality: 'daily',
        repo,
        runId,
        runRepo: repo,
        securityOnly: false,
        serverUrl,
        userEmail: '',
        userName: '',
      });
    });

    afterAll(async () => {
      await io.rmRF(tempDir);
    });

    test('throws if the channel does not have any previews', async () => {
      await expect(updater.tryUpdateSdk()).rejects.toThrow(/Failed to get product commits for \.NET SDK channel 99\.0 and quality daily \- HTTP status 404/);
    });
  });

  test(
    'Gets correct info if a newer SDK is available for the same MSBuild version',
    async () => {
      const releaseInfo = await getChannel('3.1');
      expect(await DotNetSdkUpdater.getLatestRelease('3.1.100', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available for a different MSBuild version',
    async () => {
      const releaseInfo = await getChannel('5.0');
      expect(await DotNetSdkUpdater.getLatestRelease('5.0.103', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is not available',
    async () => {
      const releaseInfo = await getChannel('3.1');
      expect(await DotNetSdkUpdater.getLatestRelease('3.1.404', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is not available',
    async () => {
      const releaseInfo = await getChannel('6.0');
      expect(await DotNetSdkUpdater.getLatestRelease('6.0.100', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available that skips releases when latest is not a security release',
    async () => {
      const releaseInfo = await getChannel('7.0');
      expect(await DotNetSdkUpdater.getLatestRelease('7.0.100', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available that skips releases when latest is a security release',
    async () => {
      const releaseInfo = await getChannel('7.0.302');
      expect(await DotNetSdkUpdater.getLatestRelease('7.0.100', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available for the same runtime version',
    async () => {
      const releaseInfo = await getChannel('7.0.302');
      expect(await DotNetSdkUpdater.getLatestRelease('7.0.203', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  test(
    'Gets correct info between preview releases',
    async () => {
      const releaseInfo = await getChannel('8.0');
      expect(await DotNetSdkUpdater.getLatestRelease('8.0.100-preview.1.23115.2', releaseInfo)).toMatchSnapshot();
    },
    timeout
  );

  describe('getLatestDaily', () => {
    const preview1 = '8.0.100-preview.1.23115.2';
    const preview7 = '8.0.100-preview.7.23363.2';
    let releaseInfo;

    beforeAll(async () => {
      releaseInfo = await getChannel('8.0');
    });

    describe.each([
      ['8.0', 'daily', ''],
      ['8.0', 'daily', 'rc.1'],
      ['8.0', 'daily', 'rc.2'],
      ['8.0.1xx', 'daily', ''],
      ['8.0.1xx', 'daily', 'rc.1'],
      ['8.0.1xx', 'daily', 'rc.2'],
      ['8.0.1xx-preview7', 'daily', ''],
      ['8.0.1xx-preview7', 'daily', 'preview.7'],
      ['8.0.1xx-preview7', 'daily', 'rc.1'],
      ['8.0.1xx-preview7', 'daily', 'rc.2'],
    ])('for channel %s, quality %s and prerelease label "%s"', (channel: string, quality: string, prereleaseLabel: string) => {
      test(
        'Gets correct info for daily build from official build',
        async () => {
          expect(await DotNetSdkUpdater.getLatestDaily(preview1, channel, quality, prereleaseLabel, releaseInfo)).toMatchSnapshot();
        },
        timeout
      );

      test(
        'Gets correct info for daily build from daily build',
        async () => {
          expect(await DotNetSdkUpdater.getLatestDaily(preview7, channel, quality, prereleaseLabel, releaseInfo)).toMatchSnapshot();
        },
        timeout
      );
    });

    test.each([[''], ['foo'], ['GA']])('rejects invalid quality %s', async (quality: string) => {
      await expect(DotNetSdkUpdater.getLatestDaily(preview1, '8.0', quality, '', releaseInfo)).rejects.toThrow(/Invalid quality/);
    });
  });

  test.each([
    ['2.1.100', '3.0.101'],
    ['2.1.100', '3.1.101'],
    ['3.1.100', '3.1.101'],
    ['3.1.100', '3.1.200'],
    ['3.0.100', '3.1.100'],
    ['5.0.100', '6.0.100'],
  ])('Generates correct release notes from %s to %s as a %s update', (currentSdkVersion: string, latestSdkVersion: string) => {
    expect(DotNetSdkUpdater.generateCommitMessage(currentSdkVersion, latestSdkVersion)).toMatchSnapshot();
  });

  test.each([[false], [true]])('Sorts the CVEs in the pull request description', async (isGitHubEnterprise: boolean) => {
    const channel = await getChannel('7.0');
    const versions = DotNetSdkUpdater.getLatestRelease('7.0.100', channel);
    const options: UpdateOptions = {
      accessToken: '',
      branch: '',
      channel: '7.0',
      closeSuperseded: false,
      commitMessage: '',
      commitMessagePrefix: '',
      dryRun: false,
      generateStepSummary: false,
      globalJsonPath: '',
      labels: '',
      repo,
      runId,
      runRepo: repo,
      securityOnly: false,
      serverUrl,
      userEmail: '',
      userName: '',
    };
    expect(DotNetSdkUpdater.generatePullRequestBody(versions, options, isGitHubEnterprise)).toMatchSnapshot();
  });

  test.each([
    ['3.1', '3.1.403', '2023-05-02'],
    ['5.0', '5.0.102', '2023-05-02'],
    ['6.0', '6.0.407', '2023-05-02'],
    ['7.0', '7.0.201', '2023-03-14'],
    ['7.0', '7.0.201', '2023-03-15'],
    ['7.0', '7.0.201', '2023-03-16'],
    ['7.0', '7.0.201', '2023-05-02'],
    ['7.0.302', '7.0.203', '2023-05-02'],
    ['8.0', '8.0.100-preview.2.23157.25', '2023-05-02'],
  ])('Generates correct GitHub step summary for %s from %s on %s', async (channelVersion: string, sdkVersion: string, date: string) => {
    const [year, month, day] = date
      .split('-')
      .slice(0, 3)
      .map((x) => parseInt(x, 10));
    const today = new Date(Date.UTC(year, month - 1, day));
    const channel = await getChannel(channelVersion);
    const versions = DotNetSdkUpdater.getLatestRelease(sdkVersion, channel);
    expect(await DotNetSdkUpdater.generateSummary(versions, today)).toMatchSnapshot();
  });
});
