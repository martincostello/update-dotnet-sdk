// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as path from 'path';
import * as updater from '../src/DotNetSdkUpdater';

import { beforeAll, describe, expect, test } from '@jest/globals';
import { UpdateOptions } from '../src/UpdateOptions';

describe('DotNetSdkUpdater tests', () => {
  const timeout = 10000;

  test(
    'Gets correct info if a newer SDK is available for the same MSBuild version',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-3.1.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('3.1.100', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/3.1/3.1.0/3.1.0.md');
      expect(actual.current.runtimeVersion).toBe('3.1.0');
      expect(actual.current.sdkVersion).toBe('3.1.100');
      expect(actual.current.security).toBe(false);
      expect(actual.current.securityIssues).not.toBeNull();

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/3.1/3.1.10/3.1.10.md');
      expect(actual.latest.runtimeVersion).toBe('3.1.10');
      expect(actual.latest.sdkVersion).toBe('3.1.404');
      expect(actual.latest.security).toBe(false);
      expect(actual.latest.securityIssues).not.toBeNull();

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).not.toBe(0);
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available for a different MSBuild version',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-5.0.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('5.0.103', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/5.0/5.0.3/5.0.200-sdk.md');
      expect(actual.current.runtimeVersion).toBe('5.0.3');
      expect(actual.current.sdkVersion).toBe('5.0.103');
      expect(actual.current.security).toBe(true);
      expect(actual.current.securityIssues).not.toBeNull();
      expect(actual.current.securityIssues.length).toBe(2);
      expect(actual.current.securityIssues[0].id).toBe('CVE-2021-1721');
      expect(actual.current.securityIssues[1].id).toBe('CVE-2021-24112');

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/5.0/5.0.3/5.0.200-sdk.md');
      expect(actual.latest.runtimeVersion).toBe('5.0.3');
      expect(actual.latest.sdkVersion).toBe('5.0.200');
      expect(actual.latest.security).toBe(true);
      expect(actual.latest.securityIssues.length).toBe(2);
      expect(actual.latest.securityIssues).not.toBeNull();
      expect(actual.latest.securityIssues[0].id).toBe('CVE-2021-1721');
      expect(actual.latest.securityIssues[1].id).toBe('CVE-2021-24112');

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(0);
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is not available',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-3.1.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('3.1.404', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/3.1/3.1.10/3.1.10.md');
      expect(actual.current.runtimeVersion).toBe('3.1.10');
      expect(actual.current.sdkVersion).toBe('3.1.404');
      expect(actual.current.security).toBe(false);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/3.1/3.1.10/3.1.10.md');
      expect(actual.latest.runtimeVersion).toBe('3.1.10');
      expect(actual.latest.sdkVersion).toBe('3.1.404');
      expect(actual.latest.security).toBe(false);

      expect(actual.security).toBe(false);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(0);
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is not available',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-6.0.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('6.0.100', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/6.0/6.0.0/6.0.0.md');
      expect(actual.current.runtimeVersion).toBe('6.0.0');
      expect(actual.current.sdkVersion).toBe('6.0.100');
      expect(actual.current.security).toBe(false);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/6.0/6.0.16/6.0.16.md');
      expect(actual.latest.runtimeVersion).toBe('6.0.16');
      expect(actual.latest.sdkVersion).toBe('6.0.408');
      expect(actual.latest.security).toBe(true);

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).not.toBe(0);
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available that skips releases when latest is not a security release',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-7.0.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('7.0.100', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.0/7.0.0.md');
      expect(actual.current.runtimeVersion).toBe('7.0.0');
      expect(actual.current.sdkVersion).toBe('7.0.100');
      expect(actual.current.security).toBe(false);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.4/7.0.4.md');
      expect(actual.latest.runtimeVersion).toBe('7.0.4');
      expect(actual.latest.sdkVersion).toBe('7.0.202');
      expect(actual.latest.security).toBe(false);

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(2);
      expect(actual.securityIssues[0].id).toBe('CVE-2022-41089');
      expect(actual.securityIssues[1].id).toBe('CVE-2023-21808');
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available that skips releases when latest is a security release',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-7.0.302.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('7.0.100', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.0/7.0.0.md');
      expect(actual.current.runtimeVersion).toBe('7.0.0');
      expect(actual.current.sdkVersion).toBe('7.0.100');
      expect(actual.current.security).toBe(false);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.5/7.0.5.md');
      expect(actual.latest.runtimeVersion).toBe('7.0.5');
      expect(actual.latest.sdkVersion).toBe('7.0.302');
      expect(actual.latest.security).toBe(true);

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(3);
      expect(actual.securityIssues[0].id).toBe('CVE-2022-41089');
      expect(actual.securityIssues[1].id).toBe('CVE-2023-21808');
      expect(actual.securityIssues[2].id).toBe('CVE-2023-28260');
    },
    timeout
  );

  test(
    'Gets correct info if a newer SDK is available for the same runtime version',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-7.0.302.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('7.0.203', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.5/7.0.5.md');
      expect(actual.current.runtimeVersion).toBe('7.0.5');
      expect(actual.current.sdkVersion).toBe('7.0.203');
      expect(actual.current.security).toBe(true);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/7.0/7.0.5/7.0.5.md');
      expect(actual.latest.runtimeVersion).toBe('7.0.5');
      expect(actual.latest.sdkVersion).toBe('7.0.302');
      expect(actual.latest.security).toBe(true);

      expect(actual.security).toBe(true);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(0);
    },
    timeout
  );

  test(
    'Gets correct info between preview releases',
    async () => {
      const releaseInfo = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-8.0.json'), { encoding: 'utf8' })
      );

      const actual = await updater.DotNetSdkUpdater.getLatestRelease('8.0.100-preview.1.23115.2', releaseInfo);

      expect(actual).not.toBeNull();
      expect(actual.current).not.toBeNull();
      expect(actual.latest).not.toBeNull();

      expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/8.0/preview/8.0.0-preview.1.md');
      expect(actual.current.runtimeVersion).toBe('8.0.0-preview.1.23110.8');
      expect(actual.current.sdkVersion).toBe('8.0.100-preview.1.23115.2');
      expect(actual.current.security).toBe(false);

      expect(actual.latest.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/8.0/preview/8.0.0-preview.3.md');
      expect(actual.latest.runtimeVersion).toBe('8.0.0-preview.3.23174.8');
      expect(actual.latest.sdkVersion).toBe('8.0.100-preview.3.23178.7');
      expect(actual.latest.security).toBe(false);

      expect(actual.security).toBe(false);
      expect(actual.securityIssues).not.toBeNull();
      expect(actual.securityIssues.length).toBe(0);
    },
    timeout
  );

  describe('getLatestDaily', () => {
    const preview1 = '8.0.100-preview.1.23115.2';
    const preview7 = '8.0.100-preview.7.23363.2';
    let releaseInfo;

    beforeAll(async () => {
      releaseInfo = JSON.parse(await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-8.0.json'), { encoding: 'utf8' }));
    });

    test.each([
      ['8.0', 'daily'],
      ['8.0.1xx', 'daily'],
      ['8.0.1xx-preview7', 'daily'],
    ])(
      'Gets correct info for daily build from official build for channel %s and quality %s',
      async (channel: string, quality: string) => {
        const actual = await updater.DotNetSdkUpdater.getLatestDaily(preview1, channel, quality, releaseInfo);

        expect(actual).not.toBeNull();
        expect(actual.current).not.toBeNull();
        expect(actual.latest).not.toBeNull();

        expect(actual.current.releaseNotes).toBe('https://github.com/dotnet/core/blob/main/release-notes/8.0/preview/8.0.0-preview.1.md');
        expect(actual.current.runtimeVersion).toBe('8.0.0-preview.1.23110.8');
        expect(actual.current.sdkVersion).toBe(preview1);
        expect(actual.current.security).toBe(false);

        expect(actual.latest.releaseNotes).not.toBeUndefined();
        expect(actual.latest.releaseNotes).not.toBeNull();
        expect(actual.latest.releaseNotes.startsWith('https://github.com/dotnet/installer/commits/')).toBe(true);
        expect(actual.latest.runtimeVersion).not.toBe(actual.current.runtimeVersion);
        expect(actual.latest.sdkVersion).not.toBe(actual.current.sdkVersion);
        expect(actual.latest.runtimeVersion.startsWith('8.0.0-')).toBe(true);
        expect(actual.latest.sdkVersion.startsWith('8.0.100-')).toBe(true);
        expect(actual.latest.security).toBe(false);

        expect(actual.security).toBe(false);
        expect(actual.securityIssues).not.toBeNull();
        expect(actual.securityIssues.length).toBe(0);
      },
      timeout
    );

    test.each([
      ['8.0', 'daily'],
      ['8.0.1xx', 'daily'],
      ['8.0.1xx-preview7', 'daily'],
    ])(
      'Gets correct info for daily build from daily build for channel %s and quality %s',
      async (channel: string, quality: string) => {
        const actual = await updater.DotNetSdkUpdater.getLatestDaily(preview7, channel, quality, releaseInfo);

        expect(actual).not.toBeNull();
        expect(actual.current).not.toBeNull();
        expect(actual.latest).not.toBeNull();

        expect(actual.current.releaseNotes).not.toBeUndefined();
        expect(actual.current.releaseNotes).not.toBeNull();
        expect(actual.current.releaseNotes.startsWith('https://github.com/dotnet/installer/commits/')).toBe(true);
        expect(actual.current.runtimeVersion).toBe('8.0.0-preview.7.23361.9');
        expect(actual.current.sdkVersion).toBe(preview7);
        expect(actual.current.security).toBe(false);

        expect(actual.latest.releaseNotes).not.toBeUndefined();
        expect(actual.latest.releaseNotes).not.toBeNull();
        expect(actual.latest.releaseNotes).not.toBe(actual.current.releaseNotes);
        expect(actual.latest.releaseNotes.startsWith('https://github.com/dotnet/installer/commits/')).toBe(true);
        expect(actual.latest.runtimeVersion).not.toBe(actual.current.runtimeVersion);
        expect(actual.latest.sdkVersion).not.toBe(actual.current.sdkVersion);
        expect(actual.latest.runtimeVersion.startsWith('8.0.0-')).toBe(true);
        expect(actual.latest.sdkVersion.startsWith('8.0.100-')).toBe(true);
        expect(actual.latest.security).toBe(false);

        expect(actual.security).toBe(false);
        expect(actual.securityIssues).not.toBeNull();
        expect(actual.securityIssues.length).toBe(0);
      },
      timeout
    );

    test.each([[''], ['foo'], ['GA']])('rejects invalid quality %s', async (quality: string) => {
      await expect(updater.DotNetSdkUpdater.getLatestDaily(preview1, '8.0', quality, releaseInfo)).rejects.toThrow(/Invalid quality/);
    });
  });

  test.each([
    ['2.1.100', '3.0.101', 'major'],
    ['2.1.100', '3.1.101', 'major'],
    ['3.1.100', '3.1.101', 'patch'],
    ['3.1.100', '3.1.200', 'patch'],
    ['3.0.100', '3.1.100', 'minor'],
    ['5.0.100', '6.0.100', 'major'],
  ])('Generates correct release notes from %s to %s as a %s update', (currentSdkVersion, latestSdkVersion, expected) => {
    const actual = updater.DotNetSdkUpdater.generateCommitMessage(currentSdkVersion, latestSdkVersion);
    expect(actual).toContain(`Update .NET SDK to version ${latestSdkVersion}.`);
    expect(actual).toContain('dependency-name: Microsoft.NET.Sdk');
    expect(actual).toContain('dependency-type: direct:production');
    expect(actual).toContain(`update-type: version-update:semver-${expected}`);
  });

  test.each([
    [false, '\n- CVE-2022-41089\n- CVE-2023-21808'],
    [
      true,
      '\n- [CVE-2022-41089](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-41089)\n- [CVE-2023-21808](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-21808)',
    ],
  ])('Sorts the CVEs in the pull request description', async (isGitHubEnterprise, expected) => {
    const channel = JSON.parse(await fs.promises.readFile(path.join(process.cwd(), 'tests', 'releases-7.0.json'), { encoding: 'utf8' }));
    const versions = updater.DotNetSdkUpdater.getLatestRelease('7.0.100', channel);
    const options: UpdateOptions = {
      accessToken: '',
      branch: '',
      channel: '7.0',
      commitMessage: '',
      commitMessagePrefix: '',
      dryRun: false,
      generateStepSummary: false,
      globalJsonPath: '',
      labels: '',
      userEmail: '',
      userName: '',
    };
    const actual = updater.DotNetSdkUpdater.generatePullRequestBody(versions, options, isGitHubEnterprise);
    expect(actual).toContain(expected);
  });

  test.each([
    ['3.1', '3.1.403', '2023-05-02', '3.1.404', '903 days', []],
    ['5.0', '5.0.102', '2023-05-02', '5.0.200', '791 days', ['CVE-2021-1721', 'CVE-2021-24112']],
    ['6.0', '6.0.407', '2023-05-02', '6.0.408', '21 days', ['CVE-2023-28260']],
    ['7.0', '7.0.201', '2023-03-14', '7.0.202', '0 days', []],
    ['7.0', '7.0.201', '2023-03-15', '7.0.202', '1 day', []],
    ['7.0', '7.0.201', '2023-03-16', '7.0.202', '2 days', []],
    ['7.0', '7.0.201', '2023-05-02', '7.0.202', '49 days', []],
    ['7.0.302', '7.0.203', '2023-05-02', '7.0.302', '21 days', []],
    ['8.0', '8.0.100-preview.2.23157.25', '2023-05-02', '8.0.100-preview.3.23178.7', '21 days', []],
  ])(
    'Generates correct GitHub step summary for %s from %s on %s',
    async (channelVersion, sdkVersion, date, expectedSdkVersion, expectedDaysAgo, expectedSecurityIssues) => {
      const today = new Date(date);
      const channel = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), 'tests', `releases-${channelVersion}.json`), { encoding: 'utf8' })
      );
      const versions = updater.DotNetSdkUpdater.getLatestRelease(sdkVersion, channel);
      const actual = await updater.DotNetSdkUpdater.generateSummary(versions, today);
      expect(actual).toContain(`<h1>.NET SDK ${expectedSdkVersion}</h1>`);
      expect(actual).toContain(`(${expectedDaysAgo} ago)`);
      if (expectedSecurityIssues.length > 0) {
        expect(actual).toContain('Security Issues');
        for (const issue in expectedSecurityIssues) {
          expect(actual).toContain(issue);
        }
      } else {
        expect(actual).not.toContain('Security Issues');
      }
    }
  );
});
