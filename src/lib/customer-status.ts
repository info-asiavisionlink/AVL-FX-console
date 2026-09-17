export const CUSTOMER_STATUS = {
  LEAD:        { label: "商談中",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  DEVELOPMENT: { label: "開発中",   color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  TESTING:     { label: "テスト中", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  DELIVERED:   { label: "納品済み", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  MAINTENANCE: { label: "管理中",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  SUSPENDED:   { label: "停止",     color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  ENDED:       { label: "終了",     color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
} as const;

export type CustomerStatus = keyof typeof CUSTOMER_STATUS;

export const STATUS_OPTIONS: CustomerStatus[] = [
  "LEAD","DEVELOPMENT","TESTING","DELIVERED","MAINTENANCE","SUSPENDED","ENDED"
];
