// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as path from 'path';

import * as updater from '../src/DotNetSdkUpdater';

import {describe, expect, test} from '@jest/globals';

describe('DotNetSdkUpdater tests', () => {
  test('Gets correct info if a newer SDK is available for the same MSBuild version', async () => {
    const releaseInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'releases-3.1.json'), {encoding: 'utf8'}));

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
  }, 10000);

  test('Gets correct info if a newer SDK is available for a different MSBuild version', async () => {
    const releaseInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'releases-5.0.json'), {encoding: 'utf8'}));

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
  }, 10000);

  test('Gets correct info if a newer SDK is not available', async () => {
    const releaseInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'releases-3.1.json'), {encoding: 'utf8'}));

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
  }, 10000);

  test('Gets correct info if a newer SDK is not available', async () => {
    const releaseInfo = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tests', 'releases-6.0.json'), {encoding: 'utf8'}));

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
  }, 10000);

  test.each([
    ['2.1.100', '3.0.101', 'major'],
    ['2.1.100', '3.1.101', 'major'],
    ['3.1.100', '3.1.101', 'patch'],
    ['3.1.100', '3.1.200', 'patch'],
    ['3.0.100', '3.1.100', 'minor'],
    ['5.0.100', '6.0.100', 'major']
  ])('Generates correct release notes from %s to %s as a %s update', (currentSdkVersion, latestSdkVersion, expected) => {
    const actual = updater.DotNetSdkUpdater.generateCommitMessage(currentSdkVersion, latestSdkVersion);
    expect(actual).toContain(`Update .NET SDK to version ${latestSdkVersion}.`);
    expect(actual).toContain('dependency-name: Microsoft.NET.Sdk');
    expect(actual).toContain('dependency-type: direct:production');
    expect(actual).toContain(`update-type: version-update:semver-${expected}`);
  });
});
