import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function loginAction(formData: FormData) {
  "use server";
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (pairs) =>
          pairs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  );
  if (!user?.email || !adminEmails.has(user.email.toLowerCase())) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMsg =
    error === "unauthorized" ? "このアカウントはConsoleへのアクセス権がありません" :
    error ? decodeURIComponent(error) : "";

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f7f4" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 text-white text-2xl font-black"
            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>A</div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1a1a" }}>AVLFX Console</h1>
          <p className="text-sm mt-1" style={{ color: "#9a9a9a" }}>管理者専用システム</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{
          background: "#ffffff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <form action={loginAction} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#4a4a4a" }}>
                メールアドレス
              </label>
              <input
                name="email" type="email" required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "#f8f7f4",
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  color: "#1a1a1a",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#4a4a4a" }}>
                パスワード
              </label>
              <input
                name="password" type="password" required autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "#f8f7f4",
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  color: "#1a1a1a",
                }}
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl px-4 py-3" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
                <p className="text-sm" style={{ color: "#dc2626" }}>{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
              }}
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
