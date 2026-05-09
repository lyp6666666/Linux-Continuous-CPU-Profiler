# PRD：Linux 持续 CPU Profiling 工具

## 1. 文档信息

- 项目名称：Linux Continuous CPU Profiler
- 当前阶段：需求与技术方案设计
- 目标用户：高并发在线服务研发、SRE、值班工程师、性能优化工程师
- 主要场景：线上 CPU 短时飙升后，按故障时间点回溯 CPU 采样现场并生成火焰图

## 2. 背景

团队线上服务近期多次在凌晨 3 点出现 CPU 飙升。值班同学介入时，故障已经恢复，现场采样工具只能看到恢复后的普通调用栈。复盘过程中缺少关键证据，只能围绕“可能是删表、GC、锁竞争、批任务”等假设讨论。

现有监控能回答 CPU 使用率何时升高，但无法回答当时 CPU 具体消耗在哪些函数、线程、运行时或内核路径上。需要一个常驻后台、低开销、可回溯的持续 CPU Profiling 工具，将调用栈采样作为事故现场证据保留下来。

## 3. 问题定义

### 3.1 当前痛点

- 故障现场短暂，人工登录机器后已经错过采样窗口。
- `perf top` 面向实时观察，不适合回溯历史。
- 传统日志和指标缺少函数级 CPU 消耗证据。
- 不同语言、容器、systemd 部署方式下，临时采样步骤不统一。
- 事故复盘依赖经验猜测，定位慢且容易误判。

### 3.2 需要解决的问题

- 如何 7x24 持续采集 CPU 调用栈且不明显影响线上服务。
- 如何按时间点快速找到相关 profile 数据。
- 如何把原始采样数据转成研发可读的火焰图。
- 如何控制磁盘、CPU、权限、安全和故障恢复风险。
- 如何将该工具沉淀成可复用的 AI Coding Skill，便于后续在类似题目或项目中快速复现。

## 4. 目标

### 4.1 产品目标

- 支持 Linux 生产环境持续 CPU Profiling。
- 支持按故障时间点生成火焰图。
- 支持长期后台运行、自动轮转、自动清理。
- 提供简单 CLI，降低值班同学使用门槛。
- 提供测试、文档和可复用 Skill。

### 4.2 非目标

- 不替代 APM、日志系统或指标系统。
- 不在第一版实现完整 Web UI。
- 不在第一版实现跨机器集中式 profile 查询。
- 不在第一版做全语言运行时的深度专用优化，但保留扩展点。

## 5. 用户画像

### 值班工程师

需要在事故后输入一个时间点，快速拿到火焰图和基本结论，不希望记忆复杂 `perf` 命令。

### 服务研发

需要确认 CPU 高涨是否来自业务函数、GC、锁竞争、序列化、正则、压缩、加密或第三方库。

### SRE/平台工程师

关注工具是否安全可控，能否通过 systemd 部署，能否限制资源使用，是否有健康检查和统一配置。

### 性能优化工程师

需要拿到原始 `perf.data`、folded stack 和火焰图，支持进一步离线分析。

## 6. 核心使用场景

### 场景 A：事故后按时间回溯

1. 监控显示 `service-a` 在 `2026-05-09 03:17:42 +0800` CPU 飙升。
2. 值班同学执行：

```bash
profiler flamegraph --target service-a --at "2026-05-09 03:17:42 +0800" --range 5m
```

3. 工具自动找到前后 5 分钟 profile 文件，生成 SVG。
4. 研发打开火焰图，看到 CPU 主要消耗在某个批量清理函数或 GC 路径。

### 场景 B：持续采集指定容器

1. SRE 在节点上配置 cgroup 采集目标。
2. profiler 作为 systemd 服务常驻。
3. 每分钟生成一个 profile 切片，保留最近 24 小时。
4. 磁盘超过配额时自动删除最旧切片。

### 场景 C：采集失败自恢复

1. 内核升级后 `perf` 参数不兼容，采集子进程退出。
2. profiler 记录错误并退避重启。
3. 连续失败后暴露健康检查失败，触发运维告警。

## 7. 功能需求

### 7.1 配置管理

