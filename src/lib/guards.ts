import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

type AppRole = "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE";
const rank: Record<AppRole, number> = { DIRECTOR: 3, SENIOR_ADMIN: 2, ADMIN: 1, EMPLOYEE: 0 } as const;

async function getRole(): Promise<AppRole> {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as AppRole;
  return role;
}

function forbid() {
  return new NextResponse("Forbidden", { status: 403 });
}

export async function requireDirector() {
  const role = await getRole();
  if (rank[role] < rank.DIRECTOR) return forbid();
  return null;
}

export async function requireShiftManager() {
  const role = await getRole();
  if (rank[role] < rank.SENIOR_ADMIN) return forbid();
  return null;
}

// Back-compat: routes using requireAdmin now require DIRECTOR
export async function requireAdmin() {
  return requireDirector();
}


