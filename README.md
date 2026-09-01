# sayelf-nature-window

> **进入自然，不是站在自然之外观看。**
> **Enter nature instead of observing it from outside.**

`Nature Window` 是一个面向 AI Agent 的自然视觉叙事 Skill。它将一种稳定的自然摄影视觉机制封装为可调用、可组合、可扩展的输出能力，让 Codex、Claude Code、WorkBuddy 等 Agent 可以通过 MCP、CLI 或 API 从同一个 `SceneSpec` 选择图片提示词、五镜头视频分镜，或两者同时生成。

`Nature Window` is an AI-agent-native visual narrative skill for nature imagery. It turns a stable photographic grammar into a callable, composable, and extensible output capability. Agents such as Codex, Claude Code, and WorkBuddy can select an image prompt, a five-shot video storyboard, or both through MCP, CLI, or HTTP API while preserving one visual DNA across many different scenes.

## 当前版本 / Current Release

**v0.12.0 — 动态场景组合模式 / Dynamic Scene Composition Modes**

本版本在保持 `Enter → Enclose → Guide → Reveal` 核心机制与既有架构不变的基础上，新增：

- **垂直向上视觉机制**：从小昆虫般的贴地视角沿植物缝隙向上，自动匹配治愈蓝天、朝霞、晚霞或雨后天光，形成“管中窥豹”的发现感，并寓意在阻力中向光奋斗。
- **普通用户自动匹配**：留空即可，系统根据场景和视觉表现自动匹配视觉钩子、情绪与隐藏窗口；复杂规则不需要用户理解。
- **高级用户可选择自定义**：在高级设置中切换到“高级用户自定义”，可填写任意需要改变的项目；未填写的项目仍自动匹配。
- **提示词驱动视觉模拟预览**：点击生成、随机生成或组合生成后，Prompt 右侧根据场景、天空情绪、视觉风格、色彩策略和随机种子绘制竖屏模拟图；每次生成自动变化，用于理解构图与色彩，不冒充最终照片。
- **画面比例可选**：普通用户可直接选择 `1:1`、`4:5`、`3:4`、`9:16` 或 `16:9`；所选比例会同步写入提示词、API/MCP/CLI 输出和视觉模拟预览。
- **动态场景组合模式**：提供“自动选择”“随机组合”和“手动选择”；自动选择使用协调的植物–地点–情绪组合，随机组合独立抽取三项，手动选择保留高级用户的精确控制。
- **完整 WebUI 美化**：以自然观察台为设计方向，重做页面层级、控件、按钮、卡片、预览区与移动端布局，让生成流程更清晰、更有视觉重点。
- **复制成功反馈**：点击“复制”后显示明确的“复制成功”；没有内容或浏览器拒绝复制时，也会给出清晰提示。
- **透明结果说明**：生成结果返回结构化 `auto_match`，明确显示匹配到的内容；需要时仍可展开高级设置手动覆盖。
- **三档视觉风格**：自然、反差增强、视觉冲击，可在 WebUI、API 和生成器中调用。
- **智能色彩策略**：根据场景色彩家族自动计算饱和度、色相和明亮度，并写入结构化 `color_plan`。
- **版本化更新**：仓库原地持续更新；每次功能更新递增 SemVer 版本号，并同步运行时版本与 Git 标签。后续请以版本号和本节更新摘要为准。

This release adds three dynamic scene-composition modes: automatic selection chooses a coordinated plant–location–emotion set, random combination independently samples the three dimensions, and manual selection preserves precise control for advanced users. All modes remain seed-reproducible and carry the result through prompts, the visual simulation preview, and the existing API/MCP/CLI interfaces. Selectable aspect ratios, upward insect-scale discovery, automatic matching, the frozen core, and copy feedback remain intact. Future releases update this repository in place and are identified by an incremented SemVer version and matching Git tag.

**v0.13.0 — One Core, Two Outputs / 一核两出口**

