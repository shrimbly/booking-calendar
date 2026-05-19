import { cookies } from "next/headers";
import { siteCookiePrefix } from "@/lib/site";

export const GATE_COOKIE = `${siteCookiePrefix}-gate`;

export async function isGatePassed(): Promise<boolean> {
  const c = await cookies();
  return c.get(GATE_COOKIE)?.value === "ok";
}
