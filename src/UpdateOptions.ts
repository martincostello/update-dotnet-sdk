// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

export interface UpdateOptions {

  accessToken: string;

  branch: string;

  channel: string;

  commitMessage: string;

  dryRun: boolean;

  globalJsonPath: string;

  repo?: string;

  runId?: string;

  userEmail: string;

  userName: string;
}
