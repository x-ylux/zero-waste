import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("Security, Cryptographic Passwords & Role Isolation", () => {
  it("hashes passwords securely with bcrypt and verifies correct comparisons", async () => {
    const raw = "SecureSecret987!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await verifyPassword(raw, hash);
    expect(valid).toBe(true);

    const invalid = await verifyPassword("WrongPassword", hash);
    expect(invalid).toBe(false);
  });

  it("signs and verifies HMAC-SHA256 session tokens with expiration and user payload", async () => {
    const userPayload = {
      id: "test-user-123",
      email: "test@rescueplate.org",
      name: "Security Tester",
      role: "DONOR" as const,
      isSuspended: false,
    };

    const token = await createSessionToken(userPayload);
    expect(token).toBeDefined();
    expect(token.split(".").length).toBe(3); // JWT format

    const verified = await verifySessionToken(token);
    expect(verified).toBeDefined();
    expect(verified!.email).toBe("test@rescueplate.org");
    expect(verified!.role).toBe("DONOR");
  });

  it("fails verification gracefully on tampered tokens", async () => {
    const tampered = "eyJhbGciOiJIUzI1NiJ9.invalidpayload.invalidsignature";
    const verified = await verifySessionToken(tampered);
    expect(verified).toBeNull();
  });
});