本次 v0.5 输出契约里程碑在现有 v0.12.0 能力之上完成收口：同一个 `SceneSpec` 通过统一 `OutputContract` 选择 `image`、`storyboard` 或 `both`。图片提示词编译器位于 `plugins/outputs/image`；分镜编译器位于 `plugins/outputs/storyboard`，固定输出 `ENTER / ENCLOSE / GUIDE / REVEAL / HOLD` 五镜头，其中 `HOLD` 是时间化停留，不是新的 Core 阶段。输出插件独立失败并记录在 `errors`，健康出口继续返回。

This v0.5 output-contract milestone builds on v0.12.0: one `SceneSpec` now selects `image`, `storyboard`, or `both` through one `OutputContract`. Image prompt compilation lives in `plugins/outputs/image`; storyboard compilation lives in `plugins/outputs/storyboard` and always returns five shots — `ENTER / ENCLOSE / GUIDE / REVEAL / HOLD`. `HOLD` is a temporal coda, not a new Core stage. Output failures are isolated in `errors`, so a healthy sibling output remains available.

**v0.14.0 — Continuity Workspace / 一致性双栏工作台**

v0.6 界面里程碑继续保持同一个 `SceneSpec` 和冻结 Core：WebUI 默认同时展示图片提示词与视频分镜提示词，两栏各自独立复制；图片提示词自动对齐分镜的 `REVEAL` 关键帧，分镜以 `HOLD` 收束。

The v0.6 interface milestone keeps one `SceneSpec` and the frozen Core intact. The WebUI defaults to both outputs in two independent columns with separate copy actions. The image prompt is automatically aligned to the storyboard `REVEAL` keyframe, while the storyboard closes with `HOLD`.

全域语言按钮支持中文、English 和中英双语，并会在已有结果上即时重绘。统一契约新增确定性的 `continuity` 锚点，跨图片与五个镜头固定主体、环境、隐藏窗口、视觉钩子、色彩、光线和镜头身份；变化只推进 `ENTER → ENCLOSE → GUIDE → REVEAL` 的发现过程。

The global language switch supports Chinese, English, and bilingual output and re-renders an existing result immediately. The unified contract now carries a deterministic `continuity` anchor that keeps subject, environment, hidden window, visual hook, palette, light, and camera identity stable across the image and all five shots; only the discovery sequence advances through `ENTER → ENCLOSE → GUIDE → REVEAL`.

![Nature Window core overview](assets/nature-window-overview.png)

![Nature Window visual preview](assets/nature-window-preview.png)

## One Core, Two Outputs / 一核两出口

```text
                    SceneSpec
                       │
                       ▼
       Visual Grammar Core（只保留四段机制）
            Enter → Enclose → Guide → Reveal
                       │
              ┌────────┴────────┐
              ▼                 ▼
        IMAGE OUTPUT       STORYBOARD OUTPUT
        图片提示词           五镜头视频分镜
        decisive frame      ENTER / ENCLOSE / GUIDE / REVEAL / HOLD
```

The Core decides how the viewer discovers the world. Output plugins decide how that same SceneSpec is expressed: one decisive image frame, or a minimum five-shot temporal storyboard. `HOLD` is a storyboard coda, not a new Core stage.

核心只决定“如何进入并发现世界”。输出插件负责表达形式：一帧决定性的图片提示词，或最小五镜头时间化分镜。`HOLD` 是分镜的停留尾镜，不是新的核心阶段。

---

## 核心机制 / Core Mechanism

```text
Enter → Enclose → Guide → Reveal
进入  →  包围   →  引导  →  显露
```

### 01. Enter / 进入

镜头真正进入自然内部：草丛根部、荷叶下方、竹林地面、枝叶之间、溪谷石缝……

The camera physically enters the environment: beneath grass, lotus leaves, bamboo, branches, ferns, rocks, or other natural structures.

### 02. Enclose / 包围

植物与自然元素占据画面大部分区域，以真实遮挡、层次和空间压迫形成沉浸感。

