# UI 设计指南

> **设计类型**: App 设计（应用架构设计）
> **确认检查**: 本指南适用于可交互的应用/网站/工具。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解

- **目标用户**: 运营/市场人员，专业批量网红 outreach 工作流，用户需要在一个会话内完成从扫描到发送的全流程，对效率和可靠性要求高
- **核心目的**: 提供「URL 扫描 → 人工审核 → 飞书授权 → 模板配置 → 批量发送 → 日志查询」完整工作流，清晰展示任务状态，支持人工介入修正数据
- **期望情绪**: 专业可靠、掌控感、状态透明
- **需避免的感受**: 混乱、信息过载、状态不明确、操作反馈缺失

### 1.2 设计语言

- **Aesthetic Direction**: 数据密集型后台工具，功能优先，通过清晰的网格布局和状态标签建立有序感，让用户专注于数据处理
- **Visual Signature**: 深蓝专业主色、紧凑网格表格、语义化状态标签、实时进度反馈、清晰错误日志展示
- **Emotional Tone**: 专业可控 — 即使出现限流或子页失败，也能通过透明状态展示让用户放心
- **Design Style**: Grid 网格 — 数据表格为主的后台系统，网格线分割数据结构清晰，锐利设计提升专业感，紧凑布局提高信息密度
- **Application Type**: Admin (网红 outreach 数据处理后台)

## 2. Design Principles (设计理念)

1. **状态透明化**: 扫描进度、速率限制重试、子页访问失败都需要清晰展示，不隐藏异常状态
2. **功能优先**: 所有视觉元素服务于数据展示和操作效率，不添加无用装饰元素
3. **语义清晰**: 使用色彩和标签明确区分不同任务状态（成功/部分完成/失败），减少用户认知负担
4. **操作可追溯**: 所有发送操作留下完整日志，支持筛选和重发，确保可追溯性

## 3. Color System (色彩系统)

**配色设计理由**: B2B 工具类后台需要建立专业信任感，选择沉稳的靛蓝作为主色，低饱和度保证长时间操作不疲劳，语义色清晰区分各类状态。

### 3.1 主题颜色

| 角色               | CSS 变量               | Tailwind Class            | HSL 值    
| ------------------ | ---------------------- | ------------------------- | ---------- 
| bg                 | `--background`         | `bg-background`           | `hsl(220 20% 97%)`
| card               | `--card`               | `bg-card`                 | `hsl(0 0% 100%)`
| text               | `--foreground`         | `text-foreground`         | `hsl(222 47% 11%)`                   
| textMuted          | `--muted-foreground`   | `text-muted-foreground`   | `hsl(220 9% 46%)`                      
| primary            | `--primary`            | `bg-primary`              | `hsl(224 76% 48%)` 
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | `hsl(0 0% 100%)`
| accent             | `--accent`             | `bg-accent`               | `hsl(220 20% 94%)` 
| accent-foreground  | `--accent-foreground`  | `text-accent-foreground`  | `hsl(222 47% 11%)`
| border             | `--border`             | `border-border`           | `hsl(220 13% 86%)`

### 3.2 Sidebar 颜色（仅当使用 Sidebar 导航时定义）

| 角色                       | CSS 变量                       | Tailwind Class                    | HSL 值     | 设计说明                         |
| -------------------------- | ------------------------------ | --------------------------------- | ---------- | -------------------------------- |
| sidebar                    | `--sidebar`                    | `bg-sidebar`                      | `hsl(222 47% 11%)` | Sidebar 背景色，深底导航营造专业感 |
| sidebar-foreground         | `--sidebar-foreground`         | `text-sidebar-foreground`         | `hsl(220 13% 80%)` | Sidebar 文字色，对比度充足        |
| sidebar-primary            | `--sidebar-primary`            | `bg-sidebar-primary`              | `hsl(224 76% 48%)` | 激活态背景色                     |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | `hsl(0 0% 100%)` | 激活态文字色，对比度 ≥ 4.5:1     |
| sidebar-accent             | `--sidebar-accent`             | `bg-sidebar-accent`               | `hsl(222 35% 18%)` | Hover 态背景，提供交互反馈       |
| sidebar-accent-foreground  | `--sidebar-accent-foreground`  | `text-sidebar-accent-foreground`  | `hsl(220 13% 80%)` | Hover 态文字                     |
| sidebar-border             | `--sidebar-border`             | `border-sidebar-border`           | `hsl(222 30% 25%)` | Sidebar 边框，维持整体风格       |
| sidebar-ring               | `--sidebar-ring`               | `ring-sidebar-ring`               | `hsl(224 76% 48%)` | 聚焦环颜色                       |

### 3.4 语义颜色（可选）

| 用途        | CSS 变量          | HSL 值             | 使用说明                     |
| ----------- | ----------------- | ------------------ | ---------------------------- |
| success     | `--success`       | `hsl(142 72% 29%)` | 成功状态、已验证、发送成功   |
| success-foreground | `--success-foreground` | `hsl(0 0% 100%)` | 成功状态文字 |
| warning      | `--warning`       | `hsl(32 95% 44%)`  | 警告、重试中、部分扫描完成   |
| warning-foreground | `--warning-foreground` | `hsl(222 47% 11%)` | 警告状态文字 |
| error       | `--error`         | `hsl(0 74% 42%)`   | 错误、失败、子页访问失败     |
| error-foreground | `--error-foreground` | `hsl(0 0% 100%)` | 错误状态文字 |

