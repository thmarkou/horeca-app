import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.PLATFORM_JWT_SECRET ?? "dev-only-change-in-production";
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

export async function signToken(userId: number, email: string, role: string): Promise<string> {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] });
    const sub = payload.sub;
    const email = payload.email;
    const role = payload.role;
    if (typeof sub !== "string" || typeof email !== "string" || typeof role !== "string") {
      return null;
    }
    return { sub, email, role };
  } catch {
    return null;
  }
}
