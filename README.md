# Steam Screenshot Uploader (ssu)

[中文文档](./README.zh-CN.md)

A cross-platform CLI tool for uploading custom screenshots to Steam Cloud. Inspired by [SteaScree](https://github.com/nicoco007/SteaScree).

## Features

- **Interactive TUI** — Full-featured terminal UI powered by React + Ink with file browsing, game/user selection, and upload progress
- **TUI Upload Wizard** — Step-by-step upload flow with arrow-key navigation for selecting users and games
- **Auto-detection** — Automatically detects Steam installation directory, user accounts, and games
- **VDF Integration** — Reads and writes Steam's `screenshots.vdf` to register uploaded screenshots
- **Thumbnail Generation** — Automatically generates 200px-wide thumbnails
- **Format Conversion** — Automatically converts PNG, BMP, WebP, and TIFF to JPEG for Steam compatibility
- **Cross-platform** — Works on macOS, Linux, and Windows

## Installation

Install via:

```bash
npm install -g steam-screenshot-uploader@latest
```

Or run directly with npx:

```bash
npx steam-screenshot-uploader@latest
```

## Quick Start

### 1. Launch the Interactive TUI

```bash
ssu start
```

Once inside the terminal interface:

1. Browse the filesystem, press **Space** to select screenshot files
2. Press **g** to choose which game the screenshots belong to
3. Press **Enter** to start uploading

### 2. Upload from Command Line

```bash
ssu upload './screenshots/*.png'
```

This launches a TUI wizard that guides you through selecting a user and game, then confirms and uploads.

## Usage

### `ssu start` — Interactive TUI

Launch the full-featured file browser for selecting and uploading screenshots:

```bash
ssu start
ssu start --steam-dir /path/to/steam
ssu start --user-id 123456789 --game-id 730
```

| Option        | Description                          |
| ------------- | ------------------------------------ |
| `--steam-dir` | Path to Steam installation directory |
| `--user-id`   | Pre-select a Steam user by ID       |
| `--game-id`   | Pre-select a game by app ID         |

### `ssu upload` — Upload Wizard

Upload screenshots via glob patterns with an interactive TUI wizard for user/game selection:

```bash
ssu upload '*.png'
ssu upload './screenshots/**/*.jpg' --game-id 730
ssu upload '*.png' '*.jpg' --user-id 123456789 --game-id 730
```

| Option        | Description                          |
| ------------- | ------------------------------------ |
| `--steam-dir` | Path to Steam installation directory |
| `--user-id`   | Steam user ID (skip user selection)  |
| `--game-id`   | Game app ID (skip game selection)    |

Files are specified as positional arguments using glob patterns. If `--user-id` or `--game-id` are provided, the corresponding selection step is skipped.

### `ssu --version`

Print the current version.

## Supported Image Formats

| Format | Extensions        |
| ------ | ----------------- |
| JPEG   | `.jpg`, `.jpeg`   |
| PNG    | `.png`            |
| BMP    | `.bmp`            |
| TIFF   | `.tif`, `.tiff`   |
| WebP   | `.webp`           |

All formats are automatically converted to JPEG for Steam compatibility.

## How It Works

Steam stores screenshot metadata in a custom VDF (Valve Data Format) file and the actual images in a specific directory structure under `userdata/`. This tool writes directly to those files, allowing you to add custom screenshots without going through Steam's built-in screenshot feature.

### Overview

```
[Detect Steam] → [Discover Users] → [Resolve Games] → [Select Files]
       ↓
[Validate & Convert Images] → [Generate Thumbnails] → [Update VDF]
       ↓
[Launch Steam to sync to cloud]
```

### Steam Screenshot Directory Structure

Steam stores screenshots under its `userdata` directory:

```
<SteamDir>/userdata/<UserId>/760/remote/
├── screenshots.vdf              ← metadata file (one per user)
├── <GameId>/screenshots/
│   ├── 20250101120000_1.jpg     ← full-size screenshot
│   └── thumbnails/
│       └── 20250101120000_1.jpg ← 200px-wide thumbnail
└── <GameId>/screenshots/
    └── ...
```

### Detailed Steps

1. **Detect Steam installation** — Checks platform-specific default paths (e.g. `~/Library/Application Support/Steam` on macOS, `~/.steam/steam` on Linux, `C:\Program Files (x86)\Steam` on Windows). Validates by checking for the `userdata/` subdirectory.

2. **Discover users** — Enumerates numeric directories under `userdata/` (each corresponding to a Steam user ID). Reads each user's display name from `localconfig.vdf` or `config.cfg`.

3. **Resolve games** — Builds a game name index from multiple data sources:
   - Installed game manifest files (`appmanifest_*.acf` across all Steam library folders)
   - Non-Steam game shortcuts (`shortcuts.vdf`)
   - Binary app cache (`appcache/appinfo.vdf`)
   - Steam Web API as fallback

4. **Validate images** — Checks that images are within Steam's limits (max 16,000px per side, max ~26M total pixels).

5. **Convert to JPEG** — All image formats are converted to JPEG. Thumbnails are generated at 200px width with proportional height.

6. **Update VDF** — Reads the user's `screenshots.vdf`, skips duplicates, appends new entries (containing filename, dimensions, timestamp, game ID, and other metadata), then writes back with a backup of the original file.

7. **Sync via Steam** — After uploading, simply launch Steam. It will automatically detect the new screenshots and sync them to Steam Cloud.

### Why Must Steam Be Closed During Upload?

Steam holds a lock on `screenshots.vdf` while running. Writing to it while Steam is open may cause data corruption, or your changes may be overwritten when Steam exits. Always close Steam before uploading, then reopen it to sync the screenshots.

## Development

```bash
# Install dependencies
vp install

# Run in development mode
vp run dev

# Run tests
vp test

# Type check and lint
vp check

# Build for production
vp build
```

## License

[MIT](./LICENSE)
