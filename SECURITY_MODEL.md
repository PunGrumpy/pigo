# Security model

This file describes who and what pigo trusts, so security reviews and scans judge findings against it. To report a vulnerability, use GitHub's private advisory flow: https://github.com/PunGrumpy/pigo/security/advisories/new

## System overview

pigo is an image compression service: a public Go HTTP API (`apps/api`) on Vercel, a Go image core (`packages/core`) and a Next.js product client (`apps/web`).

## Components

| Component  | Code                                    | Distribution surface |
| ---------- | --------------------------------------- | -------------------- |
| pigo       | `apps/api`, `packages/core`, `apps/web` | web API              |
| CI/release | `.github/workflows/*`                   | web API              |

## Assets

- Availability of the pigo API.
- Users' uploaded images in transit.

Critical assets across the maintainer's projects, in the maintainer's words: secrets in CI of action users (Cursor API key, `GITHUB_TOKEN`); root privileges and network config on Macs running Peony; integrity of published npm packages and releases; pigo API availability; and the data of downstream apps that use the libraries (logs, vectors, LINE messages).

## Trust boundaries and entry points

- **Internet → API**: `router/compress.go` takes multipart uploads with no login, capped by `http.MaxBytesReader` at `core.MaxFileSize` + 1 MB, then decodes (JPEG/PNG/WebP/HEIC), resizes and searches quality for a target size in `packages/core`.
- **Browser → API**: CORS allowlist from `CORS_ALLOWED_ORIGINS` (`middleware/cors.go`).

## Attackers that matter

- Anyone on the internet. The maintainer confirmed the API is public and needs no login.

## Existing controls

- Request body cap and CORS allowlist.

## Out of scope

- None beyond the portfolio-wide exclusions; `apps/web` here is the product client and is in scope.
- Across the maintainer's projects: docs and marketing sites, and bench and video packages.
