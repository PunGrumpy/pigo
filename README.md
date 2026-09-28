# Pigo

![Preview](.github/assets/preview.png)

A minimal-dependency, minimal-configuration image optimizer with a Go API backend and a Next.js web frontend.

## Features

- **Hybrid optimization**: The browser encodes WebP through the Canvas API, and the Go backend compresses and resizes JPEG and PNG.
- **Go API backend**: A REST server built on the standard library's JPEG and PNG codecs, with Catmull-Rom interpolation for resizing.
- **Next.js frontend**: Drag-and-drop uploads, clipboard paste, ZIP downloads, and a before/after comparison slider.
- **Zero heavy runtime dependencies**: The backend builds and runs without C libraries, GraphicsMagick, or libvips.
- **Turborepo monorepo**: Bun workspaces and `go.work` modules share one task graph and one cache.

## Tech stack

- **Backend**: Go (1.26+), [`chi`](https://github.com/go-chi/chi) router, `golang.org/x/image/draw`
- **Frontend**: Next.js (16.3+), React 19, Tailwind CSS v4, Lucide Icons, JSZip
- **Tooling**: Bun, Turborepo (with experimental Go workspace support), [Ultracite](https://github.com/PunGrumpy/ultracite) (Oxlint + Oxfmt)

## Project structure

Two apps and two shared packages, split across a Bun workspace and a Go workspace:

```text
pigo/
├── apps/
│   ├── api/                 # Go REST API backend (port 3001)
│   └── web/                 # Next.js web frontend (port 3000)
├── packages/
│   ├── core/                # Go image decoding, encoding, and resizing
│   └── typescript-config/   # Shared TypeScript configs
├── go.work                  # Go workspace; its members are Turborepo packages
└── package.json             # Bun workspace configuration
```

The Go modules (`apps/api`, `packages/core`) have no `package.json`. Turborepo reads them from `go.work` and derives their tasks, so you target a module by its directory or by its module path:

```bash
turbo run build --filter=./apps/api
turbo run build --filter=github.com/PunGrumpy/pigo/apps/api
```

`turbo run test` and `turbo run lint` cover every Go module in one pass, through a package Turborepo names `go-workspace`. Filtering to a single module runs `go test ./...` inside that module instead.

Vercel builds both apps without `turbo`. The flag makes Turborepo shell out to `go work edit -json` on every invocation, so a Next.js build image with no Go toolchain can no longer run it. Each app's `vercel.json` sets an explicit `buildCommand` that skips Turborepo, and the Go one writes to `$VERCEL_OUTPUT_FILE` so the platform finds the binary wherever the build runs from.

## Getting started

### Prerequisites

Make sure you have the following installed:

- [Go](https://go.dev/doc/install) (1.26 or later)
- [Bun](https://bun.sh) (1.3.14 or later)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/PunGrumpy/pigo.git
   cd pigo
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

### Development

Run the Go API backend and the Next.js frontend together:

```bash
bun dev
```

- **Frontend**: `http://localhost:3000`
- **API backend**: `http://localhost:3001`

### Configuration

The API reads its settings from the process environment. Set these variables before you start the API; `apps/api/.env.example` documents each one.

| Variable | Default | Description |
| :-- | :-- | :-- |
| `PORT` | `3001` | Port the API listens on. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000, http://127.0.0.1:3000, https://pigo-web.vercel.app` | Comma-separated origins the API allows for CORS. Entries of the form `https://*.example.com` match one subdomain level. |

### Formatting and linting

This project uses Ultracite (Oxlint + Oxfmt) to enforce code standards and formatting.

Report every issue without changing files:

```bash
bun run check
```

Rewrite files to fix what can be fixed automatically:

```bash
bun run fix
```

## API specification

### POST `/compress`

Optimizes and resizes a JPEG or PNG image.

- **Content-Type**: `multipart/form-data`

#### Request parameters

| Parameter | Type | Required | Default | Description |
| :-- | :-- | :-- | :-- | :-- |
| `file` | File | Yes | - | The image file to optimize, up to `4 MB`. Supported formats: JPEG, PNG, WebP. |
| `quality` | Integer | No | `82` | Target image quality from `1` to `100`. |
| `outputFormat` | String | No | `"same"` | Target image format: `"same"`, `"jpeg"`, or `"png"`. |
| `resizeWidth` | Integer | No | - | Target width in pixels, `1` to `16384`. |
| `resizeHeight` | Integer | No | - | Target height in pixels, `1` to `16384`. |
| `maintainAspect` | Boolean | No | `true` | Maintain aspect ratio when resizing, `"true"` or `"false"`. |

#### Notes

- The browser produces WebP output, not the API. A WebP upload with `outputFormat` set to `"same"` (the default) or `"webp"` returns `400`. Convert WebP through the API only to `"jpeg"` or `"png"`.
- The API rejects GIF input with `400`.
- The API accepts images up to 100 megapixels and 16384 pixels per side.
- The API returns `422` when the encoded result is larger than 4 MB. Vercel Functions reject response bodies over 4.5 MB.

#### Response headers

| Header              | Type    | Description                                  |
| :------------------ | :------ | :------------------------------------------- |
| `X-Original-Size`   | Integer | Size of the original image in bytes.         |
| `X-Compressed-Size` | Integer | Size of the optimized image in bytes.        |
| `X-Elapsed-Ms`      | Integer | Processing duration in milliseconds.         |
| `X-Output-Format`   | String  | Format of the output image, `jpeg` or `png`. |
| `X-Width`           | Integer | Width of the output image in pixels.         |
| `X-Height`          | Integer | Height of the output image in pixels.        |

### GET `/health`

Returns the health status of the API backend.

Response:

```json
{
  "status": "ok"
}
```

## License

[MIT](LICENSE)