## 4. Typography (字体排版)

- **Heading**: Inter + 系统无衬线回退
- **Body**: Inter + 系统无衬线回退
- **Numeric/Data**: Inter 开放版本默认包含等宽数字特性
- **字体导入**: 
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

**排版层级规范**:
- 页面标题: `text-2xl font-bold leading-tight tracking-tight`
- 区块标题: `text-lg font-semibold`
- 表格表头: `text-sm font-semibold`
- 正文/表格内容: `text-base font-normal`
- 辅助文字/状态描述: `text-sm text-muted-foreground`
- 状态标签: `text-xs font-medium`
- 数字/百分比: `tabular-nums` 保证等宽对齐

## 5. Layout Strategy (布局策略)

### 5.1 结构方向

**导航策略**：共有 6 个功能页面（扫描任务/数据审核/授权配置/邮件模板/邮件发送/发送日志），功能模块较多需要持久导航 → 采用侧边栏布局

**页面架构特征**：数据密集型后台，多个页面以数据表格展示为主，需要紧凑布局和高信息密度，侧边栏固定，内容区独立滚动

### 5.2 响应式原则

**断点策略**：移动端（<1024px）折叠侧边栏为汉堡抽屉菜单，桌面端（≥1024px）显示完整侧边栏

**内容密度**：
- 移动端单列展示，表格允许横向滚动，增大可点击区域满足触摸操作
- 桌面端全宽展示表格最大化信息密度
- 表单区域限制最大宽度 `max-w-2xl` 保证可读性

**全局容器约束**:
- 主内容区: `max-w-[1600px] mx-auto`
- 页面内边距: `p-4 md:p-6 lg:p-8`
- 区块间距: `space-y-6`

## 6. Visual Language (视觉语言)

**形态特征**：
- Grid 网格风格 — 锐利直角 `rounded-sm`，细边框 `border` 分隔单元格，无额外阴影装饰
- 紧凑间距系统 — 表格单元格 `px-4 py-3`，区块间距保持一致，提升信息密度
- 数据对齐规则 — 数字类型（粉丝数、互动率）右对齐，文本类型左对齐，百分比使用 `tabular-nums` 保证对齐

**装饰策略**：极简工具设计，不使用任何装饰元素，所有屏幕空间用于数据展示和操作，仅通过网格线和色彩对比建立视觉层次

**状态标签策略**：使用胶囊形状小标签展示各类状态，背景使用语义色低透明度，文字使用对应语义色确保对比度：

| 状态类型 | 样式策略 |
| -------- | -------- |
| 已完成/已验证/发送成功 | `bg-success/10 text-success px-2 py-1 rounded-full` |
| 进行中/重试中/部分扫描完成 | `bg-warning/10 text-warning px-2 py-1 rounded-full` |
| 失败/未验证/访问失败 | `bg-error/10 text-error px-2 py-1 rounded-full` |

**表格设计规范**:
- 表头统一使用 `bg-accent` 背景区分内容区
- 表格行使用 `border-b border-border` 分隔
- 斑马纹效果：偶数行 `bg-card`，奇数行 `bg-background` 提升大表格可读性
- 可点击行添加 hover 状态 `hover:bg-accent/50 transition-colors`
- `Contact_Link_Fallback` 链接使用 `text-primary underline cursor-pointer` 突出可点击性
- `Engagement Rate` 百分比右对齐展示，保持数字一致性

**进度展示规范**:
- 扫描/发送进度使用实色填充进度条，填充色 `bg-primary`，背景 `bg-accent`
- 进度条右侧实时展示 `已完成 / 总数` 计数和百分比
- 速率限制重试状态使用黄色警告标签展示在状态区
- 子页访问失败记录使用红色错误标签列出失败 URL

**输入区域规范**:
- URL 列表文本域使用 `font-mono text-sm` 方便查看每行一个 URL
- 拖拽上传区域使用虚线边框 `border-2 border-dashed border-border`，hover 状态 `border-primary/50 bg-accent/50`
- 富文本编辑器区域保留默认边框，预览区域使用 `bg-card border rounded-sm` 展示最终效果

**动效原则**：快速响应，所有交互反馈时长控制在 150-200ms，进度条平滑动画，表格行 hover 颜色过渡，营造干脆利落的专业体验

**可及性保障**:
- 所有正文文字对比度 ≥ 4.5:1，符合 WCAG AA 标准
- 语义状态色保持足够对比度，即使色盲用户也能通过文字标签识别状态
- 所有交互元素（按钮、表格行、菜单项）都有明确的 hover/focus 反馈
- 可点击链接具有下划线样式，视觉上明确可识别
- 表单错误状态使用红色边框 + 错误文字提示，双重语义反馈