Natural elements occupy most of the frame, creating immersion through authentic occlusion, layering, and spatial enclosure.

### 03. Guide / 引导

利用枝条、茎秆、叶片方向、尺寸递减、明暗变化和空间节奏，把视线自然引向深处。

Branches, stems, leaf direction, scale reduction, luminance, and depth rhythm guide the eye naturally through the scene.

### 04. Reveal / 显露

最终只留下一个克制的“隐藏窗口”作为视觉出口，并配置一个主要视觉钩子。

A restrained hidden window becomes the primary visual exit, accompanied by one principal visual hook.

---

# 核心价值 / Core Value

普通提示词解决的是：

> **“画什么？” / What should be shown?**

Nature Window 更关注：

> **“观众从哪里进入画面，又在哪里发现它？”**
> **“Where does the viewer enter the image, and where does discovery happen?”**

因此它不是单纯的植物 Prompt 集合，而是一套可以跨场景复用的**视觉空间语法**。

It is therefore not merely a collection of plant prompts. It is a reusable **visual-spatial grammar**.

### 价值 1：统一视觉 DNA / Consistent Visual DNA

不同植物、季节、地点和天气可以变化，但核心观看方式保持一致。

Plants, seasons, locations, weather, and moments can change while the underlying way of seeing remains stable.

### 价值 2：同一场景持续产生不同作品 / Series Generation

同一个荷塘、竹林或雪枝场景可以通过受控变量连续生成不同提示词，而不是机械重复模板。

The same lotus pond, bamboo forest, or winter branch scene can generate many controlled variations instead of repeating a fixed template.

### 价值 3：从 Prompt 模板升级为生成机制 / From Template to Generator

场景不是写死的。Scene Composer 可以根据植物、地点、情绪、窗口和视觉钩子动态构造新的 `SceneSpec`，并支持自动选择、随机组合和手动选择三种组合模式。

Scenes are not hard-coded. Scene Composer can dynamically construct new `SceneSpec` objects from plants, locations, emotions, windows, and visual hooks.

### 价值 4：AI Agent 原生 / AI-Agent Native

Skill 可以与 Codex、Claude Code、WorkBuddy 及其他 Agent 共生，而不是要求 Agent 每次重新理解和编写整套提示词。

The skill coexists with Codex, Claude Code, WorkBuddy, and other agents. Agents call the capability instead of reconstructing the visual logic every time.

### 价值 5：内容扩张，Core 不膨胀 / Content Expands, Core Stays Small

新增场景、植物、季节和变体通过 Plugin/Provider 扩展，不继续向 Core 堆逻辑。

New scenes, plants, seasons, and variations are added through plugins/providers rather than accumulating logic inside Core.

---

## 系统结构 / Architecture

```text
Human / AI Agent
       │
       ├── MCP
       ├── CLI
       ├── HTTP API
       └── WebUI
              │
              ▼
        Core Compiler
              │
     ┌────────┼──────────┐
     │        │          │
   Scene   Variation   Composer
  Provider  Provider    Provider
     │        │          │
     └────────┼──────────┘
              ▼
  OutputContract Dispatcher
              │
       ┌──────┴──────┐
       ▼             ▼
     Image       Storyboard
     图片          视频分镜
```

### Core 只负责 / Core Owns

- 冻结视觉语法 / frozen visual grammar
- SceneSpec resolution and deterministic variation / SceneSpec 解析与确定性变化
- Plugin Contract
- Provider Registry
- OutputContract dispatch and validation / OutputContract 分发与校验

### Plugin 负责 / Plugins Own

- 场景库 / scene catalogs
- 植物与生态系统 / plants and ecosystems
- 变体轴 / variation axes
- 动态场景组合 / dynamic scene composition
- 图片提示词 / image prompt compilation
- 五镜头视频分镜 / five-shot storyboard compilation

### Adapter 负责 / Adapters Own

- MCP
- CLI
- HTTP API
- WebUI
- AI Agent integration

