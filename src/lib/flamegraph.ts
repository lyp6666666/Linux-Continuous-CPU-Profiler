import type { SessionRecord } from "../types.js";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildFlamegraphSvg(session: SessionRecord): string {
  const stacks = session.topStacks.slice(0, 5);
  const width = 1200;
  const height = 520;
  const left = 34;
  const usable = width - left * 2;
  const frameHeight = 32;
  const gap = 4;
  const baseY = 426;
  const maxWeight = Math.max(...stacks.map((b) => b.weight), 1);
  const colors = ["#f59e0b", "#fbbf24", "#fb7185", "#22d3ee", "#38bdf8", "#a3e635"];

  const levels = stacks.flatMap((stack, index) => {
    const stackWidth = Math.max(160, Math.round((stack.weight / maxWeight) * usable));
    const offset = Math.round((index / Math.max(stacks.length, 1)) * usable * 0.72);
    const x = left + Math.min(offset, usable - stackWidth);
    const parts = stack.name.split("::");
    return parts.map((part, level) => ({
      label: level === parts.length - 1 ? stack.name : part,
      x: x + level * 18,
      y: baseY - level * (frameHeight + gap) - index * 7,
      width: Math.max(120, stackWidth - level * 54),
      color: colors[(index + level) % colors.length],
      opacity: 0.95 - level * 0.04
    }));
  });

  const grid = Array.from({ length: 9 }, (_, index) => {
    const y = 112 + index * 36;
    return `<line x1="${left}" y1="${y}" x2="${width - left}" y2="${y}" stroke="#1d2735" stroke-width="1" opacity="0.8" />`;
  }).join("\n");

  const rects = levels
    .map((frame) => `
      <g>
        <rect x="${frame.x}" y="${frame.y}" rx="3" ry="3" width="${frame.width}" height="${frameHeight}" fill="${frame.color}" opacity="${frame.opacity}" stroke="#0b111b" stroke-width="1" />
        <text x="${frame.x + 9}" y="${frame.y + 21}" fill="#06111f" font-size="12" font-family="IBM Plex Mono, monospace" font-weight="700">${escapeXml(frame.label)}</text>
      </g>`)
    .join("\n");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="火焰图预览">
    <rect width="100%" height="100%" fill="#0a0d12"/>
    <rect x="0" y="0" width="100%" height="82" fill="#10151d"/>
    <rect x="${left}" y="104" width="${usable}" height="360" fill="#0d121a" stroke="#243044" rx="6"/>
    <text x="34" y="30" fill="#f5d08a" font-size="18" font-family="IBM Plex Sans, sans-serif" font-weight="700">火焰图预览</text>
    <text x="34" y="57" fill="#9db0c8" font-size="12" font-family="IBM Plex Sans, sans-serif">${escapeXml(session.service)} · ${escapeXml(session.summary)}</text>
    <text x="${width - 34}" y="57" fill="#9db0c8" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">样本数 ${session.samples}</text>
    ${grid}
    ${rects}
  </svg>`;
}
