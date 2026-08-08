import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/server/password";

describe("owner passwords", () => {
  it("hashes and verifies a strong password without retaining plaintext", async () => {
    const password = "correct horse battery staple";
    const encoded = await hashPassword(password);

    expect(encoded).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", encoded)).resolves.toBe(false);
  });

  it("rejects weak passwords and malformed hashes", async () => {
    await expect(hashPassword("too-short")).rejects.toThrow(/12 characters/);
    await expect(verifyPassword("any password", "plain-text")).resolves.toBe(false);
  });
});