import { cookies } from "next/headers";

export const IDENTITY_COOKIE = "kuratau-identity";

export async function getCurrentIdentityId(): Promise<string | null> {
  const c = await cookies();
  return c.get(IDENTITY_COOKIE)?.value ?? null;
}
