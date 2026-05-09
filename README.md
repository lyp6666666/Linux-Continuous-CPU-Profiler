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

## 仓库状态

本仓库已经初始化为 Git 仓库。后续实现建议按里程碑提交，保证每个阶段都有可运行测试和清晰提交历史。
