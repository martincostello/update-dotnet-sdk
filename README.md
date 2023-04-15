# Update .NET SDK

[![Build status](https://github.com/martincostello/update-dotnet-sdk/workflows/build/badge.svg?branch=main&event=push)](https://github.com/martincostello/update-dotnet-sdk/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![codecov](https://codecov.io/gh/martincostello/update-dotnet-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/martincostello/update-dotnet-sdk)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/martincostello/update-dotnet-sdk/badge)](https://api.securityscorecards.dev/projects/github.com/martincostello/update-dotnet-sdk)

This action updates the .NET SDK version specified by a `global.json` file stored in a GitHub repository.

An example Pull Request created by the action can be found [here](https://github.com/martincostello/update-dotnet-sdk/pull/10).

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

  # Scheduled trigger to check for .NET SDK updates once every six hours.
  schedule:
    - cron:  '0 */6 * * *'

  # Manual trigger to update the .NET SDK on-demand.
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

### Advanced Example Workflow

Below is an example of a full GitHub Actions workflow to automate .NET SDK updates
that will also use the [dotnet-outdated](https://github.com/dotnet-outdated/dotnet-outdated)
.NET Global Tool to update any NuGet packages for the current .NET SDK release channel
that are available from NuGet.org if the .NET SDK is updated.

```yaml
name: update-dotnet-sdk

# Using a real user/email is recommended instead of using GITHUB_TOKEN if you use GitHub Actions for your CI.
# Otherwise, pull requests opened by this workflow, and commits pushed, will not queue your CI status checks.
# See https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow.
env:
  GIT_COMMIT_USER_EMAIL: 41898282+github-actions[bot]@users.noreply.github.com
  GIT_COMMIT_USER_NAME: github-actions[bot]
  REPO_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  TERM: xterm

on:

  # Scheduled trigger to check for .NET SDK updates at 2000 UTC every
  # Tuesday so that a run will coincide with monthly Update Tuesday releases
  # for security and non-security improvements to the .NET SDK and runtime.
  schedule:
    - cron:  '00 20 * * TUE'

  # Manual trigger to update the .NET SDK on-demand.
  workflow_dispatch:

# Specify minimal permissions if using GITHUB_TOKEN
permissions:
  contents: read
  pull-requests: read

jobs:
  update-dotnet-sdk:
    name: Update .NET SDK
    runs-on: ubuntu-latest
    if: ${{ github.event.repository.fork == false }}

    # Specify minimal permissions if using GITHUB_TOKEN
    permissions:
      contents: write
      pull-requests: write

    steps:

    # Checkout the repository to check for updates.
    # A token is specified so that pushes to the repository using
    # a user-specfied GitHub PAT trigger GitHub Actions workflows.
    - name: Checkout code
      uses: actions/checkout@v3
      with:
        token: ${{ env.REPO_TOKEN }}

    # Run the action that checks for updates to the .NET SDK.
    - name: Update .NET SDK
      id: update-dotnet-sdk
      uses: martincostello/update-dotnet-sdk@v2
      with:
        repo-token: ${{ env.REPO_TOKEN }}
        user-email: ${{ env.GIT_COMMIT_USER_EMAIL }}
        user-name: ${{ env.GIT_COMMIT_USER_NAME }}

    # If the .NET SDK was updated, also check for updates to .NET
    # NuGet packages that are published as part of a new release.
    - name: Setup .NET SDK
      uses: actions/setup-dotnet@v3
      if : ${{ steps.update-dotnet-sdk.outputs.sdk-updated == 'true' }}

    - name: Update NuGet packages
      if : ${{ steps.update-dotnet-sdk.outputs.sdk-updated == 'true' }}
      shell: pwsh
      env:
        DOTNET_CLI_TELEMETRY_OPTOUT: true
        DOTNET_NOLOGO: true
        DOTNET_SKIP_FIRST_TIME_EXPERIENCE: 1
        DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION: 1
        NUGET_XMLDOC_MODE: skip
      run: |
        $ErrorActionPreference = "Stop"

        # Install the dotnet outdated global tool.
        dotnet tool install --global dotnet-outdated-tool

        # Get the path to a temporary file that dotnet outdated can write to
        # that can be parsed to determine what packages updates were performed.
        $tempPath = [System.IO.Path]::GetTempPath()
        $updatesPath = (Join-Path $tempPath "dotnet-outdated.json")

        Write-Host "Checking for .NET NuGet package(s) to update..."

        # Check for .NET NuGet package updates and apply any required updates
        # to the project file(s). Updates are locked to the current major version
        # so that only package updates for the current .NET SDK release channel
        # are performed when upgrades are made by the tool.
        dotnet outdated `
          --upgrade `
          --version-lock Major `
          --output $updatesPath `
          --include "Microsoft.AspNetCore." `
          --include "Microsoft.EntityFrameworkCore." `
          --include "Microsoft.Extensions." `
          --include "Microsoft.NET.Test.Sdk" `
          --include "System."

        $dependencies = @()

        # If there were any updates, determine the unique set of package
        # updates that were applied to the repository's projects.
        if (Test-Path $updatesPath) {
          $dependencies = `
            Get-Content -Path $updatesPath | `
            ConvertFrom-Json | `
            Select-Object -ExpandProperty projects | `
            Select-Object -ExpandProperty TargetFrameworks | `
            Select-Object -ExpandProperty Dependencies | `
            Sort-Object -Property Name -Unique
        }

        if ($dependencies.Count -gt 0) {
          Write-Host "Found $($dependencies.Count) .NET NuGet package(s) to update." -ForegroundColor Green

          # Build a commit message similar to dependabot that can be parsed to
          # determine what updates were performed in a particular Git commit.
          $commitMessageLines = @()

          if ($dependencies.Count -eq 1) {
            $commitMessageLines += "Bump $($dependencies[0].Name) from $($dependencies[0].ResolvedVersion) to $($dependencies[0].LatestVersion)"
            $commitMessageLines += ""
            $commitMessageLines += "Bumps $($dependencies[0].Name) from $($dependencies[0].ResolvedVersion) to $($dependencies[0].LatestVersion)."
          } else {
            $commitMessageLines += "Bump .NET NuGet packages"
            $commitMessageLines += ""
            $commitMessageLines += "Bumps .NET dependencies to their latest versions for the .NET ${{ steps.update-dotnet-sdk.outputs.sdk-version }} SDK."
            $commitMessageLines += ""
            foreach ($dependency in $dependencies) {
              $commitMessageLines += "Bumps $($dependency.Name) from $($dependency.ResolvedVersion) to $($dependency.LatestVersion)."
            }
          }

          $commitMessageLines += ""
          $commitMessageLines += "---"
          $commitMessageLines += "updated-dependencies:"

          foreach ($dependency in $dependencies) {
            $commitMessageLines += "- dependency-name: $($dependency.Name)"
            $commitMessageLines += "  dependency-type: direct:production"
            $commitMessageLines += "  update-type: version-update:semver-$($dependency.UpgradeSeverity.ToLowerInvariant())"
          }

          $commitMessageLines += "..."
          $commitMessageLines += ""
          $commitMessageLines += ""

          $commitMessage = $commitMessageLines -join "`n"

          # Ensure the same Git user is used as the commit to update the .NET SDK.
          git config user.email "${{ env.GIT_COMMIT_USER_EMAIL }}"
          git config user.name "${{ env.GIT_COMMIT_USER_NAME }}"

          # Push the changes to the same branch as the commit for the .NET SDK update.
          git add .
          git commit -m $commitMessage
          git push

          Write-Host "Pushed update to $($dependencies.Count) NuGet package(s)." -ForegroundColor Green
        }
        else {
          Write-Host "There are no .NET NuGet packages to update." -ForegroundColor Green
        }
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

## Feedback

Any feedback or issues can be added to the issues for this project in [GitHub](https://github.com/martincostello/update-dotnet-sdk/issues).

## Repository

The repository is hosted in [GitHub](https://github.com/martincostello/update-dotnet-sdk): https://github.com/martincostello/update-dotnet-sdk.git

## License

This project is licensed under the [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) license.
