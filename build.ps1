#! /usr/bin/env pwsh

$ErrorActionPreference = "Stop"

npm run all

if ($LASTEXITCODE -ne 0) {
    throw "build failed"
}
