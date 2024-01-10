// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

export interface UpdateOptions {
  accessToken: string;
  apiUrl?: string;
  branch: string;
  channel: string;
  closeSuperseded: boolean;
  commitMessage: string;
  commitMessagePrefix: string;
  dryRun: boolean;
  generateStepSummary: boolean;
  globalJsonPath: string;
  labels: string;
  quality?: string;
  repo: string;
  securityOnly: boolean;
  runId?: string;
  runRepo?: string;
  serverUrl?: string;
  userEmail: string;
  userName: string;
}
