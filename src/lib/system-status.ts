export const SYSTEM_STATUS = {
  BUILDING:    { label: "構築中",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  TESTING:     { label: "テスト中", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  LIVE:        { label: "稼働中",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  SUSPENDED:   { label: "停止中",   color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  TRANSFERRED: { label: "移管済み", color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
} as const;

export type SystemStatus = keyof typeof SYSTEM_STATUS;

export const SYSTEM_STATUS_OPTIONS: SystemStatus[] = [
  "BUILDING","TESTING","LIVE","SUSPENDED","TRANSFERRED"
];
