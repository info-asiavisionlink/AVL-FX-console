"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUBSCRIPTION_STATUS,
  getSubscriptionStatus,
  type SubscriptionStatus,
} from "@/lib/customer-status";

interface Props {
  customerId: string;
  contract: { research_access_enabled: boolean; transfer_status: string } | null;
  compact?: boolean;
}

export function SubscriptionStatusBadge({ customerId, contract, compact = false }: Props) {
  const current = getSubscriptionStatus(contract);
  const [status, setStatus]   = useState<SubscriptionStatus>(current);
  const [saving, setSaving]   = useState(false);
  const [open,   setOpen]     = useState(false);
  const router = useRouter();

  const cfg = SUBSCRIPTION_STATUS[status];

  const handleChange = async (next: SubscriptionStatus) => {
    if (next === status) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    const res = await fetch(`/api/customers/${customerId}/contract`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ subscription_status: next }),
    });
    if (res.ok) {
      setStatus(next);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        style={{
          color:       cfg.color,
          background:  cfg.bg,
          padding:     compact ? "2px 8px" : "4px 12px",
          borderRadius: 99,
          fontSize:    compact ? 10 : 11,
          fontWeight:  700,
          border:      `1px solid ${cfg.color}40`,
          cursor:      saving ? "not-allowed" : "pointer",
          whiteSpace:  "nowrap",
          opacity:     saving ? 0.6 : 1,
        }}
      >
        {saving ? "更新中..." : `${cfg.label} ▾`}
      </button>

      {open && (
        <>
          {/* オーバーレイ */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 mt-1 left-0 rounded-xl overflow-hidden"
            style={{
              background: "#fff",
              border:     "1px solid rgba(0,0,0,0.1)",
              boxShadow:  "0 8px 24px rgba(0,0,0,0.12)",
              minWidth:   "110px",
            }}
          >
            {(Object.entries(SUBSCRIPTION_STATUS) as [SubscriptionStatus, typeof SUBSCRIPTION_STATUS[SubscriptionStatus]][]).map(
              ([key, c]) => (
                <button
                  key={key}
                  onClick={() => handleChange(key)}
                  style={{
                    display:    "block",
                    width:      "100%",
                    padding:    "8px 14px",
                    textAlign:  "left",
                    fontSize:   12,
                    fontWeight: key === status ? 700 : 500,
                    color:      key === status ? c.color : "#4a4a4a",
                    background: key === status ? c.bg : "transparent",
                    cursor:     "pointer",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  {c.label}
                  {key === status && " ✓"}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
