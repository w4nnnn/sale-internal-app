import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import LoginForm from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "admin") {
    redirect("/dashboard-admin");
  }

  if (session?.user?.role === "agen") {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
