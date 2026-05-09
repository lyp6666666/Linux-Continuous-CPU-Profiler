# Linux Continuous CPU Profiler

这是一个面向生产环境的 Linux 持续 CPU Profiling 工具项目。目标是让 `perf` 像服务黑匣子一样常驻后台，以低开销、可轮转、可追溯的方式保存 CPU 采样现场；当线上在凌晨等无人值守时段发生 CPU 飙升，研发和值班同学可以按时间点回放当时的采样数据，并生成火焰图定位根因。

当前仓库处于需求与设计阶段，已包含：

- [PRD 文档](docs/PRD.md)
- [监控与诊断思路](docs/monitoring-strategy.md)
- [可复用 AI Coding Skill 草案](skills/linux-continuous-cpu-profiling/SKILL.md)
- [AI 对话记录导出说明](ai-conversation/EXPORT_INSTRUCTIONS.md)

## 预期交付物

1. 完整项目代码：采集守护进程、CLI、火焰图生成、配置与打包脚本。
2. README 文档：使用说明、设计说明、生产部署注意事项。
3. 可运行测试：单元测试、集成测试、最小化 Linux/perf 验证脚本与执行结果。
4. AI 完整对话记录导出：用于复盘 AI Coding 决策链路与实现过程。

## 初版技术方向

- 采集层：基于 `perf record` 按时间切片持续采样，支持 system-wide、PID、进程名、cgroup 四类目标。
- 存储层：本地环形保留，按时间索引 profile 文件，支持磁盘配额和 TTL。
- 查询层：按故障时间点选取相邻采样窗口，生成 folded stack 与火焰图。
- 运维层：提供 systemd 服务、健康检查、指标上报、权限检查和降级策略。
- 前端层：React + Vite 构建事故控制台，展示采集 session、健康状态、时间线和火焰图预览。

## 技术栈

- Node.js 20+
- TypeScript
- React 19 + Vite
- Express
- Commander
- Vitest + React Testing Library + Supertest

选择这套栈的原因是 CLI、API、前端和测试可以共用 TypeScript 类型；本地没有 Linux `perf` 权限时，也可以通过 mock mode 先跑通基本产品体验。

## 本地运行

安装依赖：

```bash
npm install
```

生成一组 mock 采样数据：

```bash
npm run seed
```

启动开发模式：

```bash
npm run dev
```

打开 Vite 输出的本地地址，默认是 `http://localhost:5173`。

CLI 示例：

```bash
npm run cli -- doctor
npm run cli -- record --service service-a --mock
npm run cli -- list
```

## 测试

```bash
npm test
npm run build
```

当前测试覆盖：

- session 写入、读取、裁剪
- API 健康检查、session 查询、火焰图输出
- 前端事故控制台首屏渲染

## 仓库状态

本仓库已经初始化为 Git 仓库。后续实现建议按里程碑提交，保证每个阶段都有可运行测试和清晰提交历史。
