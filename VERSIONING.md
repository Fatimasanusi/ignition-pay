# Versioning & Release Process

This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (SemVer 2.0.0) for all packages.

## Version Format

All packages follow the `MAJOR.MINOR.PATCH` format:

- **MAJOR** — Breaking changes that require migration steps
- **MINOR** — New features that are backward-compatible
- **PATCH** — Bug fixes and minor improvements

## Package Versioning

| Package | Registry | Current Version | Stability |
|---------|----------|----------------|-----------|
| `stellar-address-kit` (TypeScript) | [npm](https://www.npmjs.com/package/stellar-address-kit) | 1.0.1 | Stable |
| `stellar_address_kit` (Dart) | [pub.dev](https://pub.dev/packages/stellar_address_kit) | 1.0.1 | Stable |
| `core-go` (Go) | [pkg.go.dev](https://pkg.go.dev/github.com/Ignition-World/ignition-pay/packages/core-go) | 0.1.0 | Alpha |
| `@stellar-address-kit/spec` (Spec) | npm (workspace only) | 1.0.0 | Stable |

### Pre-release
Packages in `0.x.y` are in pre-release. During this phase:
- Minor versions may include breaking changes
- API stability is not guaranteed
- Frequent releases are expected

## Automated Release Workflow

Releases are driven by [Changesets](https://github.com/changesets/changesets) and triggered by git tags via GitHub Actions.

### Workflow Diagram

```
Developer                      GitHub                       CI/CD
────────────────────────────────────────────────────────────────────
  │                              │                             │
  ├─ pnpm changeset ─────────────►                             │
  │                              │                             │
  ├─ Open PR ───────────────────► PR checks run ─────────────►  │
  │                              │  • spec/validate.js         │
  │                              │  • spec:sync-check          │
  │                              │  • pnpm -r test             │
  │                              │  • go test ./...            │
  │                              │  • dart test                │
  │                              │                             │
  │         PR merged ──────────►                             │
  │                              │                             │
  ├─ pnpm changeset version ────►                             │
  ├─ Commit version bumps ──────►                             │
  ├─ git tag v1.x.x ────────────► Publish to NPM ────────────► │
  ├─ git tag core-dart/v1.x.x ──► Publish to pub.dev ────────► │
  │                              │                             │
  │                              │  • GitHub Release created   │
  │                              │                             │
```

### Triggering a Release

1. **Create changesets** during development:
   ```bash
   pnpm changeset
   ```
   Follow the prompts to describe the change and select affected packages.

2. **Merge changeset PRs** to `main` as normal.

3. **Apply version bumps** when ready to release:
   ```bash
   pnpm changeset version
   ```
   This consumes all pending changeset files, updates `package.json` versions, and regenerates `CHANGELOG.md`.

4. **Commit the version bump** and push to `main`:
   ```bash
   git add -A
   git commit -m "v{version}"
   git push origin main
   ```

5. **Create and push tags** to trigger automated publishing:
   ```bash
   # TypeScript / NPM release
   git tag v{version}
   git push origin v{version}

   # Dart / pub.dev release (use exact version from packages/core-dart/pubspec.yaml)
   git tag core-dart/v{version}
   git push origin core-dart/v{version}
   ```

   > Go modules are published automatically when a tag matching `packages/core-go/v*` is pushed; no separate publishing workflow is needed since Go proxy reads the source directly.

### Tag Conventions

| Tag Pattern | Triggered Workflow | Publishes To |
|-------------|--------------------|-------------|
| `v*` | `.github/workflows/publish.yml` | npm (`stellar-address-kit`) |
| `core-dart/v*` | `.github/workflows/publish-dart.yml` | pub.dev (`stellar_address_kit`) |
| `packages/core-go/v*` | (none — Go proxy auto-indexes) | pkg.go.dev |

## Required Configuration

### Repository Secrets

| Secret | Used By | Purpose |
|--------|---------|---------|
| `NPM_TOKEN` | `publish.yml` | Authenticates with npm registry for `pnpm publish` |
| `CODECOV_TOKEN` | `coverage.yml` | Uploads coverage reports to Codecov |

These must be configured in the GitHub repository under **Settings → Secrets and variables → Actions**.

### Changeset Configuration (`.changeset/config.json`)

The `linked` array ties the four packages together so they receive the same version bump:

```json
"linked": [["@stellar-address-kit/spec", "stellar-address-kit", "core-go", "core-dart"]]
```

Other key settings:
- `"access": "public"` — packages are public-scoped
- `"baseBranch": "main"` — the target branch
- `"updateInternalDependencies": "patch"` — workspace dependencies are bumped on any patch change

### Required Permissions

The `publish.yml` workflow requests an `id-token: write` permission to enable NPM provenance (attests that the package was published from this GitHub repo). The `publish-dart.yml` workflow does not need a token because it relies on `dart pub publish --force`, which requires pre-configured pub.dev credentials on the runner.

## Required Checks Before Publishing

Before pushing a release tag, verify the following pass on `main`:

### 1. Spec Validation
```bash
node spec/validate.js
```
Ensures `spec/vectors.json` conforms to `spec/schema.json`.

### 2. Version Synchronization
```bash
node scripts/check-vectors-sync.js
```
Verifies that `spec_version` in `spec/vectors.json` matches the version in `packages/spec/package.json`, `packages/core-ts/package.json`, `packages/core-dart/pubspec.yaml`, and `packages/core-go/go.mod`.

### 3. Cross-Language Test Suite
```bash
pnpm -r test          # TypeScript + workspace packages
go test ./...         # Go (run from packages/core-go)
dart test             # Dart (run from packages/core-dart)
```

### 4. Full Release Sequence (dry run)
```bash
node scripts/release.js
```
This runs the above steps automatically. It will exit with code 1 if any step fails.

### Pull Request Checks

Every PR to `main` automatically runs the above checks via:
- `.github/workflows/ci-ts.yml`
- `.github/workflows/ci-dart.yml`
- `.github/workflows/ci-go.yml`
- `.github/workflows/ci-pr.yml`
- `.github/workflows/spec-validate.yml`

These must be green before merging.

## Release Artifacts

Each release produces:

| Artifact | Location | Format |
|----------|----------|--------|
| npm package | `stellar-address-kit` on npm | `.tgz` (published) |
| pub.dev package | `stellar_address_kit` on pub.dev | Dart package (published) |
| Go module | `github.com/Ignition-World/ignition-pay/packages/core-go` | Go module index |
| GitHub Release | `https://github.com/Ignition-World/ignition-pay/releases` | Release notes + source archives |
| Changelog | `CHANGELOG.md` (root) | Markdown |

GitHub Releases are created automatically when tags are pushed. The changelog is maintained via Changesets and lives in `CHANGELOG.md`.

## Breaking Changes

Breaking changes require:
1. A MAJOR version bump
2. Migration guide in the changelog
3. Deprecation warnings for one minor version before removal

## Migration Guides

Migration guides for breaking changes are maintained in:
- `docs/migration/memo-to-muxed.md` — Memo to M-address migration
- `docs/migration/compatibility.md` — Cross-version compatibility notes

## Compatibility Matrix

| Spec Version | core-ts | core-dart | core-go |
|-------------|---------|-----------|---------|
| 1.0.0       | 1.0.1   | 1.0.1     | 0.1.0   |
