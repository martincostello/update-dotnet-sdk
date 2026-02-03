// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import { afterAll, beforeAll, describe, expect, vi, test } from 'vitest';

vi.mock('@actions/core', async () => {
  const actual = await vi.importActual<typeof import('@actions/core')>('@actions/core');
  return {
    ...actual,
    setFailed: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    summary: {
      ...actual.summary,
      addRaw: vi.fn().mockImplementation((text: string) => actual.summary.addRaw(text)),
      write: vi.fn().mockImplementation(() => actual.summary.write()),
    },
  };
});

import * as core from '@actions/core';
import { ActionFixture } from './ActionFixture';

const timeout = 30000;
const outputs = [
  ['aspnetcore-version'],
  ['branch-name'],
  ['pull-request-html-url'],
  ['pull-request-number'],
  ['pull-requests-closed'],
  ['runtime-version'],
  ['sdk-updated'],
  ['sdk-version'],
  ['security'],
  ['windows-desktop-version'],
];

describe('update-dotnet-sdk', () => {
  beforeAll(() => {
    Date.now = vi.fn(() => new Date(Date.UTC(2023, 8 - 1, 25)).valueOf());
  });

  describe.each([
    ['2.1', '2.1.500', '', false],
    ['2.1', '2.1.500', '', true],
    ['3.1', '3.1.201', '', false],
    ['3.1', '3.1.201', '', true],
    ['3.1', '3.1.201', 'chore:', false],
    ['3.1', '3.1.201', 'chore:', true],
    ['6.0', '6.0.100', '', false],
    ['6.0', '6.0.100', '', true],
    ['7.0', '7.0.100', '', false],
    ['7.0', '7.0.100', '', true],
    ['7.0-sdk-only', '7.0.307', '', false],
    ['8.0', '8.0.100-preview.6.23330.14', '', false],
  ])(
    '%s for the %s SDK with a commit prefix of "%s" and security-only of %s',
    (scenario: string, sdkVersion: string, commitMessagePrefix: string, securityOnly: boolean) => {
      let fixture: ActionFixture;

      beforeAll(async () => {
        fixture = new ActionFixture(sdkVersion, undefined);

        fixture.commitMessagePrefix = commitMessagePrefix;
        fixture.securityOnly = securityOnly;

        await fixture.initialize(scenario);
      });

      afterAll(async () => {
        await fixture?.destroy();
      });

      describe('running the action', () => {
        beforeAll(async () => {
          await fixture.run();
        }, timeout);

        test('generates no errors', () => {
          expect(core.error).toHaveBeenCalledTimes(0);
          expect(core.setFailed).toHaveBeenCalledTimes(0);
        });

        test('updates the SDK version in global.json', async () => {
          expect(await fixture.sdkVersion()).toMatchSnapshot();
        });

        test('generates the expected Git commit history', async () => {
          expect(await fixture.commitHistory()).toMatchSnapshot();
        });

        test('generates the expected Git diff', async () => {
          expect(await fixture.diff()).toMatchSnapshot();
        });

        test('generates the expected GitHub step summary', async () => {
          expect(fixture.stepSummary).toMatchSnapshot();
        });

        test.each(outputs)('the %s output is correct', (name: string) => {
          expect(fixture.getOutput(name)).toMatchSnapshot();
        });
      });
    }
  );

  describe.each([
    ['2.1', '2.1.818'],
    ['3.1', '3.1.426'],
    ['6.0', '6.0.413'],
    ['7.0', '7.0.400'],
    ['8.0', '8.0.100-preview.7.23376.3'],
  ])('%s when the .NET SDK is up-to-date', (scenario: string, sdkVersion: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion);
      await fixture.initialize(scenario);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('does not update the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe.each([['7.0', '7.0.304']])('%s when the .NET SDK does not include security fixes', (scenario: string, sdkVersion: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion);

      fixture.securityOnly = true;

      await fixture.initialize(`${scenario}-not-security`);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('does not update the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe.each([
    ['daily', '8.0', '8.0.100-preview.6.23330.14'],
    ['daily', '8.0.1xx', '8.0.100-preview.6.23330.14'],
    ['daily', '8.0.1xx-preview7', '8.0.100-preview.6.23330.14'],
    ['daily', '9.0', '9.0.100-alpha.1.24058.9'],
    ['daily', '9.0.1xx', '9.0.100-preview.5.24281.15'],
    ['daily', '10.0.1xx', '10.0.100-preview.4.25216.37'],
  ])('%s builds for channel "%s"', (quality: string, channel: string, sdkVersion: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(sdkVersion);

      fixture.channel = channel;
      fixture.quality = quality;

      await fixture.initialize(`${quality}-${channel}`);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test('generates the expected GitHub step summary', async () => {
        expect(fixture.stepSummary).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });

  describe.each([
    ['2.1', '{\n    "sdk": {\n        "version": "2.1.500"\n  }\n}\n', '\n', '}\n'],
    ['3.1', '{"sdk":{"version":"3.1.201"}}', '', '}}'],
    ['6.0', '{\r\n  "sdk": {\r\n    "version": "6.0.100"\r\n  }\r\n}\r\n', '\r\n', '}\r\n'],
    ['7.0', '{\r    "sdk": {\r        "version": "7.0.100"\r    }\r}', '\r', '}'],
  ])('%s when the global.json file has a custom format"', (scenario: string, content: string, lineEndings: string, suffix: string) => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      fixture = new ActionFixture(undefined, content);
      await fixture.initialize(scenario);
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the global.json file correctly', async () => {
        const content = await fixture.sdkContent();
        expect(content.includes(lineEndings)).toBe(true);
        expect(content.endsWith(suffix)).toBe(true);
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });
    });
  });

  describe('when global.json contains multiple .NET SDK versions', () => {
    let fixture: ActionFixture;

    beforeAll(async () => {
      const content = `{
        "sdk": {
          "version": "9.0.100-alpha.1.24058.9"
        },
        "tools": {
          "dotnet": "9.0.100-alpha.1.24058.9",
          "runtimes": {
            "dotnet/x86": [
              "$(MicrosoftNETCoreBrowserDebugHostTransportVersion)"
            ],
            "dotnet": [
              "$(MicrosoftNETCoreBrowserDebugHostTransportVersion)"
            ]
          },
          "Git": "2.22.0",
          "jdk": "11.0.3",
          "vs": {
            "version": "17.2",
            "components": [
              "Microsoft.VisualStudio.Component.VC.ATL",
              "Microsoft.VisualStudio.Component.VC.ATL.ARM64",
              "Microsoft.VisualStudio.Component.VC.Tools.ARM64",
              "Microsoft.VisualStudio.Component.VC.Tools.x86.x64"
            ]
          },
          "xcopy-msbuild": "17.1.0"
        },
        "msbuild-sdks": {
          "Microsoft.DotNet.Arcade.Sdk": "9.0.0-beta.24062.5",
          "Microsoft.DotNet.Helix.Sdk": "9.0.0-beta.24062.5"
        }
      }`;

      fixture = new ActionFixture(undefined, content);

      fixture.channel = '9.0';
      fixture.quality = 'daily';

      await fixture.initialize('daily-9.0');
    });

    afterAll(async () => {
      await fixture?.destroy();
    });

    describe('running the action', () => {
      beforeAll(async () => {
        await fixture.run();
      }, timeout);

      test('generates no errors', () => {
        expect(core.error).toHaveBeenCalledTimes(0);
        expect(core.setFailed).toHaveBeenCalledTimes(0);
      });

      test('updates the global.json file correctly', async () => {
        const content = await fixture.sdkContent();
        const globalJson = JSON.parse(content);
        expect(globalJson.sdk.version).toBe('9.0.100-alpha.1.24066.6');
        expect(globalJson.tools.dotnet).toBe('9.0.100-alpha.1.24066.6');
        expect(content).toMatchSnapshot();
      });

      test('updates the SDK version in global.json', async () => {
        expect(await fixture.sdkVersion()).toMatchSnapshot();
      });

      test('generates the expected Git commit history', async () => {
        expect(await fixture.commitHistory(1)).toMatchSnapshot();
      });

      test('generates the expected GitHub step summary', async () => {
        expect(fixture.stepSummary).toMatchSnapshot();
      });

      test.each(outputs)('the %s output is correct', (name: string) => {
        expect(fixture.getOutput(name)).toMatchSnapshot();
      });
    });
  });
});