- 支持 YAML/TOML 配置文件。
- 支持采样频率、采样窗口、保留时间、磁盘配额、输出目录。
- 支持 system-wide、PID、进程名、cgroup 四种目标。
- 支持 frame pointer 与 DWARF 栈展开模式。
- 支持命令行参数覆盖配置文件。

### 7.2 持续采集

- 后台循环执行 `perf record`，按固定时间窗口输出 `perf.data`。
- 每个切片完成后写入索引文件，包含开始时间、结束时间、目标、采样参数、文件路径、大小、退出状态。
- 采集进程异常退出时自动重试。
- 支持优雅停止，避免留下半截文件误用于分析。

### 7.3 数据轮转

- 按 TTL 删除过期 profile。
- 按磁盘配额删除最旧 profile。
- 清理时同步更新索引。
- 避免删除正在写入的当前切片。

### 7.4 查询与火焰图

- 支持按时间点查询匹配 profile。
- 支持按时间范围合并多个切片。
- 支持生成 folded stack。
- 支持生成 SVG 火焰图。
- 输出采样窗口、样本数、涉及文件、生成耗时和结果路径。

### 7.5 健康检查与自监控

- 提供 `profiler status` 查看采集状态。
- 提供最近成功切片时间、最近错误、磁盘占用、profile 数量。
- 可选暴露 Prometheus 文本指标。
- 配套 systemd service 文件。

### 7.6 诊断辅助

- 提供 `profiler doctor` 检查：
  - `perf` 是否存在。
  - 当前用户是否有权限采样。
  - `kernel.perf_event_paranoid` 是否满足要求。
  - 输出目录是否可写。
  - FlameGraph 依赖是否可用。
  - 当前内核是否支持所需事件。

### 7.7 可复用 Skill

- 在仓库内提供 `skills/linux-continuous-cpu-profiling/SKILL.md`。
- Skill 需要描述 AI Coding 实现此类工具时的推荐步骤、验收标准、测试策略和生产注意事项。
- Skill 能被后续题目复用，而不是只服务当前仓库。

## 8. 非功能需求

### 8.1 性能与开销

- 默认采样频率不超过 99Hz。
- profiler 自身 CPU 开销目标低于单核 1%。
- profile 数据写入采用切片文件，避免长期单文件膨胀。
- 大文件解析只在用户查询时执行，不影响采集主循环。

### 8.2 稳定性

- 采集失败不能影响业务进程。
- 磁盘满、权限不足、perf 退出等情况必须有明确错误。
- 采集循环需要退避策略，避免失败时疯狂重启。

### 8.3 安全

- 默认只写入本地指定目录。
- 不自动上传 profile。
- README 中明确 profile 可能包含函数名、路径、符号等敏感信息。
- systemd 部署应尽量最小权限，必要 capability 明确写出。

### 8.4 可移植性

- 支持主流 Linux x86_64。
- 优先兼容常见发行版：Ubuntu、Debian、CentOS/RHEL、Alibaba Cloud Linux。
- macOS 不作为运行目标，但本地开发可通过 mock 测试核心逻辑。

### 8.5 可观测性

- 所有采集切片、清理、查询、生成失败都要有结构化日志。
- 支持 debug 模式打印底层 `perf` 命令。

## 9. CLI 草案

```bash
# 权限和依赖检查
profiler doctor

# 启动前台采集，便于调试
profiler record --config profiler.yaml

# 查询采集状态
profiler status --data-dir /var/lib/cpu-profiler

# 按时间点生成火焰图
profiler flamegraph \
  --target service-a \
  --at "2026-05-09 03:17:42 +0800" \
  --range 5m \
  --output ./out

# 列出某个时间段的 profile
profiler list --from "2026-05-09 03:00:00 +0800" --to "2026-05-09 04:00:00 +0800"
```

## 10. 配置草案

```yaml
target:
  type: cgroup
  value: /sys/fs/cgroup/system.slice/service-a.service

record:
  frequency_hz: 49
  window_seconds: 60
  unwind: fp
  event: cpu-clock

storage:
  data_dir: /var/lib/cpu-profiler
  retention_hours: 24
  max_bytes: 21474836480

flamegraph:
  flamegraph_pl: /opt/FlameGraph/flamegraph.pl

health:
  metrics_textfile: /var/lib/node_exporter/textfile_collector/cpu_profiler.prom
```