## 统一输出契约 / OutputContract

Every generation request accepts `output: image | storyboard | both` and returns the same machine-readable envelope:

每个生成请求都接受 `output: image | storyboard | both`，并返回统一结构：

```json
{
  "contract": "hidden-nature-window.output",
  "version": "0.6.0",
  "output": "both",
  "language": "bilingual",
  "scene": "shared SceneSpec",
  "seed": 2026,
  "variation": "shared deterministic variation",
  "visual_grammar": ["enter", "enclose", "guide", "reveal"],
  "continuity": { "continuity_id": "nw-…", "shot_order": ["ENTER", "ENCLOSE", "GUIDE", "REVEAL", "HOLD"], "image_keyframe": "REVEAL", "final_hold": "HOLD" },
  "outputs": { "image": "...", "storyboard": "..." },
  "errors": []
}
```

The `scene`, `variation`, `seed`, and `visual_grammar` are shared by both outputs. A failed output plugin is reported in `errors` without discarding a healthy sibling output.

图片与分镜共享 `scene`、`variation`、`seed` 和 `visual_grammar`。一个输出插件失败时，错误进入 `errors`，不会丢弃健康的另一个出口。

---

## 场景系统 / Scene System

当前内置场景覆盖：

- 野花草丛 / Wildflower Meadow
- 秘密花隧道 / Secret Flower Tunnel
- 竹林 / Bamboo Forest
- 荷塘 / Lotus Pond
- 芦苇湿地 / Reed Marsh
- 雪枝 / Winter Branches
- 秋日枫叶 / Autumn Maple
- 苔藓溪谷 / Mossy Stream
- 麦田 / Wheat Field
- 稻田 / Rice Field
- 向日葵丛 / Sunflower Field
- 樱花 / Cherry Blossom
- 紫藤 / Wisteria
- 蕨类森林 / Fern Forest
- 松林 / Pine Forest
- 白桦林 / Birch Grove
- 雨后竹林 / Bamboo After Rain
- 芭蕉林 / Banana Grove
- 茶园 / Tea Garden
- 薰衣草 / Lavender
- 绣球花 / Hydrangea
- 山茶花 / Camellia
- 海岸草坡 / Coastal Grass
- 高山草甸 / Alpine Meadow

场景库只是 Provider，不是系统边界。

The scene catalog is a provider, not the boundary of the system.

---

## 受控变化 / Controlled Variation

同一场景可以沿多个维度变化：

```text
Time
× Weather
× Camera Micro-position
× Window Shape
× Foreground Occlusion
× Depth Rhythm
× Seasonal Trace
× Hook State
× Decisive Moment
```

核心机制不参与随机化：

```text
Enter → Enclose → Guide → Reveal
```

因此得到的是：

> **同一种视觉语言，不同的作品。**
> **One visual language, many different works.**

---

## 视觉表现层 / Visual Treatment

在不改变 `Enter → Enclose → Guide → Reveal` 的前提下，生成器现在支持三种可切换的视觉表现档位：

- **自然克制 / Natural restraint**：保持真实曝光、自然层次和克制的色彩关系。
- **反差增强 / Strong contrast**：加强明暗反差、冷暖色温对比与前后景尺度差异，让隐藏窗口从包围中跳出。
- **视觉冲击 / High visual impact**：使用强烈但可信的明暗与色彩对照、夸张近景尺度和明确视觉钩子，形成第一眼冲击与深处发现。

WebUI 默认使用“视觉冲击”，API 可通过 `visual_style` 传入 `natural`、`contrast` 或 `impact`。每次生成还会根据场景主色自动计算饱和度、色相对比和明亮度层次。所有调整只改变光影、色彩、尺度与焦点表达，不改变冻结的 Core Grammar。

### 画面比例 / Aspect Ratio

WebUI 可直接选择 `1:1`、`4:5`、`3:4`、`9:16` 或 `16:9`。API/MCP 使用 `aspect_ratio`，CLI 使用 `--ratio`；默认值为 `9:16`。画面比例只改变输出画幅和构图适配，不改变 `Enter → Enclose → Guide → Reveal` 核心机制。

