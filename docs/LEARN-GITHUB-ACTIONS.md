# Learn GitHub Actions on this repo

A hands-on path from zero to writing your own pipelines. Do every exercise yourself: type the YAML instead of pasting it, push, and read the logs. About 1–2 hours in total.

## 0. The mental model

GitHub Actions lends you a fresh computer every time something happens in your repo. You write a YAML file in `.github/workflows/` describing **when** to run (`on:`) and **what** to run (`jobs:` → `steps:`). GitHub runs it and puts ✅ or ❌ next to the commit.

```
push ──► GitHub reads .github/workflows/*.yml
           └─► starts ubuntu-latest machine
                 └─► step 1, step 2, step 3 …   (first failing step stops the job: ❌)
```

| Term | Meaning |
|---|---|
| workflow | one `.yml` file |
| `on:` | the trigger: `push`, `pull_request`, `schedule`, `workflow_dispatch` (manual button) |
| job | a set of steps on one machine; separate jobs run in parallel by default |
| step | `run:` a shell command, or `uses:` a ready-made action |
| runner | the machine, e.g. `ubuntu-latest` |
| exit code | a command that exits non-zero fails its step |

## 1. Read the real pipeline

Open `.github/workflows/ci.yml`. Line by line:

- `on: push` / `pull_request`: runs on every push and every PR.
- `actions/checkout@v4`: downloads the repo onto the runner. Without it the machine is empty.
- `actions/setup-node@v4` with `cache: npm`: installs Node 24 and caches downloads between runs.
- `npm ci`: installs exactly what `package-lock.json` says; fails if they disagree.
- `typecheck` → `lint` → `test` → `expo export`: each is a gate. The first failure stops the job.

Then open the **Actions** tab on GitHub, click the latest run, and expand every step's log. Find where the tests print `28 passed`.

## 2. Exercise: your first workflow

Create `.github/workflows/hello.yml`:

```yaml
name: Hello

on:
  workflow_dispatch:

jobs:
  say-hi:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Hello from a GitHub runner"
      - run: uname -a
      - run: node --version
```

Commit, push, then Actions → **Hello** → **Run workflow**. Read the output.

**Check yourself:** why didn't this run when you pushed? (Answer: the only trigger is `workflow_dispatch`.)

## 3. Exercise: a useful check that can fail

Create `.github/workflows/assets.yml` that fails if a product photo is missing or larger than 200 KB:

```yaml
name: Asset check

on:
  push:
    paths:
      - 'assets/**'
  workflow_dispatch:

jobs:
  images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Count product photos
        run: |
          count=$(ls assets/products/*.jpg | wc -l)
          echo "Found $count product photos"
          if [ "$count" -lt 25 ]; then
            echo "Expected 25 photos"; exit 1
          fi

      - name: No photo bigger than 200 KB
        run: |
          big=$(find assets/products -name '*.jpg' -size +200k)
          if [ -n "$big" ]; then
            echo "Too big: $big"; exit 1
          fi
          echo "All photos are small enough"
```

New ideas here: `paths:` (only run when matching files change), `run: |` (multi-line script), and `exit 1` (fail on purpose).

## 4. Break things on purpose

1. Change `-lt 25` to `-lt 99`, push, run it: ❌. Find the message in the log. Revert.
2. In any test, add `expect(1).toBe(2)`, push: **CI** fails at the `npm test` step. Revert.
3. Add a TypeScript error (e.g. `const x: number = 'a';` in a file under `src/`), push: fails at `typecheck`. Revert.

Being able to read a red log quickly is the real skill.

## 5. Matrix: test on two Node versions at once

In `ci.yml`, change the job to:

```yaml
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      # … same steps as before
```

Push, and you'll see two parallel jobs. `${{ … }}` is an **expression**: GitHub fills it in before running.

## 6. Two jobs with a dependency

Split checks and build so the build only runs when the checks pass:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps: [ …checkout, setup-node, npm ci, typecheck, lint, test… ]

  build:
    needs: test
    runs-on: ubuntu-latest
    steps: [ …checkout, setup-node, npm ci, expo export… ]
```

`needs:` turns parallel jobs into a chain.

## 7. Status badge

Add to the top of `README.md`:

```markdown
![CI](https://github.com/eRac3R/driftcart/actions/workflows/ci.yml/badge.svg)
```

## 8. Secrets (read, don't do yet)

Never put keys in YAML. Add them in **Settings → Secrets and variables → Actions**, then use `${{ secrets.EXPO_TOKEN }}` in a step. That's how CI could trigger an EAS build automatically later.

## Interview answer

> "Every push runs a GitHub Actions pipeline: `npm ci`, typecheck, lint, 28 Jest tests and a production bundle for web and Android. Broken code shows a red ❌ before it reaches anyone, and Vercel only redeploys a working main branch."

## Cheat sheet

| I want to… | Use |
|---|---|
| run on every push | `on: push` |
| run only for some files | `on: push: paths: ['src/**']` |
| add a manual button | `on: workflow_dispatch` |
| run nightly | `on: schedule: - cron: '0 2 * * *'` |
| run several versions | `strategy: matrix:` |
| chain jobs | `needs: other-job` |
| use a secret | `${{ secrets.NAME }}` |
| fail a step | any command exiting non-zero (`exit 1`) |
