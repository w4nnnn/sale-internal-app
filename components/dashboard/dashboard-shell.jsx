"use client";

import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { HomeIcon, LogOutIcon, LayoutDashboardIcon, UserCogIcon, UsersIcon } from "lucide-react";

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
import ManajemenUser from "@/components/users/manajemen-users";
import SelfUserDialog from "@/components/users/self-user-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "../ui/separator";

export function DashboardShell({
  initialSection = "pelanggan",
  user,
}) {
  const [currentUser, setCurrentUser] = useState(user);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const handleProfileUpdate = (updatedUser) => {
    if (!updatedUser) {
      return;
    }

    setCurrentUser((previous) => ({
      ...previous,
      id: updatedUser.user_id ?? previous?.id,
      user_id: updatedUser.user_id ?? previous?.user_id,
      name: updatedUser.nama_user ?? previous?.name,
      nama_user: updatedUser.nama_user ?? previous?.nama_user,
      username: updatedUser.username ?? previous?.username,
      email: updatedUser.email_user ?? previous?.email,
      email_user: updatedUser.email_user ?? previous?.email_user,
      telepon_user: updatedUser.telepon_user ?? previous?.telepon_user,
      role: updatedUser.role ?? previous?.role,
    }));
  };

  const handleProfileDeleted = () => {
    signOut({ callbackUrl: "/login" });
  };

  const roleLabel = useMemo(() => {
    if (!currentUser?.role) {
      return null;
    }

    return currentUser.role
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }, [currentUser?.role]);

  const sections = useMemo(() => {
    const base = {
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

    if (currentUser?.role === "admin") {
      base.users = {
        label: "Pengguna",
        description: "Atur akun internal dan hak akses.",
        icon: UserCogIcon,
        component: ManajemenUser,
      };
    }

    return base;
  }, [currentUser?.role]);

  const sectionKeys = useMemo(() => Object.keys(sections), [sections]);
  const [activeSection, setActiveSection] = useState(() => {
    if (sections[initialSection]) {
      return initialSection;
    }
    return sectionKeys[0] ?? "pelanggan";
  });

  const currentSectionKey = sections[activeSection] ? activeSection : sectionKeys[0];

  const activeMeta = useMemo(() => {
    return currentSectionKey ? sections[currentSectionKey] : null;
  }, [sections, currentSectionKey]);

  const ActiveComponent = activeMeta?.component;

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
                    const isActive = key === currentSectionKey;
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
            <button
              type="button"
              onClick={() => setProfileDialogOpen(true)}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-3 text-left text-sm transition hover:border-primary/60 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <p className="font-semibold text-foreground">
                {currentUser?.name ?? currentUser?.nama_user ?? "Pengguna"}
              </p>
              {roleLabel ? (
                <Badge variant="outline" className="mt-1 uppercase tracking-wide">
                  {roleLabel}
                </Badge>
              ) : (
                <p className="text-muted-foreground">Role belum ditetapkan</p>
              )}
            </button>
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
            {activeMeta ? (
              <div className="flex-1">
                {ActiveComponent ? <ActiveComponent currentUser={currentUser} /> : null}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Tidak ada menu yang tersedia.
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
      <SelfUserDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={currentUser}
        onUpdated={handleProfileUpdate}
        onDeleted={handleProfileDeleted}
      />
    </SidebarProvider>
  );
}

export default DashboardShell;
