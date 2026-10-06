import "server-only";

import { cookies } from "next/headers";

export const rememberedEmployeeCookieName = "shift_remembered_employee_id";
export const rememberedEmployeeCookieOptions = {
  path: "/availability/periods",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

export async function saveRememberedEmployee(employeeId: string) {
  (await cookies()).set(
    rememberedEmployeeCookieName,
    employeeId,
    rememberedEmployeeCookieOptions,
  );
}

export async function clearRememberedEmployee() {
  (await cookies()).set(rememberedEmployeeCookieName, "", {
    ...rememberedEmployeeCookieOptions,
    maxAge: 0,
  });
}
