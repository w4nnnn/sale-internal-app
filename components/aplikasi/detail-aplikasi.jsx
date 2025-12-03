"use client";

import { useEffect, useMemo, useState } from "react";
import {
	AppWindowIcon,
	CalendarIcon,
	GlobeIcon,
	SmartphoneIcon,
	UserIcon,
	UsersIcon,
	FileTextIcon,
	PackageIcon,
} from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "long",
	year: "numeric",
});

const detailFields = [
	{ key: "nama_app", label: "Nama Aplikasi", icon: AppWindowIcon },
	{ key: "tipe_app", label: "Tipe", icon: PackageIcon },
	{ key: "deskripsi", label: "Deskripsi", icon: FileTextIcon },
	{ key: "link_web", label: "Link Web", icon: GlobeIcon },
	{ key: "path_ios", label: "Path iOS", icon: SmartphoneIcon },
	{ key: "path_android", label: "Path Android", icon: SmartphoneIcon },
];

function formatValue(key, value) {
	if (!value) {
		return "-";
	}

	if (key === "link_web") {
		return value.startsWith("http") ? value : `https://${value}`;
	}

	return value;
}

export function DetailAplikasiDialog({ aplikasi, open, onOpenChange }) {
	const [isLoadingLicense, setIsLoadingLicense] = useState(false);
	const [licenseError, setLicenseError] = useState(null);
	const [license, setLicense] = useState(null);
	const [userName, setUserName] = useState(null);
	const [pelangganName, setPelangganName] = useState(null);

	const appId = aplikasi?.app_id;

	useEffect(() => {
		if (!open || !appId || aplikasi?.tipe_app !== "pelanggan") {
			setLicense(null);
			setLicenseError(null);
			setUserName(null);
			setPelangganName(null);
			return;
		}

		let ignore = false;

		const fetchLicense = async () => {
			setIsLoadingLicense(true);
			setLicenseError(null);

			const fetchNames = async (licenseData) => {
				try {
					const [usersRes, pelangganRes] = await Promise.all([
						fetch('/api/users'),
						fetch('/api/pelanggan')
					]);

					if (usersRes.ok && pelangganRes.ok) {
						const usersPayload = await usersRes.json();
						const pelangganPayload = await pelangganRes.json();

						const user = usersPayload.data?.find(u => u.user_id === licenseData.user_id);
						const pelanggan = pelangganPayload.data?.find(p => p.pelanggan_id === licenseData.pelanggan_id);

						setUserName(user?.nama_user || 'Tidak ditemukan');
						setPelangganName(pelanggan?.nama_pelanggan || 'Tidak ditemukan');
					}
				} catch (error) {
					// Ignore errors for names
				}
			};

			try {
				const response = await fetch(`/api/aplikasi/${appId}/license`);

				if (!response.ok) {
					if (response.status === 404) {
						if (!ignore) {
							setLicense(null);
						}
						return;
					}
					const errorPayload = await response.json().catch(() => ({}));
					throw new Error(errorPayload?.message || "Gagal memuat data lisensi.");
				}

				const payload = await response.json();
				if (!ignore) {
					setLicense(payload?.data ?? null);
					if (payload?.data) {
						fetchNames(payload.data);
					}
				}
			} catch (error) {
				if (!ignore) {
					const message = error.message || "Gagal memuat data lisensi.";
					setLicenseError(message);
					toast.error(message);
				}
			} finally {
				if (!ignore) {
					setIsLoadingLicense(false);
				}
			}
		};

		fetchLicense();

		return () => {
			ignore = true;
		};
	}, [open, appId, aplikasi?.tipe_app]);

	const normalizedFields = useMemo(() => {
		if (!aplikasi) {
			return [];
		}

		return detailFields.map((field) => {
			const rawValue = aplikasi[field.key];

			if (field.key === "tipe_app") {
				return {
					...field,
					value: aplikasi.tipe_app,
				};
			}

			return {
				...field,
				value: rawValue ? rawValue : null,
			};
		});
	}, [aplikasi]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader className="pb-4">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-primary/10 rounded-lg">
							<AppWindowIcon className="h-6 w-6 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-xl">Detail Aplikasi</DialogTitle>
							<DialogDescription className="text-muted-foreground">
								Informasi lengkap mengenai aplikasi yang dipilih.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{!aplikasi ? (
					<p className="text-muted-foreground text-sm">Data aplikasi tidak tersedia.</p>
				) : (
					<div className="space-y-3">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg flex items-center gap-1">
									<PackageIcon className="h-5 w-5" />
									Informasi Aplikasi
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid gap-2 sm:grid-cols-2">
									{normalizedFields.map((field) => {
										const Icon = field.icon;
										return (
											<div key={field.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
												<div className="p-1.5 bg-background rounded-md">
													<Icon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1 min-w-0">
													<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
														{field.label}
													</dt>
													<dd className="text-sm text-foreground break-words">
														{field.key === "tipe_app" && field.value ? (
															<Badge variant="secondary" className="capitalize">
																{field.value}
															</Badge>
														) : field.key === "link_web" && field.value ? (
															<a
																href={formatValue(field.key, field.value)}
																target="_blank"
																rel="noopener noreferrer"
																className="text-primary hover:underline flex items-center gap-1"
															>
																<GlobeIcon className="h-3 w-3" />
																Kunjungi
															</a>
														) : field.value ? (
															field.value
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</dd>
												</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>

						{aplikasi.tipe_app === "pelanggan" ? (
							<Card>
								<CardHeader>
									<CardTitle className="text-lg flex items-center gap-2">
										<UsersIcon className="h-5 w-5" />
										Lisensi Terbaru
									</CardTitle>
								</CardHeader>
								<CardContent>
									{isLoadingLicense ? (
										<div className="flex items-center gap-2 text-muted-foreground">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
											Memuat data lisensi...
										</div>
									) : licenseError ? (
										<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
											<p className="text-destructive text-sm">{licenseError}</p>
										</div>
									) : license ? (
										<div className="grid gap-2 sm:grid-cols-2">
											<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
												<div className="p-1.5 bg-background rounded-md">
													<UsersIcon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1">
													<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
														Pelanggan
													</dt>
													<dd className="text-sm text-foreground font-medium">
														{pelangganName || license.pelanggan_id}
													</dd>
												</div>
											</div>
											<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
												<div className="p-1.5 bg-background rounded-md">
													<UserIcon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1">
													<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
														User Penanggung Jawab
													</dt>
													<dd className="text-sm text-foreground font-medium">
														{userName || license.user_id}
													</dd>
												</div>
											</div>
											<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
												<div className="p-1.5 bg-background rounded-md">
													<CalendarIcon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1">
													<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
														Tanggal Mulai
													</dt>
													<dd className="text-sm text-foreground">
														{license.tanggal_mulai
															? dateFormatter.format(new Date(license.tanggal_mulai))
															: <span className="text-muted-foreground">-</span>}
													</dd>
												</div>
											</div>
											<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
												<div className="p-1.5 bg-background rounded-md">
													<CalendarIcon className="h-4 w-4 text-muted-foreground" />
												</div>
												<div className="flex-1">
													<dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
														Tanggal Habis
													</dt>
													<dd className="text-sm text-foreground">
														{license.tanggal_habis
															? dateFormatter.format(new Date(license.tanggal_habis))
															: <span className="text-muted-foreground">-</span>}
													</dd>
												</div>
											</div>
										</div>
									) : (
										<div className="p-4 bg-muted/30 rounded-lg text-center">
											<PackageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
											<p className="text-muted-foreground text-sm">Belum ada data lisensi.</p>
										</div>
									)}
								</CardContent>
							</Card>
						) : null}
					</div>
				)}

				<DialogFooter className="pt-6">
					<Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
						Tutup
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default DetailAplikasiDialog;
