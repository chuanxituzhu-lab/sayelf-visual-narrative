# sayelf-healing-visual-metaphor v0.2

中文名：**一瞬治愈｜Healing Visual Metaphor**

这是一个纯 Markdown Codex Skill：把一句人生感悟、情绪或短故事，转换为一个无需解释即可成立的视觉隐喻，并同时交付：

- 一张冻结决定性瞬间的 `Hero Image` 生成提示词；
- 一套解释该瞬间如何发生的五镜头视频分镜与视频提示词。

## 核心语法

```text
CORE → FEEL → WOUND → AVATAR → WORLD → METAPHOR
      → TENSION → TURN → MOMENT → AFTERGLOW → SILENCE
```

第一性原则：**治愈不是世界突然变好了，而是人物与世界的关系发生了一点改变。**

## v0.2 冻结范围

- 一个核心情绪、一个主隐喻、一个关系、一次微小改变、一个未完成瞬间；
- 五个功能镜头：`WORLD / WOUND / TENSION / TURN / AFTERGLOW`；
- 两个固定账号角色槽位：`NEON-LINE-01` 霓虹线条人、`INK-PERSON-02` 手绘小人物；每个包只能选择一个；
- `ACCOUNT CHARACTER LOCK`、`CONTINUITY LOCK`、`MOTION BUDGET`、`EMOTIONAL PEAK LOCK`、`NO PREACHING`；
- 不绑定图像模型、视频模型、API、渲染器、发布平台或 WebUI。

## 使用

直接以自然语言输入一句话、一个情绪、一个人生感悟或一个小故事。也可以附带本地参考图。Skill 会按 `SKILL.md` 的固定 Contract 返回完整双输出包。

推荐输入：

```text
一瞬治愈：有时候真正的快乐，不是等雨停，而是学会在雨里玩。
```

## 目录

```text
SKILL.md                 入口、路由、输出 Contract 与总质量门
core/                    语义链、隐喻关系、决定性瞬间、双输出 Contract
styles/                  三种视觉风格骨架与双角色账号系统
rules/                   构图与五条冻结硬约束
workflows/               文字、参考图、视频三种工作流
examples/                雨中接纳、悬崖希望两例回归案例
scripts/                 零第三方依赖的本地结构与 Contract 验证器
```

## 最小验证

使用 `examples/rain-acceptance.md` 或 `examples/cliff-hope.md` 对照检查：是否只选择一个账号角色、是否只有一个情绪峰值、每个镜头是否只有一个主运动、连续性锁是否完整、去掉文字后是否仍能读懂关系变化。

维护者可运行：

```text
python scripts/validate.py
```

该检查器只使用 Python 标准库，不需要 `PyYAML`，也不会在 Skill 安装时自动下载或修改环境。`PyYAML` 只属于某些外部维护工具的可选验证依赖，不属于本 Skill 的运行时依赖。
