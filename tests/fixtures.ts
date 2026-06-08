// Copyright (c) Martin Costello, 2020. All rights reserved.
// Licensed under the Apache 2.0 license. See the LICENSE file in the project root for full license information.

import * as fs from 'fs';
import { join } from 'path';
import { MockAgent, setGlobalDispatcher } from 'undici';
import { MockInterceptor } from 'undici/types/mock-interceptor';

type Fixture = {
  scenarios: Scenario[];
};

type Scenario = {
  basePath: string;
  method?: string;
  headers?: Record<string, string>;
  path: string;
  persist?: boolean;
  body?: any;
  status?: number;
  response: any;
  responseHeaders?: Record<string, string>;
};

const agent = new MockAgent();

agent.disableNetConnect();
setGlobalDispatcher(agent);

export type CapturedCommit = {
  branch: string;
  message: string;
  additions: { path: string; content: string }[];
};

let capturedCommit: CapturedCommit | undefined;
let commitInterceptorsRegistered = false;

const commitOid = 'a'.repeat(40);

function registerCommitInterceptors(): void {
  if (commitInterceptorsRegistered) {
    return;
  }
  commitInterceptorsRegistered = true;

  const origin = 'https://github.local';
  const jsonHeaders = { 'content-type': 'application/json' };

  // The target branch does not already exist
  agent
    .get(origin)
    .intercept({ path: /\/git\/ref\/heads%2F/, method: 'GET' })
    .reply(404, { message: 'Not Found' }, { headers: jsonHeaders })
    .persist();

  // Creating the branch reference succeeds
  agent
    .get(origin)
    .intercept({ path: /\/git\/refs$/, method: 'POST' })
    .reply(201, { ref: 'refs/heads/branch', object: { sha: commitOid } }, { headers: jsonHeaders })
    .persist();

  // The createCommitOnBranch GraphQL mutation captures the commit and returns its OID
  agent
    .get(origin)
    .intercept({ path: '/api/graphql', method: 'POST' })
    .reply((options) => {
      const body = JSON.parse(options.body as string);
      const input = body.variables.input;
      capturedCommit = {
        branch: input.branch.branchName,
        message: `${input.message.headline}\n\n${input.message.body}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additions: input.fileChanges.additions.map((addition: any) => ({
          path: addition.path,
          content: Buffer.from(addition.contents, 'base64').toString('utf8'),
        })),
      };
      return {
        statusCode: 200,
        data: { data: { createCommitOnBranch: { commit: { oid: commitOid } } } },
        responseOptions: { headers: jsonHeaders },
      };
    })
    .persist();
}

export function setupCommit(): void {
  capturedCommit = undefined;
  registerCommitInterceptors();
}

export function getCapturedCommit(): CapturedCommit | undefined {
  return capturedCommit;
}

export async function setup(name: string): Promise<void> {
  const fileName = join(__dirname, 'fixtures', `${name}.json`);
  const json = await fs.promises.readFile(fileName, 'utf8');
  const fixture: Fixture = JSON.parse(json);

  for (const scenario of fixture.scenarios) {
    const options: MockInterceptor.Options = {
      method: scenario.method ?? 'GET',
      path: scenario.path,
    };

    if (scenario.headers) {
      options.headers = {};
      for (const [key, value] of Object.entries(scenario.headers)) {
        options.headers[key] = value;
      }
    }

    if (scenario.body) {
      options.body = typeof scenario.body === 'string' ? scenario.body : JSON.stringify(scenario.body);
    }

    const responseOptions: MockInterceptor.MockResponseOptions = {
      headers: {
        'Content-Type': typeof scenario.response === 'string' ? 'text/plain' : 'application/json',
      },
    };

    if (scenario.responseHeaders) {
      responseOptions.headers = scenario.responseHeaders;
    }

    const scope = agent
      .get(scenario.basePath)
      .intercept(options)
      .reply(scenario.status ?? 200, scenario.response, responseOptions);

    if (scenario.persist) {
      scope.persist();
    }
  }
}
