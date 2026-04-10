# Steam Screenshot Uploader (ssu)

[中文文档](./README.zh-CN.md)

A cross-platform CLI tool for uploading custom screenshots to Steam Cloud. Inspired by [SteaScree](https://github.com/nicoco007/SteaScree).

## Features

- **Interactive TUI** — Browse, select, and upload screenshots with a terminal UI powered by React + ink
- **CLI Batch Upload** — Upload screenshots non-interactively via glob patterns
- **Auto-detection** — Automatically detects Steam installation directory, user accounts, and games
- **VDF Integration** — Reads and writes Steam's `screenshots.vdf` to register uploaded screenshots
- **Thumbnail Generation** — Automatically generates thumbnails for uploaded screenshots
- **Cross-platform** — Works on macOS, Linux, and Windows

## Requirements

- Node.js >= 24
- Steam must be installed

## Installation

```bash
npm install -g steam-screenshot-uploader
```

Or run directly with npx:

```bash
npx ssu
```

## Usage

### Interactive TUI

Launch the interactive terminal UI to browse and upload screenshots:

```bash
ssu start
```

Optionally specify a custom Steam directory:

```bash
ssu start --steam-dir /path/to/steam
```

#### TUI Keybindings

| Key           | Action                                        |
| ------------- | --------------------------------------------- |
| `Tab`         | Switch between file browser and selected list |
| `↑/↓`         | Navigate items                                |
| `Enter/Space` | Select file / Remove from selected            |
| `Backspace`   | Go to parent directory                        |
| `g`           | Open game picker                              |
| `p`           | Open user picker                              |
| `u`           | Upload selected screenshots                   |
| `q`           | Quit                                          |

### CLI Batch Upload

Upload screenshots non-interactively using glob patterns:

```bash
ssu upload --images "./screenshots/*.jpg" --user 0 --game 0
```

#### Options

| Option        | Description                            |
| ------------- | -------------------------------------- |
| `--steam-dir` | Path to Steam installation directory   |
| `--images`    | Glob pattern for image files to upload |
| `--user`      | User index (0-based)                   |
| `--game`      | Game index (0-based)                   |

### Version

```bash
ssu --version
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- WebP (.webp)

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