The WebUI supports `1:1`, `4:5`, `3:4`, `9:16`, and `16:9`. Use `aspect_ratio` in the API/MCP interfaces and `--ratio` in the CLI. The default is `9:16`; the choice changes framing and layout adaptation without changing the frozen core mechanism.

---

## Scene Composer

除了选择预设场景，还可以动态组合不存在于场景库中的新场景。

```bash
node interfaces/cli/index.mjs compose \
  --plant bamboo \
  --location mountain \
  --emotion longing \
  --lang zh
```

例如：

```text
竹 + 山地 + 思念
荷叶 + 湿地 + 安静
蕨类 + 森林 + 神秘
草丛 + 海岸 + 自由
```

Composer 只负责构造 `SceneSpec`，最终仍必须经过被冻结的 Core。

The Composer only builds a `SceneSpec`; automatic selection, random combination, and manual selection all pass through the frozen Core.

---

## AI Agent 调用 / AI Agent Usage

### MCP

```text
hidden_window_list_scenes
hidden_window_generate_prompt
hidden_window_one_click
hidden_window_generate_series
hidden_window_compose_scene
```

Each generation tool accepts `output: "image"`, `"storyboard"`, or `"both"`.
每个生成工具都可以选择 `image`、`storyboard` 或 `both`。

Agent 可以直接理解类似指令：

```text
用竹林生成一张，中文。
Generate a lotus hidden-window prompt in English.
用蕨类 + 森林 + 神秘感生成一张。
同一个荷塘生成 8 张系列提示词。
随机来一张，中英双语。
```

### CLI

```bash
node interfaces/cli/index.mjs scenes

node interfaces/cli/index.mjs generate \
  --scene lotus_pond --output both \
  --lang zh

node interfaces/cli/index.mjs series \
  --scene bamboo_forest \
  --count 8 \
  --lang bilingual

node interfaces/cli/index.mjs one-click \
  --output storyboard \
  --lang en

node interfaces/cli/index.mjs compose \
  --mode random \
  --ratio 9:16
```

### HTTP API

```text
GET  /v1/scenes
POST /v1/prompt       { "scene": "lotus_pond", "output": "both", "seed": 2026 }
POST /v1/one-click    { "output": "storyboard" }
POST /v1/series       { "scene": "lotus_pond", "output": "image" }
POST /v1/compose      { "output": "both", "input": { "plant": "bamboo" } }
```

---

## 快速开始 / Quick Start

```bash
npm install
npm test
npm run web
```

Local WebUI:

```text
http://127.0.0.1:4178
```

MCP:

```bash
npm run mcp
```

---

## 设计原则 / Design Principles

```text
Core small.
Contracts stable.
Content pluggable.
Agents interoperable.
Variation controlled.
Visual grammar frozen.
```

对应中文：

```text
核心最小化
契约稳定化
内容插件化
Agent 共生化
变化受控化
视觉语法冻结
```

新增一个场景，不应该修改 Core。
新增一种植物，不应该修改 Core。
增加一个 AI Agent，不应该修改 Core。
更换图像生成模型，也不应该修改 Core。

Adding a scene, plant, AI agent, or image-generation provider should not require changing Core.

---

## 非目标 / Non-Goals

Nature Window 当前不负责：

- 图像模型账号与密钥管理
- 直接绑定某一家图像生成平台
- 云数据库
- 用户账户系统
- 大型工作流引擎

这些能力应作为外部 Provider 或 Adapter 接入。

These capabilities belong in external providers or adapters.

---

## 一句话 / In One Sentence

> **Nature Window 把“从自然内部发现世界”变成一种 AI 可以调用、组合和持续生成的视觉语言。**

> **Nature Window turns “discovering the world from inside nature” into a visual language that AI can call, compose, and continuously generate.**

---

## License

MIT
