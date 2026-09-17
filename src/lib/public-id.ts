import { nanoid } from "nanoid";

// NanoID 21文字英数字。衝突確率 ≈ 1/10^30
export function generatePublicId(): string {
  return nanoid(21);
}
