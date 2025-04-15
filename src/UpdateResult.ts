// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

export interface UpdateResult {
  branchName: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  security: boolean;
  supersedes: number[];
  updated: boolean;
  version: string;
  runtimeVersions: {
    aspNetCore: string;
    runtime: string;
    windowsDesktop?: string;
  } | null;
}
