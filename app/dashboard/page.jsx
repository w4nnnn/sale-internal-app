import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "super-admin") {
    redirect("/dashboard-admin");
  }

  if (session.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <DashboardShell
      initialSection="pelanggan"
      user={session.user}
    />
  );
}
