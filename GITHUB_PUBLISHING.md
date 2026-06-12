# GitHub Publishing

このフォルダをGitHubへ公開する時の標準手順。

## すでにGitHub repoを作った場合

```powershell
.\scripts\publish-to-github.ps1 -Owner tskmons-eng -RepoName slack
```

## GitHub CLIでrepo作成から行う場合

最初に1回だけログインする。

```powershell
gh auth login
```

その後はrepo作成とpushをまとめて実行する。

```powershell
.\scripts\publish-to-github.ps1 -Owner tskmons-eng -RepoName slack -Create
```

private repoにする場合:

```powershell
.\scripts\publish-to-github.ps1 -Owner tskmons-eng -RepoName slack -Create -Private
```

## メモ

- `RepoName` を省略すると、現在のフォルダ名をrepo名として使う。
- `origin` が別URLに設定済みの場合は止まる。勝手にremoteを書き換えない。
- GitHub側のrepoが未作成で `-Create` も付けない場合、pushで失敗する。
