#! /usr/bin/pwsh

$ErrorActionPreference = "Stop"

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "build failed"
}

npm run test

if ($LASTEXITCODE -ne 0) {
    throw "test failed"
}
