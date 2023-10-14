// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import { UpdateOptions } from './UpdateOptions';
import { UpdateResult } from './UpdateResult';
import { Writable } from 'stream';
import { fetch, Response } from 'undici';

// eslint-disable-next-line import/no-unresolved
import { PaginateInterface } from '@octokit/plugin-paginate-rest/dist-types/types';
// eslint-disable-next-line import/no-unresolved
import { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types';

export class DotNetSdkUpdater {
  private options: UpdateOptions;
  private repoPath: string;

  constructor(options: UpdateOptions) {
    this.options = options;
    this.repoPath = path.dirname(this.options.globalJsonPath);
  }

  public static async getLatestDaily(
    currentSdkVersion: string,
    channel: string,
    quality: string | undefined,
    releaseChannel: ReleaseChannel | null
  ): Promise<SdkVersions> {
    const { sdkVersion, runtimeVersion, installerCommit } = await DotNetSdkUpdater.getDotNetDailyVersion(channel, quality);

    const security = false;
    const securityIssues = [];

    const getReleaseDate = (version: string): Date => {
      const versionParts = version.split('.');
      const buildNumber = parseInt(versionParts[4], 10);

      // See https://github.com/dotnet/arcade/blob/60ea5b2eca5af06fc63b250f8669d2c70179b18c/src/Microsoft.DotNet.Arcade.Sdk/tools/Version.BeforeCommonTargets.targets#L47-L56
      const year = Math.floor(2000 + buildNumber / 1000);
      const monthDay = buildNumber % 1000;
      const month = Math.floor(monthDay / 50);
      const day = monthDay - month * 50;

      return new Date(Date.UTC(year, month - 1, day));
    };

    const getReleaseNotes = (commit: string): string => {
      return `https://github.com/dotnet/installer/commits/${commit}`;
    };

    let current: ReleaseInfo | null = null;

    if (releaseChannel) {
      try {
        current = DotNetSdkUpdater.getReleaseForSdk(currentSdkVersion, releaseChannel);
      } catch (err) {
        // The current SDK version is also a daily build
      }
    }

    if (!current) {
      const {
        installer: { commit: currentInstallerCommit },
        runtime: { version: currentRuntimeVersion },
      } = await DotNetSdkUpdater.getSdkProductCommits(currentSdkVersion);
      current = {
        releaseDate: getReleaseDate(currentSdkVersion),
        releaseNotes: getReleaseNotes(currentInstallerCommit),
        runtimeVersion: currentRuntimeVersion,
        sdkVersion: currentSdkVersion,
        security,
        securityIssues,
      };
    }

    const latest: ReleaseInfo = {
      releaseDate: getReleaseDate(sdkVersion),
      releaseNotes: getReleaseNotes(installerCommit),
      runtimeVersion,
      sdkVersion,
      security,
      securityIssues,
    };

    return {
      current,
      latest,
      security: latest.security,
      securityIssues: latest.securityIssues,
    };
  }

  public static getLatestRelease(currentSdkVersion: string, channel: ReleaseChannel): SdkVersions {
    const current = DotNetSdkUpdater.getReleaseForSdk(currentSdkVersion, channel);
    const latest = DotNetSdkUpdater.getReleaseForSdk(channel['latest-sdk'], channel);

    const result = {
      current,
      latest,
      security: latest.security,
      securityIssues: latest.securityIssues,
    };

    const currentParts = current.runtimeVersion.split('.');
    const latestParts = latest.runtimeVersion.split('.');

    const versionMajor = parseInt(currentParts[0], 10);
    const versionMinor = parseInt(currentParts[1], 10);

    // Do not attempt to compute the patch delta if either SDK version is a preview
    if (!currentParts[2].includes('-') && !latestParts[2].includes('-')) {
      const currentPatch = parseInt(currentParts[2], 10);
      const latestPatch = parseInt(latestParts[2], 10);

      const patchDelta = latestPatch - currentPatch;

      if (patchDelta > 1) {
        for (let patch = currentPatch; patch < latestPatch; patch++) {
          const version = `${versionMajor}.${versionMinor}.${patch}`;
          const release = channel.releases.find((p) => p.runtime?.version === version);
          if (release) {
            result.security = result.security || release.security;
            if (release['cve-list']) {
              result.securityIssues = result.securityIssues.concat(DotNetSdkUpdater.mapCves(release['cve-list']));
            }
          }
        }
      }
    }

    if (current.securityIssues.length > 0) {
      result.securityIssues = result.securityIssues.filter((p) => !current.securityIssues.some((q) => q.id === p.id));
    }

    result.securityIssues.sort((a, b) => a.id.localeCompare(b.id));

    return result;
  }

  public static generateCommitMessage(currentSdkVersion: string, latestSdkVersion: string): string {
    const currentVersion = currentSdkVersion.split('.');
    const latestVersion = latestSdkVersion.split('.');

    const updateKind =
      parseInt(latestVersion[0], 10) > parseInt(currentVersion[0], 10)
        ? 'major'
        : parseInt(latestVersion[1], 10) > parseInt(currentVersion[1], 10)
        ? 'minor'
        : 'patch';

    const messageLines = [
      'Update .NET SDK',
      '',
      `Update .NET SDK to version ${latestSdkVersion}.`,
      '',
      '---',
      'updated-dependencies:',
      '- dependency-name: Microsoft.NET.Sdk',
      '  dependency-type: direct:production',
      `  update-type: version-update:semver-${updateKind}`,
      '...',
      '',
      '',
    ];
    return messageLines.join('\n');
  }

  public static generatePullRequestBody(update: SdkVersions, options: UpdateOptions, isGitHubEnterprise: boolean): string {
    let body = `Updates the .NET SDK to version \`${update.latest.sdkVersion}\`, `;

    if (update.latest.runtimeVersion === update.current.runtimeVersion) {
      body += `which includes version [\`\`${update.latest.runtimeVersion}\`\`](${update.latest.releaseNotes}) of the .NET runtime.`;
    } else {
      body += `which also updates the .NET runtime from version [\`\`${update.current.runtimeVersion}\`\`](${update.current.releaseNotes}) to version [\`\`${update.latest.runtimeVersion}\`\`](${update.latest.releaseNotes}).`;
    }

    if (update.security && update.securityIssues.length > 0) {
      body += `\n\nThis release includes fixes for the following security issue(s):`;
      for (const issue of update.securityIssues) {
        body += `\n- ${isGitHubEnterprise ? `[${issue.id}](${issue.url})` : issue.id}`;
      }
    }

    body += `\n\nThis pull request was auto-generated by [GitHub Actions](${options.serverUrl}/${options.runRepo}/actions/runs/${options.runId}).`;

    return body;
  }

  public static async generateSummary(update: SdkVersions, today: Date): Promise<string> {
    const daysSinceRelease = Math.floor((today.getTime() - update.latest.releaseDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysUnit = daysSinceRelease === 1 ? 'day' : 'days';
    const iso8601Date = update.latest.releaseDate.toISOString().split('T')[0];

    let summary = core.summary
      .addHeading(`.NET SDK ${update.latest.sdkVersion}`, 1)
      .addRaw(`An update from version ${update.current.sdkVersion} to ${update.latest.sdkVersion} of the .NET SDK is available.`)
      .addBreak()
      .addBreak()
      .addRaw(`This version of the .NET SDK was released on ${iso8601Date} (${daysSinceRelease} ${daysUnit} ago).`)
      .addBreak()
      .addBreak()
      .addLink(`Release notes`, update.latest.releaseNotes);

    if (update.security && update.securityIssues.length > 0) {
      summary = summary
        .addHeading('Security Issues', 2)
        .addRaw('This update includes fixes for the following security issues:')
        .addBreak()
        .addBreak()
        .addList(
          update.securityIssues.map((p) => p.id),
          false
        );
    }

    const result = summary.stringify();

    if (process.env['GITHUB_STEP_SUMMARY']) {
      await summary.write();
    }

    summary.emptyBuffer();

    return result;
  }

  public async tryUpdateSdk(): Promise<UpdateResult> {
    const globalJson: GlobalJson = JSON.parse(await fs.promises.readFile(this.options.globalJsonPath, { encoding: 'utf8' }));

    let sdkVersion = '';

    if (globalJson.sdk && globalJson.sdk.version) {
      sdkVersion = globalJson.sdk.version;
    }

    if (!sdkVersion) {
      throw new Error(`.NET SDK version cannot be found in '${this.options.globalJsonPath}'.`);
    }

    let majorMinor: string;

    if (!this.options.channel) {
      majorMinor = DotNetSdkUpdater.getChannel(sdkVersion, 'version');
      this.options.channel = majorMinor;
    } else {
      majorMinor = DotNetSdkUpdater.getChannel(sdkVersion, 'channel');
    }

    const update: SdkVersions = this.options.quality
      ? await this.getLatestDotNetSdkForQuality(majorMinor, sdkVersion)
      : await this.getLatestDotNetSdkForOfficial(majorMinor, sdkVersion);

    const result: UpdateResult = {
      branchName: '',
      pullRequestNumber: 0,
      pullRequestUrl: '',
      updated: false,
      security: false,
      supersedes: [],
      version: update.current.sdkVersion,
    };

    core.info(`Current .NET SDK version is ${update.current.sdkVersion}`);
    core.info(`Current .NET runtime version is ${update.current.runtimeVersion}`);
    core.info(
      `Latest .NET SDK version for channel '${this.options.channel}' is ${update.latest.sdkVersion} (runtime version ${update.latest.runtimeVersion})`
    );

    if (update.current.sdkVersion !== update.latest.sdkVersion) {
      const baseBranch = await this.applySdkUpdate(globalJson, update);

      if (baseBranch) {
        const pullRequest = await this.createPullRequest(baseBranch, update);

        result.branchName = pullRequest.branch;
        result.pullRequestNumber = pullRequest.number;
        result.pullRequestUrl = pullRequest.url;
        result.supersedes = pullRequest.supersedes;

        result.security = update.security;
        result.updated = true;
        result.version = update.latest.sdkVersion;

        if (this.options.generateStepSummary) {
          await DotNetSdkUpdater.generateSummary(update, new Date(Date.now()));
        }
      }
    } else {
      core.info('The current .NET SDK version is up-to-date');
    }

    return result;
  }

  private async createPullRequest(base: string, update: SdkVersions): Promise<PullRequest> {
    const title = `Update .NET SDK to ${update.latest.sdkVersion}`;
    const isGitHubEnterprise = this.options.serverUrl !== 'https://github.com';
    const body = DotNetSdkUpdater.generatePullRequestBody(update, this.options, isGitHubEnterprise);

    const octokit = github.getOctokit(this.options.accessToken, {
      baseUrl: this.options.apiUrl,
    });

    const [owner, repo] = this.options.repo.split('/');

    const request = {
      owner,
      repo,
      title,
      head: this.options.branch,
      base,
      body,
      maintainer_can_modify: true,
      draft: false,
    };

    if (this.options.dryRun) {
      core.info(`Skipped creating GitHub Pull Request for branch ${this.options.branch} to ${base}`);
      return {
        branch: '',
        number: 0,
        supersedes: [],
        url: '',
      };
    }

    const response = await octokit.rest.pulls.create(request);

    core.debug(JSON.stringify(response, null, 2));

    core.info(`Created pull request #${response.data.number}: ${response.data.title}`);
    core.info(`View the pull request at ${response.data.html_url}`);

    const result: PullRequest = {
      branch: response.data.head.ref,
      number: response.data.number,
      supersedes: [],
      url: response.data.html_url,
    };

    if (this.options.labels) {
      const labelsToApply = this.options.labels.split(',');

      if (labelsToApply.length > 0) {
        try {
          await octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: result.number,
            labels: labelsToApply,
          });
        } catch (error: any) {
          core.error(`Failed to apply label(s) to Pull Request #${result.number}`);
          core.error(error);
        }
      }

      if (this.options.closeSuperseded) {
        const superseded = await this.getSupersededPulls(octokit, {
          number: result.number,
          owner,
          repo,
          ref: base,
          user: response.data.user?.login,
        });

        if (superseded.length > 0) {
          const comment = `Superseded by #${result.number}.`;

          for (const pull of superseded) {
            core.debug(`Closing pull request ${pull.number}.`);

            await octokit.rest.issues.createComment({
              owner,
              repo,
              issue_number: pull.number,
              body: comment,
            });
            await octokit.rest.pulls.update({
              owner,
              repo,
              pull_number: pull.number,
              state: 'closed',
            });
            await octokit.rest.git.deleteRef({
              owner,
              repo,
              ref: `heads/${pull.ref}`,
            });

            result.supersedes.push(pull.number);
          }
        }
      }
    }

    return result;
  }

  private async getSupersededPulls(
    octokit: PaginatedApi,
    created: {
      number: number;
      owner: string;
      repo: string;
      ref: string;
      user?: string;
    }
  ): Promise<
    {
      number: number;
      ref: string;
    }[]
  > {
    const pulls = await octokit.paginate(octokit.rest.pulls.list, {
      owner: created.owner,
      repo: created.repo,
      base: created.ref,
      direction: 'desc',
      state: 'open',
    });

    const titlePrefix = 'Update .NET SDK to ';

    const superseded = pulls
      .filter((pull) => pull.number !== created.number)
      .filter((pull) => pull.user && pull.user.login === created.user)
      .filter((pull) => pull.title.startsWith(titlePrefix))
      .map((pull) => ({
        number: pull.number,
        ref: pull.head.ref,
      }));

    superseded.reverse();
    return superseded;
  }

  private async execGit(args: string[], ignoreErrors: Boolean = false): Promise<string> {
    let commandOutput = '';
    let commandError = '';

    const options = {
      cwd: this.repoPath,
      errStream: new NullWritable(),
      outStream: new NullWritable(),
      ignoreReturnCode: ignoreErrors as boolean | undefined,
      silent: ignoreErrors as boolean | undefined,
      listeners: {
        stdout: (data: Buffer) => {
          commandOutput += data.toString();
        },
        stderr: (data: Buffer) => {
          commandError += data.toString();
        },
      },
    };

    try {
      await exec.exec('git', args, options);
    } catch (error: any) {
      throw new Error(`The command 'git ${args.join(' ')}' failed: ${error}`);
    }

    if (commandError && !ignoreErrors) {
      throw new Error(commandError);
    }

    core.debug(`git std-out: ${commandOutput}`);

    if (commandError) {
      core.debug(`git std-err: ${commandError}`);
    }

    return commandOutput.trimEnd();
  }

  private static async httpGet(url: string): Promise<Response> {
    return await fetch(url, {
      headers: new Headers([['User-Agent', 'martincostello/update-dotnet-sdk']]),
    });
  }

  private static async getDotNetDailyVersion(
    channel: string,
    quality: string | undefined
  ): Promise<{
    installerCommit: string;
    runtimeVersion: string;
    sdkVersion: string;
  }> {
    // See https://github.com/dotnet/install-scripts/blob/2ff8ee5ca8feccd8c54a855b4ccf15dc82f1e20e/src/dotnet-install.ps1#L18-L35
    if (!Object.values(Quality).includes(quality as Quality)) {
      throw new Error(`Invalid quality "${quality}" specified. Supported values are: ${Object.values(Quality).join(', ')}.`);
    }

    const versionUrl = `https://aka.ms/dotnet/${channel}/${quality}/sdk-productVersion.txt`;
    core.debug(`Downloading .NET ${channel} daily SDK version from ${versionUrl}`);

    const response = await DotNetSdkUpdater.httpGet(versionUrl);

    if (response.status && response.status >= 400) {
      throw new Error(`Failed to get product version for channel ${channel} - HTTP status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');

    if (!(contentType === 'text/plain' || contentType === 'application/octet-stream')) {
      throw new Error(`Failed to get product version for channel ${channel} as plain text. Content-Type: ${contentType}`);
    }

    const versionRaw = await response.text();
    const sdkVersion = versionRaw.trim();

    const versions = await DotNetSdkUpdater.getSdkProductCommits(sdkVersion);

    return {
      installerCommit: versions.installer.commit,
      runtimeVersion: versions.runtime.version,
      sdkVersion: versions.installer.version,
    };
  }

  private static async getSdkProductCommits(sdkVersion: string): Promise<SdkProductCommits> {
    // JSON support was only added as of .NET 8 RC1.
    // See https://github.com/dotnet/installer/pull/17000.
    let productCommits = await DotNetSdkUpdater.getSdkProductCommitsFromJson(sdkVersion);
    if (!productCommits) {
      productCommits = await DotNetSdkUpdater.getSdkProductCommitsFromText(sdkVersion);
    }
    return productCommits;
  }

  private static getSdkProductCommitsUrl(sdkVersion: string, format: 'json' | 'txt'): string {
    const platform = 'win-x64';
    return `https://dotnetbuilds.azureedge.net/public/Sdk/${sdkVersion}/productCommit-${platform}.${format}`;
  }

  private static async getSdkProductCommitsFromJson(sdkVersion: string): Promise<SdkProductCommits | null> {
    const commitsUrl = DotNetSdkUpdater.getSdkProductCommitsUrl(sdkVersion, 'json');
    core.debug(`Downloading .NET SDK commits for version ${sdkVersion} from ${commitsUrl}...`);

    const response = await DotNetSdkUpdater.httpGet(commitsUrl);

    if (response.status === 404) {
      return null;
    } else if (response.status >= 400) {
      throw new Error(`Failed to get product commits for .NET SDK version ${sdkVersion} - HTTP status ${response.status}`);
    }

    const commits = await response.json();

    if (!commits) {
      throw new Error(`Failed to get product commits for .NET SDK version ${sdkVersion}.`);
    }

    return commits as SdkProductCommits;
  }

  private static async getSdkProductCommitsFromText(sdkVersion: string): Promise<SdkProductCommits> {
    const commitsUrl = DotNetSdkUpdater.getSdkProductCommitsUrl(sdkVersion, 'txt');
    core.debug(`Downloading .NET SDK commits for version ${sdkVersion} from ${commitsUrl}`);

    const response = await DotNetSdkUpdater.httpGet(commitsUrl);

    if (response.status && response.status >= 400) {
      throw new Error(`Failed to get product commits for .NET SDK version ${sdkVersion} - HTTP status ${response.status}`);
    }

    const commits = await response.text();

    const getValue = (component: string, property: string): string => {
      const regex = new RegExp(`${component}_${property}="([^"]+)"`);
      const match = commits.match(regex);
      if (!match) {
        throw new Error(`Failed to get ${component} ${property} for .NET SDK version ${sdkVersion}.`);
      }
      return match[1];
    };

    const getProduct = (component: string): ProductCommit => {
      return {
        commit: getValue(component, 'commit'),
        version: getValue(component, 'version'),
      };
    };

    return {
      installer: getProduct('installer'),
      runtime: getProduct('runtime'),
      aspnetcore: getProduct('aspnetcore'),
      windowsdesktop: getProduct('windowsdesktop'),
      sdk: getProduct('sdk'),
    };
  }

  private async getDotNetReleaseChannel(channel: string): Promise<ReleaseChannel> {
    const releasesUrl = `https://raw.githubusercontent.com/dotnet/core/main/release-notes/${channel}/releases.json`;

    core.debug(`Downloading .NET ${channel} release notes JSON from ${releasesUrl}`);

    const response = await DotNetSdkUpdater.httpGet(releasesUrl);

    if (response.status >= 400) {
      throw new Error(`Failed to get releases JSON for channel ${channel} - HTTP status ${response.status}`);
    }

    const releaseChannel = (await response.json()) as ReleaseChannel;

    if (!releaseChannel) {
      throw new Error(`Failed to get releases JSON for channel ${channel}.`);
    }

    return releaseChannel;
  }

  private static getReleaseForSdk(sdkVersion: string, channel: ReleaseChannel): ReleaseInfo {
    let releasesForSdk = channel.releases.filter((info: Release) => info.sdk.version === sdkVersion);
    let foundSdk: Sdk | null = null;

    if (releasesForSdk.length === 1) {
      foundSdk = releasesForSdk[0].sdk;
    } else if (releasesForSdk.length < 1) {
      releasesForSdk = channel.releases.filter((info: Release) => {
        if (info.sdks !== null) {
          for (const sdk of info.sdks) {
            if (sdk.version === sdkVersion) {
              foundSdk = sdk;
              return true;
            }
          }
        }
        return false;
      });
    }

    if (releasesForSdk.length < 1 || !foundSdk) {
      throw new Error(`Failed to find release for .NET SDK version ${sdkVersion}`);
    }

    const release = releasesForSdk[0];

    const result = {
      releaseDate: new Date(release['release-date']),
      releaseNotes: release['release-notes'],
      runtimeVersion: release.runtime.version,
      sdkVersion: foundSdk.version,
      security: release.security,
      securityIssues: [] as CveInfo[],
    };

    if (result.security) {
      const issues = release['cve-list'];
      if (issues) {
        result.securityIssues = DotNetSdkUpdater.mapCves(issues);
      }
    }

    return result;
  }

  private static mapCves(cves: Cve[]): CveInfo[] {
    return cves.map((issue: Cve) => ({
      id: issue['cve-id'],
      url: issue['cve-url'],
    }));
  }

  private async applySdkUpdate(globalJson: GlobalJson, versions: SdkVersions): Promise<string | undefined> {
    core.info(`Updating .NET SDK version in '${this.options.globalJsonPath}' to ${versions.latest.sdkVersion}...`);

    // Get the base branch to use later to create the Pull Request
    const base = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);

    // Apply the update to the file system
    globalJson.sdk.version = versions.latest.sdkVersion;
    const json = JSON.stringify(globalJson, null, 2) + os.EOL;

    await fs.promises.writeFile(this.options.globalJsonPath, json, { encoding: 'utf8' });
    core.info(`Updated SDK version in '${this.options.globalJsonPath}' to ${versions.latest.sdkVersion}`);

    // Configure Git
    if (!this.options.branch) {
      this.options.branch = `update-dotnet-sdk-${versions.latest.sdkVersion}`.toLowerCase();
    }

    let commitMessage = this.options.commitMessage;

    if (!commitMessage) {
      commitMessage = DotNetSdkUpdater.generateCommitMessage(versions.current.sdkVersion, versions.latest.sdkVersion);

      if (this.options.commitMessagePrefix) {
        commitMessage = `${this.options.commitMessagePrefix} ${commitMessage}`;
      }
    }

    if (this.options.userName) {
      await this.execGit(['config', 'user.name', this.options.userName]);
      core.info(`Updated git user name to '${this.options.userName}'`);
    }

    if (this.options.userEmail) {
      await this.execGit(['config', 'user.email', this.options.userEmail]);
      core.info(`Updated git user email to '${this.options.userEmail}'`);
    }

    if (this.options.repo) {
      await this.execGit(['remote', 'set-url', 'origin', `${this.options.serverUrl}/${this.options.repo}.git`]);
      await this.execGit(['fetch', 'origin'], true);
    }

    core.debug(`Branch: ${this.options.branch}`);
    core.debug(`Commit message: ${commitMessage}`);
    core.debug(`User name: ${this.options.userName}`);
    core.debug(`User email: ${this.options.userEmail}`);

    const branchExists = await this.execGit(['rev-parse', '--verify', '--quiet', `remotes/origin/${this.options.branch}`], true);

    if (branchExists) {
      core.info(`The ${this.options.branch} branch already exists`);
      return undefined;
    }

    await this.execGit(['checkout', '-b', this.options.branch], true);
    core.info(`Created git branch ${this.options.branch}`);

    await this.execGit(['add', this.options.globalJsonPath]);
    core.info(`Staged git commit for '${this.options.globalJsonPath}'`);

    await this.execGit(['commit', '-m', commitMessage, '-s']);

    const sha1 = await this.execGit(['log', "--format='%H'", '-n', '1']);
    const shortSha1 = sha1.replace(/'/g, '').substring(0, 7);

    core.info(`Committed .NET SDK update to git (${shortSha1})`);

    if (!this.options.dryRun && this.options.repo) {
      await this.execGit(['push', '-u', 'origin', this.options.branch], true);
      core.info(`Pushed changes to repository (${this.options.repo})`);
    }

    return base;
  }

  private async getLatestDotNetSdkForQuality(channel: string, sdkVersion: string): Promise<SdkVersions> {
    let releaseChannel: ReleaseChannel | null;
    try {
      releaseChannel = await this.getDotNetReleaseChannel(channel);
    } catch (err) {
      // This major version has not released its first preview yet
      releaseChannel = null;
    }
    return await DotNetSdkUpdater.getLatestDaily(sdkVersion, this.options.channel, this.options.quality, releaseChannel);
  }

  private async getLatestDotNetSdkForOfficial(channel: string, sdkVersion: string): Promise<SdkVersions> {
    const releaseChannel = await this.getDotNetReleaseChannel(channel);
    return DotNetSdkUpdater.getLatestRelease(sdkVersion, releaseChannel);
  }

  private static getChannel(version: string, label: string): string {
    const versionParts = version.split('.');

    if (versionParts.length < 2) {
      throw new Error(`'${version}' is not a valid ${label}.`);
    }

    return versionParts.slice(0, 2).join('.');
  }
}

interface CveInfo {
  id: string;
  url: string;
}

interface PullRequest {
  branch: string;
  number: number;
  supersedes: number[];
  url: string;
}

interface ReleaseInfo {
  releaseDate: Date;
  releaseNotes: string;
  runtimeVersion: string;
  sdkVersion: string;
  security: boolean;
  securityIssues: CveInfo[];
}

interface SdkVersions {
  current: ReleaseInfo;
  latest: ReleaseInfo;
  security: boolean;
  securityIssues: CveInfo[];
}

interface ReleaseChannel {
  'channel-version': string;
  'latest-release': string;
  'latest-release-date': string;
  'latest-runtime': string;
  'latest-sdk': string;
  'release-type': string;
  'support-phase': string;
  'eol-date"': string;
  'lifecycle-policy"': string;
  'releases': Release[];
}

interface Release {
  'release-date': string;
  'release-version': string;
  'security': boolean;
  'cve-list': Cve[];
  'release-notes': string;
  'runtime': Runtime;
  'sdk': Sdk;
  'sdks': Sdk[];
  'aspnetcore-runtime': Runtime;
}

interface Runtime {
  'version': string;
  'version-display': string;
}

interface Sdk {
  'version': string;
  'version-display': string;
  'runtime-version': string;
}

interface Cve {
  'cve-id': string;
  'cve-url': string;
}

interface GlobalJson {
  sdk: {
    version: string;
  };
}

interface ProductCommit {
  commit: string;
  version: string;
}

interface SdkProductCommits {
  installer: ProductCommit;
  runtime: ProductCommit;
  aspnetcore: ProductCommit;
  windowsdesktop: ProductCommit;
  sdk: ProductCommit;
}

// eslint-disable-next-line no-shadow
enum Quality {
  daily = 'daily',
  signed = 'signed',
  validated = 'validated',
  preview = 'preview',
}

type PaginatedApi = Api & {
  paginate: PaginateInterface;
};

class NullWritable extends Writable {
  _write(_chunk: any, _encoding: string, callback: (error?: Error | null) => void): void {
    callback();
  }
  _writev(_chunks: { chunk: any; encoding: string }[], callback: (error?: Error | null) => void): void {
    callback();
  }
}
