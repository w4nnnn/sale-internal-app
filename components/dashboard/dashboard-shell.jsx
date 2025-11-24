"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { HomeIcon, LogOutIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import ManajemenPelanggan from "@/components/pelanggan/manajemen-pelanggan";
import ManajemenAplikasi from "@/components/aplikasi/manajemen-aplikasi";
import { Separator } from "../ui/separator";

const sections = {
  pelanggan: {
    label: "Pelanggan",
    description: "Kelola data pelanggan dan lisensi.",
    icon: UsersIcon,
    component: ManajemenPelanggan,
  },
  aplikasi: {
    label: "Aplikasi",
    description: "Atur katalog aplikasi yang tersedia.",
    icon: LayoutDashboardIcon,
    component: ManajemenAplikasi,
  },
};

export function DashboardShell({
  initialSection = "pelanggan",
  user,
}) {
  const [activeSection, setActiveSection] = useState(initialSection);

  const activeMeta = useMemo(() => sections[activeSection] ?? sections.pelanggan, [
    activeSection,
  ]);

  const ActiveComponent = activeMeta.component;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="px-2 py-1">
              <div className="flex items-center gap-3">
                <HomeIcon className="text-muted-foreground size-6" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Internal App
                  </p>
                  <p className="text-sm font-medium text-foreground">Admin Dashboard</p>
                </div>
              </div>
            </div>
          </SidebarHeader>
          <Separator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Object.entries(sections).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const isActive = key === activeSection;
                    return (
                      <SidebarMenuItem key={key}>
                        <SidebarMenuButton
                          type="button"
                          isActive={isActive}
                            tooltip={meta.label}
                          onClick={() => setActiveSection(key)}
                        >
                          <Icon className="size-4" />
                          <span>{meta.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="px-2 pb-2">
            <div className="border-border bg-muted/30 text-sm rounded-lg border px-3 py-3">
              <p className="font-semibold text-foreground">{user?.name ?? "Pengguna"}</p>
              <p className="text-muted-foreground">
                {user?.role
                  ? user.role
                      .split("-")
                      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                      .join(" ")
                  : "Role belum ditetapkan"}
              </p>
            </div>
          </div>
          <SidebarFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOutIcon className="size-4" />
              <span>Keluar</span>
            </Button>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-6 px-6 py-6 md:px-10 md:py-8">
            <SidebarTrigger className="w-fit md:hidden" />
            <div className="flex flex-col gap-1 border-b pb-4">
              <p className="text-lg font-semibold">{activeMeta.label}</p>
              <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
            </div>
            <div className="flex-1">
              <ActiveComponent />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default DashboardShell;
