"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/lib/validators/auth";

export async function loginAction(formData: FormData) {
  const parsedForm = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedForm.success) {
    redirect("/login?error=InvalidInput");
  }

  try {
    await signIn("credentials", {
      email: parsedForm.data.email,
      password: parsedForm.data.password,
      redirectTo: "/admin/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=${error.type}`);
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/login",
  });
}