## 11. 推荐架构

```text
+------------------+        +--------------------+
| systemd service  | -----> | profiler daemon    |
+------------------+        +--------------------+
                                  |
                                  v
                         +----------------+
                         | perf record    |
                         +----------------+
                                  |
                                  v
+------------------+     +--------------------+      +------------------+
| index.jsonl      | <-- | profile slices     | ---> | perf script      |
+------------------+     +--------------------+      +------------------+
                                                            |
                                                            v
                                                    +---------------+
                                                    | FlameGraph SVG |
                                                    +---------------+
```

核心模块建议：

- `cmd/profiler`：CLI 入口。
- `internal/config`：配置解析与校验。
- `internal/recorder`：采集循环和 perf 子进程管理。
- `internal/storage`：索引、轮转、TTL、磁盘配额。
- `internal/flamegraph`：perf script、folded stack、SVG 生成。
- `internal/doctor`：环境与权限检查。
- `internal/health`：状态与指标。

## 12. 数据模型

索引文件建议使用 JSON Lines，便于追加写入和人工排查：

```json
{"target":"service-a","start":"2026-05-09T03:17:00+08:00","end":"2026-05-09T03:18:00+08:00","file":"2026/05/09/03/cpu-profiler-20260509T031700+0800.perf.data","frequency_hz":49,"unwind":"fp","size_bytes":7340032,"status":"ok"}
```

## 13. 测试要求

### 单元测试

- 配置解析与默认值。
- 时间范围匹配 profile 切片。
- TTL 与磁盘配额清理逻辑。
- perf 命令构造。
- 异常退出与退避策略。

### 集成测试

- 使用 fake `perf` 脚本模拟采集输出和失败。
- 使用小型样例 folded stack 生成火焰图。
- 验证 CLI 参数到模块调用链路。

### Linux 环境验证

- `profiler doctor` 在具备 perf 的 Linux 上通过。
- 启动 2 到 3 个采样窗口。
- 生成至少一个 SVG 火焰图。
- README 记录执行命令和结果。

## 14. 验收标准

- 可以在 Linux 上以前台模式连续采集至少 3 个窗口。
- 可以按时间点查询到对应 profile 文件。
- 可以生成火焰图 SVG。
- 可以限制保留时间和磁盘占用。
- `profiler doctor` 能给出明确可执行的环境修复建议。
- 测试可运行，且 README 中包含测试执行结果。
- 仓库有清晰提交历史，至少包含需求设计、核心实现、测试文档三个阶段。
- 提供可复用 Skill，说明后续 AI 如何复刻该工具。

## 15. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| perf 权限不足 | 无法采集 | `doctor` 预检并给出 sysctl/capability 建议 |
| 栈不完整 | 火焰图不可读 | 文档说明 frame pointer、DWARF、语言运行时配置 |
| 磁盘占满 | 影响业务机器 | TTL + max bytes 双重轮转 |
| 采样开销过高 | 影响线上服务 | 默认低频，支持配置降频和暂停 |
| 容器 PID 变化 | 采集目标丢失 | 推荐 cgroup 目标，进程名模式定期解析 |
| profile 含敏感符号 | 数据泄露 | 默认本地保存，明确权限和脱敏注意事项 |

## 16. 里程碑

### M1：需求与仓库骨架

- README、PRD、监控思路、Skill 草案。
- Git 仓库初始化与初始提交。

### M2：最小可用采集链路

- CLI、配置解析、fake perf 测试。
- 前台持续采集与索引写入。

### M3：查询与火焰图

- 按时间点选择 profile。
- perf script 与 FlameGraph 集成。
- 生成 SVG。

### M4：生产化

- systemd service。
- doctor、status、健康指标。
- TTL、磁盘配额、退避重启。

### M5：交付闭环

- Linux 实测结果。
- README 使用说明完善。
- AI 对话记录导出。
- 最终提交历史整理。
