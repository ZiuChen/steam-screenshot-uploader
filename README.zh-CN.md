# Steam Screenshot Uploader (ssu)

[English](./README.md)

一个跨平台的命令行工具，用于将自定义截图上传到 Steam 云端。灵感来源于 [SteaScree](https://github.com/nicoco007/SteaScree)。

## 功能特性

- **交互式 TUI** — 通过基于 React + ink 的终端界面浏览、选择并上传截图
- **CLI 批量上传** — 支持通过 glob 模式非交互式批量上传截图
- **自动检测** — 自动检测 Steam 安装目录、用户账号和游戏列表
- **VDF 集成** — 读写 Steam 的 `screenshots.vdf` 文件以注册上传的截图
- **缩略图生成** — 自动为上传的截图生成缩略图
- **跨平台** — 支持 macOS、Linux 和 Windows

## 环境要求

- Node.js >= 24
- 已安装 Steam

## 安装

```bash
npm install -g steam-screenshot-uploader
```

或通过 npx 直接运行：

```bash
npx ssu
```

## 使用方法

### 交互式 TUI

启动交互式终端界面，浏览并上传截图：

```bash
ssu start
```

可选指定自定义 Steam 目录：

```bash
ssu start --steam-dir /path/to/steam
```

#### TUI 快捷键

| 按键 | 操作 |
|------|------|
| `Tab` | 切换文件浏览器和已选列表 |
| `↑/↓` | 上下导航 |
| `Enter/Space` | 选择文件 / 从已选中移除 |
| `Backspace` | 返回上级目录 |
| `g` | 打开游戏选择器 |
| `p` | 打开用户选择器 |
| `u` | 上传已选截图 |
| `q` | 退出 |

### CLI 批量上传

通过 glob 模式非交互式上传截图：

```bash
ssu upload --images "./screenshots/*.jpg" --user 0 --game 0
```

#### 参数说明

| 参数 | 说明 |
|------|------|
| `--steam-dir` | Steam 安装目录路径 |
| `--images` | 图片文件的 glob 匹配模式 |
| `--user` | 用户索引（从 0 开始） |
| `--game` | 游戏索引（从 0 开始） |

### 查看版本

```bash
ssu --version
```

## 支持的图片格式

- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- WebP (.webp)

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
