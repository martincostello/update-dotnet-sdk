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
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
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
