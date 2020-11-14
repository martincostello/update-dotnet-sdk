// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import io = require('@actions/io');
import fs = require('fs');
import os = require('os');
import path = require('path');

import * as updater from '../src/DotNetSdkUpdater';

describe('DotNetSdkUpdater tests', () => {

  it('Gets correct info if a newer SDK is available', async () => {

    const releaseInfo = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "tests", "releases-3.1.json"), { encoding: 'utf8' })
    );

    const actual = await updater.DotNetSdkUpdater.getLatestRelease("3.1.100", releaseInfo);

    expect(actual).not.toBeNull();
    expect(actual.current).not.toBeNull();
    expect(actual.latest).not.toBeNull();

    expect(actual.current.releaseNotes).toBe("https://github.com/dotnet/core/blob/master/release-notes/3.1/3.1.0/3.1.0.md");
    expect(actual.current.runtimeVersion).toBe("3.1.0");
    expect(actual.current.sdkVersion).toBe("3.1.100");
    expect(actual.current.security).toBe(false);

    expect(actual.latest.releaseNotes).toBe("https://github.com/dotnet/core/blob/master/release-notes/3.1/3.1.10/3.1.10.md");
    expect(actual.latest.runtimeVersion).toBe("3.1.10");
    expect(actual.latest.sdkVersion).toBe("3.1.404");
    expect(actual.latest.security).toBe(false);

  }, 10000);

  it('Gets correct info if a newer SDK is not available', async () => {

    const releaseInfo = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "tests", "releases-3.1.json"), { encoding: 'utf8' })
    );

    const actual = await updater.DotNetSdkUpdater.getLatestRelease("3.1.404", releaseInfo);

    expect(actual).not.toBeNull();
    expect(actual.current).not.toBeNull();
    expect(actual.latest).not.toBeNull();

    expect(actual.current.releaseNotes).toBe("https://github.com/dotnet/core/blob/master/release-notes/3.1/3.1.10/3.1.10.md");
    expect(actual.current.runtimeVersion).toBe("3.1.10");
    expect(actual.current.sdkVersion).toBe("3.1.404");
    expect(actual.current.security).toBe(false);

    expect(actual.latest.releaseNotes).toBe("https://github.com/dotnet/core/blob/master/release-notes/3.1/3.1.10/3.1.10.md");
    expect(actual.latest.runtimeVersion).toBe("3.1.10");
    expect(actual.latest.sdkVersion).toBe("3.1.404");
    expect(actual.latest.security).toBe(false);

  }, 10000);
});
