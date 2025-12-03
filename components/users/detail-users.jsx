"use client";

import { useEffect, useState } from "react";
import {
	UserIcon,
	PackageIcon,
	MailIcon,
	PhoneIcon,
	ShieldIcon,
	UserCheckIcon,
	CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";export function DetailUserDialog({ open, onOpenChange, user }) {
  const [licenses, setLicenses] = useState([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);

  useEffect(() => {
    if (!open || !user?.user_id) {
      setLicenses([]);
      return;
    }

    const fetchLicenses = async () => {
      setIsLoadingLicenses(true);
      try {
        const response = await fetch(`/api/users/${user.user_id}/licenses`);
        if (!response.ok) {
          throw new Error("Gagal memuat lisensi.");
        }
        const data = await response.json();
        setLicenses(data?.data || []);
      } catch (error) {
        toast.error(error.message);
        setLicenses([]);
      } finally {
        setIsLoadingLicenses(false);
      }
    };

    fetchLicenses();
  }, [open, user?.user_id]);

  if (!user) {
    return null;
  }

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="pb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<UserIcon className="h-6 w-6 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-xl">Detail Pengguna</DialogTitle>
							<DialogDescription className="text-muted-foreground">
								Informasi lengkap tentang pengguna ini.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-3">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<UserCheckIcon className="h-5 w-5" />
								Informasi Pengguna
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-2 sm:grid-cols-2">
								<div className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
									<div className="p-1.5 bg-background rounded-md">
										<UserIcon className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1">
										<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
											Nama
										</dt>
										<dd className="text-sm text-foreground font-medium">{user.nama_user}</dd>
									</div>
								</div>
								<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
									<div className="p-1.5 bg-background rounded-md">
										<UserIcon className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1">
										<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
											Username
										</dt>
										<dd className="text-sm text-foreground">{user.username}</dd>
									</div>
								</div>
								<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
									<div className="p-1.5 bg-background rounded-md">
										<MailIcon className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1">
										<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
											Email
										</dt>
										<dd className="text-sm text-foreground">
											{user.email_user || <span className="text-muted-foreground">-</span>}
										</dd>
									</div>
								</div>
								<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
									<div className="p-1.5 bg-background rounded-md">
										<ShieldIcon className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1">
										<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
											Role
										</dt>
										<dd className="text-sm text-foreground">
											<Badge variant="secondary" className="capitalize">
												{user.role.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}
											</Badge>
										</dd>
									</div>
								</div>
								<div className="col-span-2 flex items-start gap-3 p-3 rounded-lg bg-muted/30">
									<div className="p-1.5 bg-background rounded-md">
										<PhoneIcon className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="flex-1">
										<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
											Telepon
										</dt>
										<dd className="text-sm text-foreground">
											{user.telepon_user || <span className="text-muted-foreground">-</span>}
										</dd>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								<PackageIcon className="h-5 w-5" />
								Aplikasi yang Ditanggung Jawab
							</CardTitle>
						</CardHeader>
						<CardContent>
							{isLoadingLicenses ? (
								<div className="flex items-center gap-2 text-muted-foreground">
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
									Memuat lisensi...
								</div>
							) : licenses.length === 0 ? (
								<div className="p-4 bg-muted/30 rounded-lg text-center">
									<PackageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
									<p className="text-muted-foreground text-sm">Tidak ada aplikasi yang ditanggung jawab.</p>
								</div>
							) : (
								<div className="space-y-2">
									{licenses.map((license) => (
										<div key={license.lisensi_id} className="border rounded-lg p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<p className="text-sm font-semibold text-foreground mb-1">{license.nama_app}</p>
													<p className="text-xs text-muted-foreground mb-2">
														Pelanggan: <span className="font-medium">{license.nama_pelanggan}</span>
													</p>
													<div className="flex items-center gap-4 text-xs text-muted-foreground">
														<div className="flex items-center gap-1">
															<CalendarIcon className="h-3 w-3" />
															Habis: {new Date(license.tanggal_habis).toLocaleDateString('id-ID')}
														</div>
														<Badge variant={license.status_lisensi === 'Aktif' ? 'default' : 'secondary'} className="text-xs">
															{license.status_lisensi}
														</Badge>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default DetailUserDialog;