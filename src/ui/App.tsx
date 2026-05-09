import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Flame, HardDriveDownload, ShieldCheck, TerminalSquare, Zap } from "lucide-react";
import type { HealthSnapshot, SessionRecord } from "../types.js";
import { formatBytes, formatCount } from "../lib/format.js";
import { formatTime } from "../lib/time.js";

type FetchState = {
  sessions: SessionRecord[];
  health?: HealthSnapshot;
  selectedId?: string;
  loading: boolean;
  error?: string;
};

const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 320"><rect width="100%" height="100%" fill="#0a0d12"/><text x="40" y="80" fill="#d6dee9" font-size="20" font-family="sans-serif">尚未选择采样记录</text></svg>`;

export function App() {
  const [state, setState] = useState<FetchState>({ sessions: [], loading: true });

  async function load() {
    try {
      const [sessionsRes, healthRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/health")
      ]);
      const sessions = (await sessionsRes.json()) as SessionRecord[];
      const health = (await healthRes.json()) as HealthSnapshot;
      setState({
        sessions,
        health,
        selectedId: sessions[0]?.id,
        loading: false
      });
    } catch (error) {
      setState({
        sessions: [],
        loading: false,
        error: error instanceof Error ? error.message : "failed to load"
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = useMemo(
    () => state.sessions.find((item) => item.id === state.selectedId) ?? state.sessions[0],
    [state.sessions, state.selectedId]
  );

  const flamegraph = selected ? `/api/sessions/${selected.id}/flamegraph` : undefined;

  return (
    <div className="shell">
      <aside className="rail rail-left">
        <div className="brand">
          <div className="brand-mark">采样</div>
          <div>
            <div className="eyebrow">持续 CPU 采样</div>
            <h1>故障现场控制台</h1>
          </div>
        </div>

        <section className="panel">
          <div className="panel-title">
            <ShieldCheck size={16} />
            健康状态
          </div>
          <div className="metric-grid">
            <Metric label="采样记录" value={state.health ? formatCount(state.health.sessionCount) : "—"} />
            <Metric label="存储占用" value={state.health ? formatBytes(state.health.storageBytes) : "—"} />
            <Metric label="运行模式" value={state.health ? formatMode(state.health.activeMode) : "—"} />
            <Metric label="采样引擎状态" value={state.health?.perfAvailable ? "可用" : "演示"} />
          </div>
          <p className="panel-note">{state.health?.message ?? "正在加载健康快照..."}</p>
        </section>

        <section className="panel list-panel">
          <div className="panel-title">
            <Clock3 size={16} />
            采样记录
          </div>
          <div className="capture-list">
            {state.loading && <div className="empty-state">正在加载采样记录...</div>}
            {state.sessions.map((session) => (
              <button
                key={session.id}
                className={`capture-item ${selected?.id === session.id ? "active" : ""}`}
                onClick={() => setState((prev) => ({ ...prev, selectedId: session.id }))}
              >
                <div className="capture-meta">
                  <span className="capture-service">{session.service}</span>
                  <span className={`badge ${session.status}`}>{formatStatus(session.status)}</span>
                </div>
                <div className="capture-summary">{session.summary}</div>
                <div className="capture-time">{formatTime(session.startTime)}</div>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="topbar panel">
          <div>
            <div className="eyebrow">当前窗口</div>
            <div className="headline">
              {selected ? `${selected.service} · ${formatTargetType(selected.targetType)}` : "尚未选择采样记录"}
            </div>
          </div>
          <div className="topbar-actions">
            <ActionButton icon={<Activity size={16} />} label="刷新" onClick={() => void load()} />
            <ActionButton icon={<Flame size={16} />} label="火焰图" />
            <ActionButton icon={<HardDriveDownload size={16} />} label="导出" />
          </div>
        </header>

        <section className="timeline panel">
          <div className="panel-title">
            <Zap size={16} />
            故障时间线
          </div>
          <div className="timeline-strip">
            {state.sessions.map((session) => (
              <button
                key={session.id}
                className={`timeline-item ${selected?.id === session.id ? "active" : ""}`}
                onClick={() => setState((prev) => ({ ...prev, selectedId: session.id }))}
              >
                <div className="timeline-dot" />
                <span>{formatTime(session.startTime)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <article className="panel flame-panel">
            <div className="panel-title">
              <Flame size={16} />
              火焰图预览
            </div>
            {selected ? (
              <img
                alt="火焰图"
                src={flamegraph}
                className="flame-iframe"
              />
            ) : (
              <div className="flame-frame" dangerouslySetInnerHTML={{ __html: fallbackSvg }} />
            )}
          </article>

          <aside className="panel detail-panel">
            <div className="panel-title">
              <TerminalSquare size={16} />
              采样详情
            </div>

            {selected ? (
              <>
                <DetailRow label="服务" value={selected.service} />
                <DetailRow label="目标" value={`${formatTargetType(selected.targetType)}:${selected.targetValue}`} />
                <DetailRow label="时间窗口" value={`${formatTime(selected.startTime)} → ${formatTime(selected.endTime)}`} />
                <DetailRow label="样本数" value={formatCount(selected.samples)} />
                <DetailRow label="模式" value={formatMode(selected.mode)} />
                <div className="summary-box">
                  <div className="summary-title">值班备注</div>
                  <p>{selected.summary}</p>
                  {selected.notes?.map((note) => <p key={note}>• {note}</p>)}
                </div>
                <div className="stack-list">
                  {selected.topStacks.map((stack) => (
                    <div key={stack.name} className="stack-row">
                      <span>{stack.name}</span>
                      <strong>{stack.weight}%</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">尚未选择采样记录。</div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button className="action-button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function formatMode(mode: string): string {
  return mode === "perf" ? "真实采样" : "演示模式";
}

function formatStatus(status: string): string {
  if (status === "ok") return "正常";
  if (status === "running") return "采集中";
  return "异常";
}

function formatTargetType(type: string): string {
  const labels: Record<string, string> = {
    system: "整机",
    pid: "进程号",
    process: "进程名",
    cgroup: "控制组"
  };
  return labels[type] ?? type;
}
