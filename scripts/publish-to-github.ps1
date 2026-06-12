param(
  [string]$Owner = "tskmons-eng",
  [string]$RepoName = "",
  [switch]$Create,
  [switch]$Private
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoName)) {
  $RepoName = Split-Path -Leaf (Get-Location)
}

if (-not (Test-Path -LiteralPath ".git" -PathType Container)) {
  throw "Run this script from the root of a git repository."
}

$branch = (& git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
  throw "Could not determine the current git branch."
}

$repoFullName = "$Owner/$RepoName"
$remoteUrl = "https://github.com/$repoFullName.git"

if ($Create) {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI is not installed. Install gh, or create https://github.com/$repoFullName manually and rerun without -Create."
  }

  & gh auth status *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI is not logged in. Run 'gh auth login', or create https://github.com/$repoFullName manually and rerun without -Create."
  }

  & gh repo view $repoFullName *> $null
  if ($LASTEXITCODE -ne 0) {
    $visibilityArgs = @("--public")
    if ($Private) {
      $visibilityArgs = @("--private")
    }

    & gh repo create $repoFullName @visibilityArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create GitHub repository: $repoFullName"
    }
  }
}

& git remote get-url origin *> $null
if ($LASTEXITCODE -ne 0) {
  & git remote add origin $remoteUrl
} else {
  $currentOrigin = (& git remote get-url origin).Trim()
  if ($currentOrigin -ne $remoteUrl) {
    throw "origin is already set to '$currentOrigin'. Expected '$remoteUrl'. Change it manually if this is intentional."
  }
}

& git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
  throw "Push failed. Confirm the GitHub repo exists and this machine has push permission: $remoteUrl"
}

Write-Host "Published $branch to $remoteUrl"
