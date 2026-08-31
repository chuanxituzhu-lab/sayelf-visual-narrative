# sayelf-visual-narrative

![Sayelf Visual Narrative](assets/readme-hero.png)

> **好画面不是生成出来的，是决定出来的。**

Sayelf Visual Narrative 是一个模型无关、可独立运行也可被其他 AI 辅助平台共用的视觉导演底座。产品定义是：

> **一句话 → 自动选择视觉叙事 Skill → 同源图片关键帧 + 视频分镜。**

## Dual Output Contract v1.0

每个视觉叙事 Skill 返回一个统一对象：

- `narrative_core`：主题、情绪、世界、生命主体、关系、决定性瞬间和余韵的唯一来源；
- `image_prompt`：最值得停下来的图片关键帧；
- `video_storyboard`：进入并离开这个关键帧的连续视频分镜。

两个输出必须携带同一个 `narrative_core_id`。本地运行时还会校验 manifest、JSON Schema、镜头顺序和总时长。

故事模式会根据故事复杂度、视频时长和所选自媒体策略动态规划镜头数量（当前为 2–6 个），而不是固定三镜头。场景默认按空间序列自动安排：旷野、室内、舞台等不同空间可以自然切换；只有同一地点才继承地点和空间规则。也支持锁定当前地点，或从候选池和 seed 中随机选择一个地点。人物/拟人化人物的身份、外观、服装、体态、视线和手部方向会作为连续性锚点，动作从上一镜头自然接续。平台策略是可调的启发式模板，不承诺平台算法结果。

WebUI 支持全域中文 / English 切换（包括字段、占位提示、下拉选项、状态、按钮和输出标签）。图片平台可选择小红书、Facebook、Instagram、Pinterest 或通用图片；视频平台可选择小红书、YouTube Shorts、Instagram Reels、TikTok、抖音、B站、视频号、Facebook Reels、快手或通用短视频。故事模式会为每个镜头生成可单独复制的图片 Prompt，并把完整视频分镜单独列出。平台选择只驱动本地规划模板与提示词组织，不代表对平台算法的预测或自动发布。

## 一致性底座与一键优化

`consistency_state` 是产品、人物（含拟人化人物）、风格 DNA、世界环境、空间策略、动作/表演、摄影机空间轴和叙事关系的共享状态。产品与人物属于强锁定锚点，会贯穿所有图片 Prompt 和视频分镜；世界环境、场景、单镜头构图与动作推进属于可变化层。空间策略为 `auto` 时，同地继承空间规则、异地生成切换；`same_place` 强制同地检查；`free` 明确放开空间连续性。因此后续 Skill 不需要重复造一致性轮子，也不会把所有背景误锁成同一个地方。

WebUI 的“一键优化”只整理客户输入的创意，不直接生成媒体，也不覆盖原文：它在本地保留“客户原始创意”，生成“导演版创意”，用户确认后才回填。没有 API Key 也可使用；若接入 AI 辅助平台，可把导演版继续交给平台审阅或改写。

## Core 与插件边界

Core 只保留“好画面不是生成出来的，是决定出来的”这条导演链：解释意图、三道 Gate、连续性、统一双输出合同、插件路由和状态校验。视觉领域智能属于 Visual Skill；构图、材质、镜头、情绪节奏和提示词内容不写进 Core。

### Visual Skill 插件

将外部 Skill 放入 `plugins/visual-skills/<id>/manifest.json` 和 `plugin.mjs`，启动时自动发现。也可以在 `skills/registry.json` 中通过 `preferred_skill_id` 明确指定。插件只需返回 `dual-output/1.0`，Core 会验证同源 `narrative_core`、三道 Gate 之前的路由结果、镜头顺序与总时长。

### Media Provider 插件

将文生图、图生视频、文生视频接入放入 `plugins/media-providers/<id>/`，manifest 遵循 `schemas/media-provider-manifest.schema.json`，模块导出 `createProvider()`。Provider 只负责把统一请求映射到自己的 API；Core 负责任务状态、本地资产、预览地址和单独下载地址。

统一生命周期为 `submitted → processing → completed/failed`。没有可用 Provider 时返回 `awaiting_assistant`，把图片 Prompt 或视频分镜 Prompt 交给已启用的 AI 辅助平台；不会伪造生成结果。

## 已注册 Skill

- `life-comes-closer` / `自然靠近你`：人与自然安静相遇。
- `visual-storytelling` / `视觉叙事`：高纯度、低刺激、留白的视觉叙事。

新增视觉风格只需新增 manifest 和插件，不需要修改 Core。当前仓库里的两个 Skill 仍作为兼容示例保留。

## AI 辅助平台插件

`plugins/*/plugin.json` 可注册一个 AI 辅助平台，支持 `cli`、`mcp` 和 `api` 三种传输。每个插件可以声明多个能力，例如 `assist`、`review`、`refine` 或 `tools`；WebUI 会在平台接入后让用户选择具体能力。

API 插件的 URL、启用状态和环境变量名可以由本机 `config/harnesses.json` 覆盖。API Key 只从服务端环境变量读取并注入请求头，不进入浏览器、插件清单或日志。配置完成后，在 WebUI 的“辅助平台协作”中选择平台、能力并发送任务。

## 本地运行

```bash
npm test
npm run test:dual-output
```

运行时默认不依赖网络，不包含 API key，也不会上传输入或输出。只有用户在本机配置并选择 Provider 后，才会按该 Provider 的契约发送最小必要内容。

本地版本不包含 Marketplace、账号体系、自动发现第三方 API 或凭据托管。当前没有接入 API 时，WebUI 会走 AI 辅助回退；接入 Provider 后才会请求媒体服务并在本地保存预览/下载资产。
