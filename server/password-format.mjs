const passwordHashPattern = /^scrypt([:$])([a-f0-9]{32})\1([a-f0-9]{128})$/i;

export function formatPasswordHash(saltHex, hashHex) {
  const encoded = `scrypt:${saltHex}:${hashHex}`;
  if (!passwordHashPattern.test(encoded)) throw new Error("Cannot serialize an invalid scrypt password hash.");
  return encoded;
}

export function parsePasswordHash(encoded) {
  const match = passwordHashPattern.exec(encoded);
  return match ? { saltHex: match[2], hashHex: match[3] } : null;
}

export function isPasswordHash(encoded) {
  return passwordHashPattern.test(encoded);
}