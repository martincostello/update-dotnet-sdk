// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

import { HttpClient } from '@actions/http-client';
import { UpdateOptions } from './UpdateOptions';
import { UpdateResult } from './UpdateResult';

export class DotNetSdkUpdater {

  private options: UpdateOptions;
  private repoPath: string;

  constructor(options: UpdateOptions) {
    this.options = options;
    this.repoPath = path.dirname(this.options.globalJsonPath);
  }

  public static getLatestRelease(currentSdkVersion: string, releaseInfo: any): SdkVersions {

    const latestSdkVersion = releaseInfo["latest-sdk"];

    const currentRelease = DotNetSdkUpdater.getReleaseForSdk(currentSdkVersion, releaseInfo);
    const latestRelease = DotNetSdkUpdater.getReleaseForSdk(latestSdkVersion, releaseInfo);

    return {
      current: currentRelease,
      latest: latestRelease
    };
  }

  public async tryUpdateSdk(): Promise<UpdateResult> {

    const globalJson = JSON.parse(
      fs.readFileSync(this.options.globalJsonPath, { encoding: 'utf8' })
    );

    let sdkVersion = null;

    if (globalJson.sdk && globalJson.sdk.version) {
      sdkVersion = globalJson.sdk.version;
    }

    if (!sdkVersion) {
      throw new Error(`.NET SDK version cannot be found in '${this.options.globalJsonPath}'.`);
    }

    const releases = await this.getDotNetReleases();
    const releaseInfo = await DotNetSdkUpdater.getLatestRelease(sdkVersion, releases);

    const result: UpdateResult = {
      pullRequestNumber: "",
      pullRequestUrl: "",
      updated: releaseInfo.current.sdkVersion !== releaseInfo.latest.sdkVersion,
      version: releaseInfo.latest.sdkVersion
    };

    core.info(`Current .NET SDK version is ${releaseInfo.current.sdkVersion}`);
    core.info(`Current .NET runtime version is ${releaseInfo.current.runtimeVersion}`);
    core.info(`Latest .NET SDK version for channel '${this.options.channel}' is ${releaseInfo.latest.sdkVersion} (runtime version ${releaseInfo.latest.runtimeVersion}`);

    if (result.updated) {
      await this.applySdkUpdate(globalJson, releaseInfo, result);
      //await this.createPullRequest(releaseInfo.latest);
    } else {
      core.info(`The current .NET SDK version is up-to-date`);
    }

    return result;
  }

  private async createPullRequest(releaseInfo: ReleaseInfo): Promise<PullRequest> {

    const base = await this.execGit(["rev-parse", "--abbrev-ref", "HEAD"]);

    const octokit = github.getOctokit(this.options.accessToken);

    const request = {
      owner: '',
      repo: '',
      title: '',
      head: '',
      base: base,
      body: '',
      maintainer_can_modify: true,
      draft: false
    };

    const result = await octokit.pulls.create(request);

    return {
      number: result.number,
      title: result.title,
      url: result.html_url
    };
  }

  private async execGit(args: string[], ignoreErrors: Boolean = false): Promise<string> {

    let commandOutput = "";
    let commandError = "";

    const options = {
      cwd: this.repoPath,
      listeners: {
        stdout: (data: Buffer) => {
          commandOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          commandError += data.toString();
        }
      },
      ignoreReturnCode: ignoreErrors
    };

    await exec.exec("git", args, options);

    if (commandError && !ignoreErrors) {
      throw new Error(commandError);
    }

    return commandOutput.trimEnd();
  }

  private async getDotNetReleases() : Promise<any> {

    const httpClient = new HttpClient('martincostello/update-dotnet-sdk', [], {
      allowRetries: true,
      maxRetries: 3
    });

    const releasesUrl = `https://raw.githubusercontent.com/dotnet/core/master/release-notes/${this.options.channel}/releases.json`;

    core.debug(`Downloading .NET ${this.options.channel} release notes JSON from ${releasesUrl}...`);

    const releasesResponse = await httpClient.getJson<any>(releasesUrl);
    return releasesResponse.result || {};
  }

