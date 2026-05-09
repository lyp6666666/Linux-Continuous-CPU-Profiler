import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { App } from "../src/ui/App.js";

const sessions = [
  {
    id: "demo-1",
    service: "service-a",
    mode: "mock",
    targetType: "cgroup",
    targetValue: "/sys/fs/cgroup/system.slice/service-a.service",
    startTime: "2026-05-09T03:17:00.000Z",
    endTime: "2026-05-09T03:18:00.000Z",
    samples: 1200,
    status: "ok",
    summary: "CPU spike due to batch cleanup.",
    topStacks: [{ name: "service-a::Batch", weight: 92 }],
    foldedPath: "folded.txt",
    flamegraphPath: "flamegraph.svg"
  }
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => {
    const href = String(url);
    if (href.endsWith("/health")) {
      return new Response(JSON.stringify({
        ok: true,
        perfAvailable: false,
        dataDir: "./data",
        sessionCount: 1,
        activeMode: "mock",
        storageBytes: 1024,
        retentionHours: 24,
        message: "演示"
      }), { status: 200 });
    }
    if (href.endsWith("/sessions")) {
      return new Response(JSON.stringify(sessions), { status: 200 });
    }
    if (href.includes("/sessions/query")) {
      return new Response(JSON.stringify({ matched: true, session: sessions[0] }), { status: 200 });
    }
    return new Response("<svg><text>火焰图预览</text></svg>", { status: 200 });
  }) as unknown as typeof fetch);
});

describe("ui", () => {
  it("renders the incident console", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("故障现场控制台")).toBeInTheDocument());
    expect(screen.getAllByText("service-a").length).toBeGreaterThan(0);
    expect(screen.getByText("火焰图预览")).toBeInTheDocument();
    fireEvent.click(screen.getByText("按时间点调出采样"));
    await waitFor(() => expect(screen.getByText("已命中该时间点的采样窗口。")).toBeInTheDocument());
  });
});
