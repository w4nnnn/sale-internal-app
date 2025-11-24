import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

import conn from "@/lib/conn";

const { get } = conn;

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan kata sandi wajib diisi.");
        }

        const username = String(credentials.username).toLowerCase().trim();
        const user = get(
          `SELECT user_id, nama_user, username, email_user, password_hash, role
           FROM Users
           WHERE LOWER(username) = LOWER(?)`,
          [username]
        );

        if (!user) {
          throw new Error("Username atau kata sandi salah.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValidPassword) {
          throw new Error("Username atau kata sandi salah.");
        }

        return {
          id: user.user_id,
          name: user.nama_user,
          username: user.username,
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
        token.username = user.username;
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
        session.user.username = token.username ?? session.user.username;
      }
      return session;
    },
  },
};
