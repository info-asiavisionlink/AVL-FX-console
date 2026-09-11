// =================================================================
// migrate-bar-data.ts
// Trading View Supabase → Console Supabase へ bar_data を移管
//
// 実行: npx tsx scripts/migrate-bar-data.ts
// =================================================================

const SRC_URL = "https://bsmofroshpmomjwfxigh.supabase.co";
const SRC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbW9mcm9zaHBtb21qd2Z4aWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTc3NTI1OSwiZXhwIjoyMTAxMzUxMjU5fQ.dr_26QA-MJx7PXBTnVnkuYJImYv3OPJtxgk64vBF5j4";

const DST_URL = "https://ghufhqodgrkftmhjozhj.supabase.co";
const DST_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodWZocW9kZ3JrZnRtaGpvemhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA4MjQ2NCwiZXhwIjoyMTA0NjU4NDY0fQ.j-vf8jX_9p7upiw0wrW44t37lvTpvEjCKoXjaM0hTwE";

const BATCH_SIZE = 1000;
const UPSERT_BATCH = 500;

interface BarRow {
  symbol: string;
  timeframe: string;
  time_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function srcFetch(path: string) {
  const res = await fetch(`${SRC_URL}${path}`, {
    headers: { apikey: SRC_KEY, Authorization: `Bearer ${SRC_KEY}` },
  });
  if (!res.ok) throw new Error(`SRC fetch failed: ${res.status} ${path}`);
  return res.json();
}

async function dstUpsert(rows: BarRow[]) {
  const res = await fetch(`${DST_URL}/rest/v1/bar_data`, {
    method: "POST",
    headers: {
      apikey: DST_KEY,
      Authorization: `Bearer ${DST_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DST upsert failed: ${res.status} ${txt.slice(0, 200)}`);
  }
}

async function getSymbolTFs(): Promise<{ symbol: string; timeframe: string; bar_count: number }[]> {
  const data = await srcFetch("/rest/v1/rpc/get_bar_data_status");
  return (data as { symbol: string; timeframe: string; bar_count: number }[])
    .sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
      return a.timeframe.localeCompare(b.timeframe);
    });
}

async function migrateSymbolTF(symbol: string, timeframe: string, totalCount: number) {
  let offset = 0;
  let migrated = 0;

  while (true) {
    const rows: BarRow[] = await srcFetch(
      `/rest/v1/bar_data?symbol=eq.${symbol}&timeframe=eq.${timeframe}` +
      `&select=symbol,timeframe,time_utc,open,high,low,close,volume` +
      `&order=time_utc.asc&limit=${BATCH_SIZE}&offset=${offset}`
    );

    if (!rows.length) break;

    // Upsert in smaller batches to Console Supabase
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      await dstUpsert(rows.slice(i, i + UPSERT_BATCH));
    }

    migrated += rows.length;
    offset += rows.length;

    const pct = Math.round((migrated / totalCount) * 100);
    process.stdout.write(`\r  ${symbol}:${timeframe} ${migrated.toLocaleString()}/${totalCount.toLocaleString()} (${pct}%)`);

    if (rows.length < BATCH_SIZE) break;
    await new Promise(r => setTimeout(r, 50));
  }

  process.stdout.write(`\r  ✓ ${symbol}:${timeframe} ${migrated.toLocaleString()}本 完了                 \n`);
  return migrated;
}

async function main() {
  console.log("=".repeat(60));
  console.log("  bar_data 移管: Trading View → Console Supabase");
  console.log("=".repeat(60));

  const symbolTFs = await getSymbolTFs();
  const total = symbolTFs.reduce((s, r) => s + Number(r.bar_count), 0);
  console.log(`\n対象: ${symbolTFs.length}シンボル×TF組み合わせ / 合計 ${total.toLocaleString()}本\n`);

  let totalMigrated = 0;
  let idx = 0;

  for (const { symbol, timeframe, bar_count } of symbolTFs) {
    idx++;
    console.log(`[${idx}/${symbolTFs.length}] ${symbol} ${timeframe} (${Number(bar_count).toLocaleString()}本)`);
    const count = await migrateSymbolTF(symbol, timeframe, Number(bar_count));
    totalMigrated += count;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  移管完了: ${totalMigrated.toLocaleString()} 本`);
  console.log("=".repeat(60));
}

main().catch(e => { console.error("Error:", e); process.exit(1); });
