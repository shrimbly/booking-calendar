import { cookies } from "next/headers";
import { siteCookiePrefix } from "@/lib/site";

export const IDENTITY_COOKIE = `${siteCookiePrefix}-identity`;

export async function getCurrentIdentityId(): Promise<string | null> {
  const c = await cookies();
  return c.get(IDENTITY_COOKIE)?.value ?? null;
}
