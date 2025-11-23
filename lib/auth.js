import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import conn from "@/lib/conn";

const { get } = conn;

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "sales@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan kata sandi wajib diisi.");
        }

        const email = String(credentials.email).toLowerCase().trim();
        const user = get(
          `SELECT user_id, nama_user, email_user, password_hash, role
           FROM Users
           WHERE LOWER(email_user) = LOWER(?)`,
          [email]
        );

        if (!user) {
          throw new Error("Email atau kata sandi salah.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValidPassword) {
          throw new Error("Email atau kata sandi salah.");
        }

        return {
          id: user.user_id,
          name: user.nama_user,
          email: user.email_user,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user ?? {};
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    },
  },
};
