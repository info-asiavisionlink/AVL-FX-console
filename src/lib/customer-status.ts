export const CUSTOMER_STATUS = {
  LEAD:        { label: "商談中",   color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
  DEVELOPMENT: { label: "開発中",   color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  TESTING:     { label: "テスト中", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  DELIVERED:   { label: "納品済み", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  MAINTENANCE: { label: "管理中",   color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  SUSPENDED:   { label: "停止",     color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  TRANSFERRED: { label: "移管済み", color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
  ENDED:       { label: "終了",     color: "#9a9a9a", bg: "rgba(0,0,0,0.05)" },
} as const;

export type CustomerStatus = keyof typeof CUSTOMER_STATUS;

export const STATUS_OPTIONS: CustomerStatus[] = [
  "LEAD","DEVELOPMENT","TESTING","DELIVERED","MAINTENANCE","SUSPENDED","TRANSFERRED","ENDED"
];

// 月額ステータス（EA追加・チャート・バックテストのアクセス権）
export const SUBSCRIPTION_STATUS = {
  ACTIVE:      { label: "許可",     color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  INACTIVE:    { label: "不許可",   color: "#dc2626", bg: "rgba(220,38,38,0.08)" },
  TRANSFERRED: { label: "譲渡済み", color: "#0891b2", bg: "rgba(8,145,178,0.08)" },
} as const;

export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUS;

// contract から月額ステータスを導出
export function getSubscriptionStatus(contract: {
  research_access_enabled: boolean;
  transfer_status: string;
} | null): SubscriptionStatus {
  if (!contract) return "INACTIVE";
  if (contract.transfer_status === "COMPLETED") return "TRANSFERRED";
  return contract.research_access_enabled ? "ACTIVE" : "INACTIVE";
}
