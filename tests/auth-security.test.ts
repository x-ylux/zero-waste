import { describe, expect, it } from "vitest";
import {
  createEmailCode,
  hashEmailCode,
  hashPassword,
  hashSessionToken,
  verifyEmailCodeHash,
  verifyPassword,
} from "@/lib/auth/security";

describe("authentication security helpers", () => {
  it("hashes passwords and validates them without storing plaintext", async () => {
    const password = "correct horse battery staple";
    const storedHash = await hashPassword(password);

    expect(storedHash).not.toContain(password);
    expect(await verifyPassword(password, storedHash)).toBe(true);
    expect(await verifyPassword("wrong password", storedHash)).toBe(false);
    expect(await verifyPassword(password, "invalid-hash")).toBe(false);
  });

  it("generates six-digit codes and binds verification hashes to their challenge", () => {
    const code = createEmailCode();
    const secret = "test-secret-with-more-than-thirty-two-characters";
    const hash = hashEmailCode("challenge-a", code, secret);

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyEmailCodeHash("challenge-a", code, secret, hash)).toBe(true);
    expect(verifyEmailCodeHash("challenge-b", code, secret, hash)).toBe(false);
    expect(verifyEmailCodeHash("challenge-a", code, "different-secret", hash)).toBe(false);
  });

  it("stores only a digest of session tokens", () => {
    const token = "opaque-session-token";
    const first = hashSessionToken(token);

    expect(first).not.toContain(token);
    expect(first).toBe(hashSessionToken(token));
  });
});
