"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AppWindowIcon,
	CalendarIcon,
	GlobeIcon,
	SmartphoneIcon,
	UserIcon,
	UsersIcon,
	FileTextIcon,
	PackageIcon,
	CopyIcon,
	DownloadIcon,
	QrCodeIcon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import QRCode from "react-qr-code";

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
	{ key: "path_ios", label: "File iOS", icon: SmartphoneIcon },
	{ key: "path_android", label: "File Android", icon: SmartphoneIcon },
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

const resolveDownloadUrl = (value) => {
	if (!value || typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();

	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	return `/files/${trimmed.replace(/^\/+/g, "")}`;
};

const toAbsoluteUrl = (input) => {
	if (!input) {
		return null;
	}

	if (typeof window === "undefined") {
		return input;
	}

	try {
		return new URL(input, window.location.origin).toString();
	} catch (error) {
		return input;
	}
};

export function DetailAplikasiDialog({ aplikasi, open, onOpenChange }) {
	const [isLoadingLicense, setIsLoadingLicense] = useState(false);
	const [licenseError, setLicenseError] = useState(null);
	const [license, setLicense] = useState(null);
	const [userName, setUserName] = useState(null);
	const [pelangganName, setPelangganName] = useState(null);
	const [qrPreview, setQrPreview] = useState(null);
	const qrSvgRef = useRef(null);

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
							fetch("/api/users"),
							fetch("/api/pelanggan")
						]);

					if (usersRes.ok && pelangganRes.ok) {
						const usersPayload = await usersRes.json();
						const pelangganPayload = await pelangganRes.json();

						const user = usersPayload.data?.find((u) => u.user_id === licenseData.user_id);
						const pelanggan = pelangganPayload.data?.find((p) => p.pelanggan_id === licenseData.pelanggan_id);

						setUserName(user?.nama_user || "Tidak ditemukan");
						setPelangganName(pelanggan?.nama_pelanggan || "Tidak ditemukan");
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

	const handleCopyLink = useCallback(async (url) => {
		if (!url) {
			toast.error("Link tidak valid.");
			return;
		}

	const targetUrl = toAbsoluteUrl(url);

		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(targetUrl);
			} else {
				const textarea = document.createElement("textarea");
				textarea.value = targetUrl;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.focus();
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}

			toast.success("Link berhasil disalin.");
		} catch (error) {
			toast.error(error?.message || "Gagal menyalin link.");
		}
	}, []);

	const handleOpenQrPreview = useCallback((url, label) => {
		if (!url) {
			toast.error("Link tidak valid.");
			return;
		}

		const normalized = toAbsoluteUrl(url);
		setQrPreview({ url: normalized, label });
		onOpenChange?.(false);
	}, [onOpenChange]);

	const handleQrDialogOpenChange = useCallback((value) => {
		if (!value) {
			setQrPreview(null);
		}
	}, []);

	const handleDownloadQr = useCallback(() => {
		if (!qrPreview?.url || !qrSvgRef.current) {
			toast.error("QR code belum siap.");
			return;
		}

		if (typeof window === "undefined") {
			return;
		}

		try {
			const svgElement = qrSvgRef.current;
			const serializer = new XMLSerializer();
			const svgString = serializer.serializeToString(svgElement);
			const encodedData = window.btoa(unescape(encodeURIComponent(svgString)));
			const image = new Image();
			const canvas = document.createElement("canvas");
			const size = 512;
			canvas.width = size;
			canvas.height = size;
			const context = canvas.getContext("2d");

			if (!context) {
				toast.error("Kanvas tidak tersedia.");
				return;
			}

			image.onload = () => {
				context.fillStyle = "#ffffff";
				context.fillRect(0, 0, size, size);
				context.drawImage(image, 0, 0, size, size);

				const link = document.createElement("a");
				link.href = canvas.toDataURL("image/png");
				const baseName = qrPreview.label ? qrPreview.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "qr-code";
				link.download = `${baseName || "qr-code"}.png`;
				link.click();
				toast.success("QR code berhasil diunduh.");
			};

			image.onerror = () => {
				toast.error("Gagal memuat QR code untuk diunduh.");
			};

			image.src = `data:image/svg+xml;base64,${encodedData}`;
		} catch (error) {
			toast.error(error?.message || "Gagal mengunduh QR code.");
		}
	}, [qrPreview]);

	const qrDialogOpen = Boolean(qrPreview);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:'none'] [&::-webkit-scrollbar]:hidden">
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
																<GlobeIcon className="size-3.5" />
																Kunjungi
															</a>
														) : (field.key === "path_ios" || field.key === "path_android") && field.value ? (
															(() => {
																const downloadUrl = resolveDownloadUrl(field.value);

																if (!downloadUrl) {
																	return <span className="text-muted-foreground">-</span>;
																}

																const isIos = field.key === "path_ios";
																const label = isIos ? "File IPA" : "File APK";

																return (
																	<div className="flex flex-wrap items-center gap-2">
																		<Button asChild size="sm" className="gap-1.5" variant="link">
																			<a
																				href={downloadUrl}
																				target="_blank"
																				rel="noopener noreferrer"
																				download
																				className="inline-flex items-center gap-1.5"
																			>
																				<DownloadIcon className="size-3.5" />
																				<span>Unduh</span>
																			</a>
																		</Button>
																		<Button
																			type="button"
																			variant="link"
																			size="sm"
																			className="gap-1.5"
																			onClick={() => handleCopyLink(downloadUrl)}
																		>
																			<CopyIcon className="size-3.5" />
																			<span>Salin link</span>
																		</Button>
																		<Button
																			type="button"
																			variant="link"
																			size="sm"
																			className="gap-1.5"
																			onClick={() => handleOpenQrPreview(downloadUrl, label)}
																		>
																			<QrCodeIcon className="size-3.5" />
																			<span>QR code</span>
																		</Button>
																	</div>
																);
															})()
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
		<Dialog modal={false} open={qrDialogOpen} onOpenChange={handleQrDialogOpenChange}>
			<DialogContent className="max-w-sm" showCloseButton>
				<DialogHeader>
					<DialogTitle>Kode QR</DialogTitle>
					<DialogDescription>
						Pindai atau unduh kode QR untuk {qrPreview?.label?.toLowerCase() || "tautan"}.
					</DialogDescription>
				</DialogHeader>
				{qrPreview ? (
					<div className="flex flex-col items-center gap-4">
						<div className="rounded-lg bg-white p-4 shadow-sm">
							<QRCode ref={qrSvgRef} value={qrPreview.url} size={220} />
						</div>
						<p className="text-xs text-muted-foreground break-all text-center">
							{qrPreview.url}
						</p>
						<div className="flex flex-wrap items-center justify-center gap-2">
							<Button type="button" className="gap-1.5" onClick={handleDownloadQr}>
								<DownloadIcon className="size-3.5" />
								<span>Unduh QR</span>
							</Button>
							<Button
								type="button"
								variant="outline"
								className="gap-1.5"
								onClick={() => handleCopyLink(qrPreview.url)}
							>
								<CopyIcon className="size-3.5" />
								<span>Salin link</span>
							</Button>
						</div>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	</>
	);
}

export default DetailAplikasiDialog;
