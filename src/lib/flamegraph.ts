import type { SessionRecord } from "../types.js";

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildFlamegraphSvg(session: SessionRecord): string {
  const bars = session.topStacks.slice(0, 5);
  const width = 1100;
  const height = 320;
  const barHeight = 36;
  const gutter = 16;
  const chartTop = 92;
  const maxWeight = Math.max(...bars.map((b) => b.weight), 1);

  const rects = bars
    .map((bar, index) => {
      const y = chartTop + index * (barHeight + gutter);
      const w = Math.max(190, Math.round((bar.weight / maxWeight) * 800));
      const hue = index % 2 === 0 ? "#eab308" : "#22d3ee";
      return `
        <g>
          <rect x="34" y="${y}" rx="5" ry="5" width="${w}" height="${barHeight}" fill="${hue}" opacity="0.92" />
          <rect x="${34 + w}" y="${y}" rx="5" ry="5" width="${width - 60 - w}" height="${barHeight}" fill="#141821" stroke="#2b3442" />
          <text x="52" y="${y + 23}" fill="#07111e" font-size="14" font-family="IBM Plex Mono, monospace">${escapeXml(bar.name)}</text>
          <text x="${width - 54}" y="${y + 23}" fill="#b4c0d0" font-size="12" font-family="IBM Plex Mono, monospace" text-anchor="end">${bar.weight}%</text>
        </g>`;
    })
    .join("\n");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="火焰图预览">
    <rect width="100%" height="100%" fill="#0a0d12"/>
    <rect x="0" y="0" width="100%" height="74" fill="#10151d"/>
    <text x="34" y="30" fill="#f5d08a" font-size="18" font-family="IBM Plex Sans, sans-serif" font-weight="700">火焰图预览</text>
    <text x="34" y="54" fill="#9db0c8" font-size="12" font-family="IBM Plex Sans, sans-serif">${escapeXml(session.service)} · ${escapeXml(session.summary)}</text>
    ${rects}
  </svg>`;
}
