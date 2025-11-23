import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function PostLoginPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    redirect("/dashboard-admin");
  }

  if (session.user.role === "sales") {
    redirect("/dashboard");
  }

  redirect("/login");
}
