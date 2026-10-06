import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  findAdminByEmail,
  type AdminRole,
} from "@/repositories/adminRepository";
import { loginSchema } from "@/lib/validators/auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AdminRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: AdminRole;
  }
}

const adminRoles = ["owner", "manager", "editor", "viewer"] satisfies AdminRole[];

function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && adminRoles.includes(role as AdminRole);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const admin = await findAdminByEmail(parsedCredentials.data.email);

        if (!admin?.isActive) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          parsedCredentials.data.password,
          admin.passwordHash,
        );

        if (!isValidPassword) {
          return null;
        }

        return {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      const isLoggedIn = Boolean(session?.user);
      const isAdminRoute = pathname.startsWith("/admin");
      const isLoginRoute = pathname.startsWith("/login");

      if (isAdminRoute) {
        return isLoggedIn;
      }

      if (isLoginRoute && isLoggedIn) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && isAdminRole(token.role)) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }

      return session;
    },
  },
});
