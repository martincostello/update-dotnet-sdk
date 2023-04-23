# Update .NET SDK

[![Build status](https://github.com/martincostello/update-dotnet-sdk/workflows/build/badge.svg?branch=main&event=push)](https://github.com/martincostello/update-dotnet-sdk/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![codecov](https://codecov.io/gh/martincostello/update-dotnet-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/martincostello/update-dotnet-sdk)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/martincostello/update-dotnet-sdk/badge)](https://api.securityscorecards.dev/projects/github.com/martincostello/update-dotnet-sdk)

This action updates the .NET SDK version specified by a `global.json` file stored in a GitHub repository.

An example Pull Request created by the action can be found [here][example-pull-request].

## Example Usage

```yml
steps:
- uses: actions/checkout@v3
- uses: martincostello/update-dotnet-sdk@v2
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Example Workflow

Below is an example of a full GitHub Actions workflow to automate .NET SDK updates.

```yml
name: update-dotnet-sdk

on:

  # Run at 2100 UTC on Tuesday every week to pick up any updates from
  # Patch Tuesday which occur on the second Tuesday of the month (PST).
  schedule:
    - cron:  '00 21 * * TUE'

  # Support running the workflow manually on-demand.
  workflow_dispatch:

jobs:
  update-dotnet-sdk:
    name: Update .NET SDK
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: martincostello/update-dotnet-sdk@v2
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Workflow

Below are examples of an advanced GitHub Actions workflow to automate .NET SDK updates that will
also use the [dotnet-outdated][dotnet-outdated] .NET Global Tool to update any NuGet packages
for the current .NET SDK release channel that are available from NuGet.org if the .NET SDK is updated.

This workflow leverages a [GitHub reusable workflow][reusable-workflow-docs] that is included
in this repository, which can be found [here][reusable-workflow].

The workflow supports being used with a GitHub [personal access token][personal-access-token],
a [GitHub app][github-apps], or [`GITHUB_TOKEN`][github-token].

> **Note**
> Using `GITHUB_TOKEN` is not recommended due to restrictions when [triggering a workflow from another workflow][triggering-workflows-from-a-workflow].

#### With a Personal Access Token

This workflow uses a personal access token (PAT) to authenticate with GitHub on behalf of the
user associated with the PAT. The PAT must have at least the `public_repo` scope (or `repo` for
private repositories) to be able to push changes to the repository and open a pull request.

See the [GitHub documentation][personal-access-token] for more information on creating a PAT.

```yaml
name: update-dotnet-sdk

on:

  # Scheduled trigger to check for .NET SDK updates at 2000 UTC every
  # Tuesday so that a run will coincide with monthly Update Tuesday releases
  # for security and non-security improvements to the .NET SDK and runtime.
  schedule:
    - cron:  '00 20 * * TUE'

  # Manual trigger to update the .NET SDK on-demand.
  workflow_dispatch:

# No additional permissions are required for GITHUB_TOKEN as we are using a PAT.
permissions:
  contents: read

# The Git commit user name and email are set as variables in the organization or repository settings.
# See https://docs.github.com/actions/learn-github-actions/variables.
jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v2
    with:
      labels: "dependencies,.NET"
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      repo-token: ${{ secrets.ACCESS_TOKEN }}
```

#### With a GitHub App

This workflow uses a GitHub app to authenticate with GitHub and perform the updates.
The app must have at least **Read and write** permissions for **Contents** and **Pull requests**
to be able to push changes to the repository and open a pull request.

See the [GitHub documentation][create-github-app] for more information on creating a GitHub app.

```yaml
name: update-dotnet-sdk

on:

  # Scheduled trigger to check for .NET SDK updates at 2000 UTC every
  # Tuesday so that a run will coincide with monthly Update Tuesday releases
  # for security and non-security improvements to the .NET SDK and runtime.
  schedule:
    - cron:  '00 20 * * TUE'

  # Manual trigger to update the .NET SDK on-demand.
  workflow_dispatch:

# No additional permissions are required for GITHUB_TOKEN as we are using an app.
permissions:
  contents: read

# The Git commit user name and email are set as variables in the organization or repository settings.
# See https://docs.github.com/actions/learn-github-actions/variables.
# You can obtain the user name and email for the GitHub app by running the following
# command using the GitHub CLI (https://cli.github.com/) in a terminal and substituting the values as shown below:
#
# app_name="YOUR_GITHUB_APP_NAME"
# echo "Git user name: ${app_name}[bot]"
# echo "Git user email: $(gh api "/users/${app_name}[bot]" --jq ".id")+${app_name}[bot]@users.noreply.github.com"
jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v2
    with:
      labels: "dependencies,.NET"
      user-email: ${{ vars.GIT_COMMIT_USER_EMAIL }}
      user-name: ${{ vars.GIT_COMMIT_USER_NAME }}
    secrets:
      application-id: ${{ secrets.UPDATER_APPLICATION_ID }}
      application-private-key: ${{ secrets.UPDATER_APPLICATION_PRIVATE_KEY }}
```

#### With GITHUB_TOKEN

This workflow uses the built-in `GITHUB_TOKEN` secret to authenticate with GitHub and
perform the updates as GitHub Actions. The token must have at least `write` permissions
for `contents` and `pull-requests` to be able to push changes to the repository and open
a pull request.

Using a real user/email is recommended instead of using `GITHUB_TOKEN`, otherwise pull
requests opened by this workflow, and commits pushed, will not queue your CI status checks
if you use GitHub Actions for your CI. More information about this restriction can be
found [here][triggering-workflows-from-a-workflow].

See the [GitHub documentation][github-token] for more information on `GITHUB_TOKEN`.

```yaml
name: update-dotnet-sdk

on:

  # Scheduled trigger to check for .NET SDK updates at 2000 UTC every
  # Tuesday so that a run will coincide with monthly Update Tuesday releases
  # for security and non-security improvements to the .NET SDK and runtime.
  schedule:
    - cron:  '00 20 * * TUE'

  # Manual trigger to update the .NET SDK on-demand.
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: read

jobs:
  update-sdk:
    uses: martincostello/update-dotnet-sdk/.github/workflows/update-dotnet-sdk.yml@v2
    permissions:
      contents: write
      pull-requests: write
    with:
      labels: "dependencies,.NET"
    secrets:
      repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

## Required

| **Name** | **Description** |
|:--|:--|
| `repo-token` | The GitHub access token to use to create a Pull Request for any SDK update to the repository. |

### Optional

| **Name** | **Description** | **Default** |
|:--|:--|:--|
| `branch-name` | The optional Git branch name to use. | - |
| `channel` | The optional .NET release channel to download the SDK for (3.1, 6.0, etc.). | The channel derived from the current SDK version. |
| `commit-message` | The optional Git commit message to use. | - |
| `global-json-file` | The optional path to the global.json file to update the SDK for. | `./global.json` |
| `labels` | The optional comma-separated label(s) to apply to Pull Requests generated by the action. | - |
| `user-email` | The optional email address to use for the Git commit. | `github-actions[bot]@users.noreply.github.com` |
| `user-name` | The optional user name to use for the Git commit. | `github-actions[bot]` |
| `dry-run` | If true, the action will not push changes to GitHub. | `false` |

## Outputs

| **Name** | **Description** |
|:--|:--|
| `pull-request-number` | The number of the Pull Request created by the action if the .NET SDK is updated. |
| `pull-request-html-url` | The HTML URL of the Pull Request created by the action if the .NET SDK is updated. |
| `sdk-updated` | Whether the .NET SDK was updated by the action. |
| `sdk-version` | The latest version of the .NET SDK for the specified channel when the action completed. |

All of the above inputs and outputs are also available with the [reusable workflow][reusable-workflow].

## Feedback

Any feedback or issues can be added to the issues for this project in [GitHub][issues].

## Repository

The repository is hosted in [GitHub][update-dotnet-sdk]: <https://github.com/martincostello/update-dotnet-sdk.git>

## License

This project is licensed under the [Apache 2.0][license] license.

[create-github-app]: https://docs.github.com/apps/creating-github-apps/creating-github-apps/creating-a-github-app
[dotnet-outdated]: https://github.com/dotnet-outdated/dotnet-outdated
[example-pull-request]: https://github.com/martincostello/update-dotnet-sdk/pull/10
[github-apps]: https://docs.github.com/apps/creating-github-apps/creating-github-apps/about-apps
[github-token]: https://docs.github.com/actions/security-guides/automatic-token-authentication
[issues]: https://github.com/martincostello/update-dotnet-sdk/issues
[license]: https://www.apache.org/licenses/LICENSE-2.0.txt
[personal-access-token]: https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
[reusable-workflow]: https://github.com/martincostello/update-dotnet-sdk/blob/main/.github/workflows/update-dotnet-sdk.yml
[reusable-workflow-docs]: https://docs.github.com/actions/using-workflows/reusing-workflows
[update-dotnet-sdk]: https://github.com/martincostello/update-dotnet-sdk
[triggering-workflows-from-a-workflow]: https://docs.github.com/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow
