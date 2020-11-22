// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import core = require("@actions/core");
import exec = require("@actions/exec");
import io = require("@actions/io");
import fs = require("fs");
import os = require("os");
import path = require("path");

const github = require("@actions/github");

import { run } from "../src/update-dotnet-sdk";

const tempDir = path.join(os.tmpdir(), "update-dotnet-sdk-temp");
const globalJsonPath = path.join(tempDir, "global.json");

describe("update-dotnet-sdk tests", () => {

  const inputs = {
    "GITHUB_REPOSITORY": "",
    "INPUT_GLOBAL-JSON-FILE": globalJsonPath,
    "INPUT_LABELS": "foo,bar",
    "INPUT_REPO-TOKEN": "my-token",
    "INPUT_USER-EMAIL": "github-actions[bot]@users.noreply.github.com",
    "INPUT_USER-NAME": "github-actions[bot]"
  };

  beforeEach(async () => {
    for (const key in inputs) {
      process.env[key] = inputs[key as keyof typeof inputs];
    }
    process.stdout.write = jest.fn();
    core.error = jest.fn();
    core.setFailed = jest.fn();
    await io.rmRF(tempDir);
  })

  afterEach(async () => {
    try {
      await io.rmRF(path.join(tempDir, "global.json"));
      await io.rmRF(tempDir);
    } catch {
      console.log("Failed to remove test directories");
    }
  }, 5000);

  it("Updates the .NET SDK in global.json if a new version is available", async () => {

    const sdkVersion = "3.1.201";
    const jsonContents = `{${os.EOL}"sdk": {${os.EOL}"version": "${sdkVersion}"${os.EOL}}${os.EOL}}`;

    await createTestGitRepo(globalJsonPath, jsonContents);

    github.getOctokit = jest.fn().mockReturnValue({
      issues: {
        addLabels: () => Promise.resolve({})
      },
      pulls: {
        create: () => Promise.resolve({
          data: {
            number: "42",
            html_url: "https://github.com/martincostello/update-dotnet-sdk/pull/42"
          }
        })
      }
    });

    await run();

    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.setFailed).toHaveBeenCalledTimes(0);

    assertWriteCalled(`::set-output name=pull-request-html-url::https://github.com/martincostello/update-dotnet-sdk/pull/42${os.EOL}`);
    assertWriteCalled(`::set-output name=pull-request-number::42${os.EOL}`);
    assertWriteCalled(`::set-output name=sdk-updated::true${os.EOL}`);

    const globalJson = JSON.parse(
      fs.readFileSync(globalJsonPath, { encoding: "utf8" })
    );

    const actualVersion: string = globalJson.sdk.version;

    expect(actualVersion).not.toBe(sdkVersion);
  }, 30000);
});

function assertWriteCalled(message: string): void {
  expect(process.stdout.write).toHaveBeenCalledWith(message);
}

async function createTestGitRepo(path: string, data: string): Promise<void> {

  if (!fs.existsSync(tempDir)) {
    io.mkdirP(tempDir);
  }

  fs.appendFileSync(path, data);
  fs.writeFileSync(path, data);

  const options = {
    cwd: tempDir,
    ignoreReturnCode: true
  };

  let execGit = async (...args: string[]) => {
    await exec.exec("git", args, options);
  };

  await execGit("init");
  await execGit("config", "core.safecrlf", "false");
  await execGit("config", "user.email", "test@test.local");
  await execGit("config", "user.name", "test");
  await execGit("add", ".");
  await execGit("commit", "-m", "Initial commit");
}
