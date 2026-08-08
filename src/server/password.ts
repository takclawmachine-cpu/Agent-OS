import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  if (password.length < 12) throw new Error("The owner password must contain at least 12 characters.");
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, saltHex, hashHex, extra] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex || extra) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const derived = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length) as Buffer;
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}