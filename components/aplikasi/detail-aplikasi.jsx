"use client";

import { useEffect, useMemo, useState } from "react";

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
import { toast } from "sonner";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "long",
	year: "numeric",
});

const detailFields = [
	{ key: "nama_app", label: "Nama Aplikasi" },
	{ key: "tipe_app", label: "Tipe" },
	{ key: "deskripsi", label: "Deskripsi" },
	{ key: "link_web", label: "Link Web" },
	{ key: "path_ios", label: "Path iOS" },
	{ key: "path_android", label: "Path Android" },
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

	const appId = aplikasi?.app_id;

	useEffect(() => {
		if (!open || !appId || aplikasi?.tipe_app !== "pelanggan") {
			setLicense(null);
			setLicenseError(null);
			return;
		}

		let ignore = false;

		const fetchLicense = async () => {
			setIsLoadingLicense(true);
			setLicenseError(null);

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
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Detail Aplikasi</DialogTitle>
					<DialogDescription>
						Informasi lengkap mengenai aplikasi yang dipilih.
					</DialogDescription>
				</DialogHeader>

				{!aplikasi ? (
					<p className="text-muted-foreground text-sm">Data aplikasi tidak tersedia.</p>
				) : (
					<div className="space-y-6">
						<div className="space-y-1">
							<h3 className="text-lg font-semibold text-foreground">{aplikasi.nama_app}</h3>
							{aplikasi.tipe_app ? (
								<Badge variant="outline" className="capitalize">
									{aplikasi.tipe_app}
								</Badge>
							) : null}
						</div>

						<Separator />

						<dl className="grid gap-4 sm:grid-cols-2">
							{normalizedFields.map((field) => (
								<div key={field.key} className="space-y-1">
									<dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
										{field.label}
									</dt>
									<dd className="text-sm text-foreground break-words">
										{field.key === "tipe_app" && field.value ? (
											<Badge variant="outline" className="capitalize">
												{field.value}
											</Badge>
										) : field.key === "link_web" && field.value ? (
											<a
												href={formatValue(field.key, field.value)}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:underline"
											>
												Kunjungi
											</a>
										) : field.value ? (
											field.value
										) : (
											"-"
										)}
									</dd>
								</div>
							))}
						</dl>

						{aplikasi.tipe_app === "pelanggan" ? (
							<div className="space-y-3">
								<Separator />
								<h4 className="text-base font-semibold text-foreground">Lisensi Terbaru</h4>
								{isLoadingLicense ? (
									<p className="text-muted-foreground text-sm">Memuat data lisensi...</p>
								) : licenseError ? (
									<p className="text-destructive text-sm">{licenseError}</p>
								) : license ? (
									<dl className="grid gap-3 sm:grid-cols-2">
										<div>
											<dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
												Pelanggan
											</dt>
											<dd className="text-sm text-foreground">
												#{license.pelanggan_id}
											</dd>
										</div>
										<div>
											<dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
												User Penanggung Jawab
											</dt>
											<dd className="text-sm text-foreground">
												#{license.user_id}
											</dd>
										</div>
										<div>
											<dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
												Tanggal Mulai
											</dt>
											<dd className="text-sm text-foreground">
												{license.tanggal_mulai
													? dateFormatter.format(new Date(license.tanggal_mulai))
													: "-"}
											</dd>
										</div>
										<div>
											<dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
												Tanggal Habis
											</dt>
											<dd className="text-sm text-foreground">
												{license.tanggal_habis
													? dateFormatter.format(new Date(license.tanggal_habis))
													: "-"}
											</dd>
										</div>
									</dl>
								) : (
									<p className="text-muted-foreground text-sm">Belum ada data lisensi.</p>
								)}
							</div>
						) : null}
					</div>
				)}

				<DialogFooter>
					<Button type="button" onClick={() => onOpenChange?.(false)}>
						Tutup
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default DetailAplikasiDialog;
