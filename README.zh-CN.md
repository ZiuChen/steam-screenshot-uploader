# Steam Screenshot Uploader (ssu)

[English](./README.md)

一个跨平台的命令行工具，用于将自定义截图上传到 Steam 云端。灵感来源于 [SteaScree](https://github.com/awthwathje/SteaScree)。

## 功能特性

- **交互式 TUI** — 基于 React + Ink 的完整终端界面，支持文件浏览、游戏/用户选择和上传进度展示
- **TUI 上传向导** — 分步引导式上传流程，支持方向键导航选择用户和游戏
- **自动检测** — 自动检测 Steam 安装目录、用户账号和游戏列表
- **VDF 集成** — 读写 Steam 的 `screenshots.vdf` 文件以注册上传的截图
- **缩略图生成** — 自动生成 200px 宽的缩略图
- **格式转换** — 自动将 PNG、BMP、WebP、TIFF 转换为 JPEG 以兼容 Steam
- **跨平台** — 支持 macOS、Linux 和 Windows

## 安装

通过以下命令安装：

```bash
npm install -g steam-screenshot-uploader@latest
```

或通过 npx 直接运行：

```bash
npx steam-screenshot-uploader@latest
```

## 快速上手

### 1. 启动交互式 TUI

```bash
ssu start
```

进入终端界面后：

1. 浏览文件系统，按 **Space** 选择截图文件
2. 按 **g** 选择截图要归属的游戏
3. 按 **Enter** 开始上传

### 2. 命令行上传

```bash
ssu upload './screenshots/*.png'
```

会启动一个 TUI 向导，引导你选择用户和游戏，确认后开始上传。

## 使用方法

### `ssu start` — 交互式 TUI

启动完整的文件浏览器界面，用于选择和上传截图：

```bash
ssu start
ssu start --steam-dir /path/to/steam
ssu start --user-id 123456789 --game-id 730
```

| 参数          | 说明               |
| ------------- | ------------------ |
| `--steam-dir` | Steam 安装目录路径 |
| `--user-id`   | 预选 Steam 用户 ID |
| `--game-id`   | 预选游戏 App ID    |

### `ssu upload` — 上传向导

通过 glob 模式指定文件，启动交互式 TUI 向导选择用户和游戏后上传：

```bash
ssu upload '*.png'
ssu upload './screenshots/**/*.jpg' --game-id 730
ssu upload '*.png' '*.jpg' --user-id 123456789 --game-id 730
```

| 参数          | 说明                          |
| ------------- | ----------------------------- |
| `--steam-dir` | Steam 安装目录路径            |
| `--user-id`   | Steam 用户 ID（跳过用户选择） |
| `--game-id`   | 游戏 App ID（跳过游戏选择）   |

文件以位置参数形式传递 glob 匹配模式。提供 `--user-id` 或 `--game-id` 后，相应的选择步骤会被跳过。

### `ssu --version`

打印当前版本号。

## 支持的图片格式

| 格式 | 扩展名          |
| ---- | --------------- |
| JPEG | `.jpg`、`.jpeg` |
| PNG  | `.png`          |
| BMP  | `.bmp`          |
| TIFF | `.tif`、`.tiff` |
| WebP | `.webp`         |

所有格式都会自动转换为 JPEG 以兼容 Steam。

## 工作原理

Steam 将截图元数据存储在自定义的 VDF（Valve Data Format）文件中，实际图片则放在 `userdata/` 下的特定目录结构中。本工具直接写入这些文件，让你无需通过 Steam 内置的截图功能即可添加自定义截图。

### 流程概览

```
[检测 Steam] → [发现用户] → [解析游戏] → [选择文件]
       ↓
[校验并转换图片] → [生成缩略图] → [更新 VDF]
       ↓
[启动 Steam 同步到云端]
```

### Steam 截图目录结构

Steam 将截图存储在 `userdata` 目录下：

```
<Steam目录>/userdata/<用户ID>/760/remote/
├── screenshots.vdf              ← 元数据文件（每用户一个）
├── <游戏ID>/screenshots/
│   ├── 20250101120000_1.jpg     ← 完整截图
│   └── thumbnails/
│       └── 20250101120000_1.jpg ← 200px 宽缩略图
└── <游戏ID>/screenshots/
    └── ...
```

### 详细步骤

1. **检测 Steam 安装** — 检查平台特定的默认路径（如 macOS 上的 `~/Library/Application Support/Steam`，Linux 上的 `~/.steam/steam`，Windows 上的 `C:\Program Files (x86)\Steam`），通过检查 `userdata/` 子目录来验证安装。

2. **发现用户** — 枚举 `userdata/` 下的数字目录（每个对应一个 Steam 用户 ID），从 `localconfig.vdf` 或 `config.cfg` 中读取用户显示名称。

3. **解析游戏** — 从多个数据源构建游戏名称索引：
   - 已安装游戏的清单文件（所有 Steam 库文件夹中的 `appmanifest_*.acf`）
   - 非 Steam 游戏快捷方式（`shortcuts.vdf`）
   - 二进制应用缓存（`appcache/appinfo.vdf`）
   - Steam Web API 作为兜底

4. **校验图片** — 检查图片是否在 Steam 限制范围内（单边最大 16,000px，总像素最大约 2600 万）。

5. **转换为 JPEG** — 所有图片格式都转换为 JPEG。缩略图按 200px 宽度等比缩放生成。

6. **更新 VDF** — 读取用户的 `screenshots.vdf`，跳过重复项，追加新条目（包含文件名、尺寸、时间戳、游戏 ID 等元数据），写回并备份原文件。

7. **通过 Steam 同步** — 上传完成后，启动 Steam 即可。Steam 会自动检测到新截图并同步到 Steam 云端。

### 为什么上传时必须关闭 Steam？

Steam 运行时会锁定 `screenshots.vdf` 文件。在 Steam 运行时写入可能导致数据损坏，或者你的修改在 Steam 退出时被覆盖。请在上传前关闭 Steam，上传完成后再重新打开以同步截图。

## 开发

```bash
# 安装依赖
vp install

# 开发模式运行
vp run dev

# 运行测试
vp test

# 类型检查和代码检查
vp check

# 生产构建
vp build
```

## 许可证

[MIT](./LICENSE)