  private static getReleaseForSdk(sdkVersion: string, releaseInfo: any): ReleaseInfo {

    let releases: any[] = releaseInfo['releases'];

    const foundRelease = releases.filter((info: any) => {
      return info["sdk"]["version"] === sdkVersion;
    });

    if (foundRelease.length < 1) {
      throw new Error(`Failed to find release for .NET SDK version ${sdkVersion}`);
    }

    const release = foundRelease[0];

    return {
      releaseNotes: release["release-notes"],
      runtimeVersion: release["runtime"]["version"],
      sdkVersion: release["sdk"]["version"],
      security: release["security"]
    };
  }

  private async applySdkUpdate(globalJson: any, releaseInfo: SdkVersions, result: UpdateResult): Promise<void> {

    core.info(`Updating .NET SDK version in '${this.options.globalJsonPath}' to ${releaseInfo.latest.sdkVersion}...`);

    globalJson.sdk.version = result.version;
    const json = JSON.stringify(globalJson, null, 2) + os.EOL;

    fs.writeFileSync(this.options.globalJsonPath, json, { encoding: 'utf8' });
    core.info(`Updated SDK version in '${this.options.globalJsonPath}' to ${releaseInfo.latest.sdkVersion}`);

    if (!this.options.branch) {
      this.options.branch = `update-dotnet-sdk-${releaseInfo.latest.sdkVersion}`.toLowerCase();
    }

    if (!this.options.commitMessage) {
      this.options.commitMessage = `Update .NET SDK\n\nUpdate .NET SDK to version ${releaseInfo.latest.sdkVersion}.`;
    }

    core.debug(`Commit message: ${this.options.commitMessage}`);

    if (process.env.GITHUB_REPOSITORY) {
      await this.execGit([ "remote", "set-url", "origin", `https://github.com/${process.env.GITHUB_REPOSITORY}.git` ]);
      await this.execGit([ "fetch", "origin" ]);
    }

    const base = await this.execGit(["rev-parse", "--abbrev-ref", "HEAD"]);
    const branchExists = await this.execGit([ "rev-parse", "--verify", "--quiet", `remotes/origin/${this.options.branch}` ], true);

    if (branchExists) {
      core.info(`The ${this.options.branch} branch already exists`);
      return;
    }

    if (this.options.userName) {
      await this.execGit([ "config", "user.name", this.options.userName ]);
      core.info(`Updated git user name to '${this.options.userName}'`);
    }

    if (this.options.userEmail) {
      await this.execGit([ "config", "user.email", this.options.userEmail ]);
      core.info(`Updated git user email to '${this.options.userEmail}'`);
    }

    await this.execGit([ "checkout", "-b", this.options.branch ], true);
    core.info(`Created git branch ${this.options.branch}`);

    await this.execGit([ "add", this.options.globalJsonPath ]);
    core.info(`Staged git commit for '${this.options.globalJsonPath}'`);

    await this.execGit([ "commit", "-m", this.options.commitMessage ]);

    const sha1 = await this.execGit([ "log", "--format='%H'", "-n", "1" ]);
    const shortSha1 = sha1.replace("'", "").substring(0, 7);

    core.info(`Commited .NET SDK update to git (${shortSha1})`);

    if (process.env.GITHUB_REPOSITORY) {
      await this.execGit([ "push", "-u", "origin", this.options.branch ]);
      core.info(`Pushed changes to repository (${process.env.GITHUB_REPOSITORY})`);
    }
  }
}

interface PullRequest {
  number: string;
  title: string;
  url: string;
}

interface ReleaseInfo {
  releaseNotes: string;
  runtimeVersion: string;
  sdkVersion: string;
  security: boolean;
}

interface SdkVersions {
  current: ReleaseInfo;
  latest: ReleaseInfo;
}
