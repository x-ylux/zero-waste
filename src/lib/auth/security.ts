import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scrypt(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltText, hashText] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;

  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(hashText, "base64url");
  if (salt.length !== 16 || expected.length !== PASSWORD_KEY_LENGTH) return false;
  const actual = await scrypt(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function createEmailCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export function hashEmailCode(challengeId: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");
}

export function verifyEmailCodeHash(
  challengeId: string,
  code: string,
  secret: string,
  expectedHash: string
): boolean {
  const actual = Buffer.from(hashEmailCode(challengeId, code, secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
