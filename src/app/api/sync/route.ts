import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const GATEWAY_URL    = process.env.MT5_GATEWAY_URL ?? "";
  const GATEWAY_SECRET = process.env.MT5_GATEWAY_SECRET ?? "";

  if (!GATEWAY_URL) {
    return NextResponse.json({ error: "MT5_GATEWAY_URL 未設定" }, { status: 503 });
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/admin/sync-to-supabase`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_SECRET}`,
        "x-gateway-secret": GATEWAY_SECRET,
      },
      signal: AbortSignal.timeout(120_000), // 2分タイムアウト
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: `Gateway error: ${res.status} ${txt}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
