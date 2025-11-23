"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const aplikasiSchema = z
	.object({
		nama_app: z
			.string({ required_error: "Nama aplikasi wajib diisi." })
			.trim()
			.min(1, "Nama aplikasi wajib diisi."),
		tiपे_app: z.enum(["demo", "pelanggan", "admin"], {
			required_error: "Tipe aplikasi harus dipilih.",
		}),
		deskripsi: z.string().trim().optional(),
		link_web: z.string().trim().optional(),
		path_ios: z.string().trim().optional(),
		path_android: z.string().trim().optional(),
		pelanggan_id: z.string().optional().nullable(),
		user_id: z.string().optional().nullable(),
		tanggal_mulai: z.string().optional().nullable(),
		tanggal_habis: z.string().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.tipe_app !== "pelanggan") {
			return;
		}

		if (!data.pelanggan_id || data.pelanggan_id.trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["pelanggan_id"],
				message: "Pelanggan wajib dipilih.",
			});
		}

		if (!data.user_id || data.user_id.trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["user_id"],
				message: "User penanggung jawab wajib dipilih.",
			});
		}

		if (!data.tanggal_mulai || data.tanggal_mulai.trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["tanggal_mulai"],
				message: "Tanggal mulai wajib diisi.",
			});
		}

		if (!data.tanggal_habis || data.tanggal_habis.trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["tanggal_habis"],
				message: "Tanggal habis wajib diisi.",
			});
		}

		if (data.tanggal_mulai && data.tanggal_habis) {
			const start = new Date(data.tanggal_mulai);
			const end = new Date(data.tanggal_habis);

			if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tanggal_habis"],
					message: "Format tanggal tidak valid.",
				});
			} else if (start > end) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tanggal_habis"],
					message: "Tanggal habis harus setelah tanggal mulai.",
				});
			}
		}
	});

const defaultValues = {
	nama_app: "",
	tipe_app: "pelanggan",
	deskripsi: "",
	link_web: "",
	path_ios: "",
	path_android: "",
	pelanggan_id: "",
	user_id: "",
	tanggal_mulai: "",
	tanggal_habis: "",
};

const tipeAppOptions = [
	{ value: "demo", label: "Demo" },
	{ value: "pelanggan", label: "Pelanggan" },
	{ value: "admin", label: "Admin" },
];

export function FormAplikasiDialog({
	onSuccess,
	open,
	onOpenChange,
	mode = "create",
	initialData,
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isFetchingOptions, setIsFetchingOptions] = useState(false);
	const [pelangganOptions, setPelangganOptions] = useState([]);
	const [userOptions, setUserOptions] = useState([]);
	const [initialLicenseLoaded, setInitialLicenseLoaded] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;
	const isEdit = mode === "edit" && initialData?.app_id;

	const form = useForm({
		resolver: zodResolver(aplikasiSchema),
		defaultValues,
	});

	const tipeApp = form.watch("tipe_app");

	const pelangganSelectOptions = useMemo(
		() =>
			pelangganOptions.map((item) => ({
				value: String(item.pelanggan_id),
				label: item.nama_pelanggan,
			})),
		[pelangganOptions]
	);

	const userSelectOptions = useMemo(
		() =>
			userOptions.map((item) => ({
				value: String(item.user_id),
				label: item.nama_user,
			})),
		[userOptions]
	);

	useEffect(() => {
		if (!dialogOpen) {
			return;
		}

		setInitialLicenseLoaded(false);

		if (isEdit && initialData) {
			form.reset({
				nama_app: initialData.nama_app ?? "",
				tipe_app: initialData.tipe_app ?? "pelanggan",
				deskripsi: initialData.deskripsi ?? "",
				link_web: initialData.link_web ?? "",
				path_ios: initialData.path_ios ?? "",
				path_android: initialData.path_android ?? "",
				pelanggan_id: "",
				user_id: "",
				tanggal_mulai: "",
				tanggal_habis: "",
			});
		} else {
			form.reset(defaultValues);
		}
	}, [dialogOpen, isEdit, initialData, form]);

	useEffect(() => {
		if (tipeApp !== "pelanggan") {
			form.setValue("pelanggan_id", "");
			form.setValue("user_id", "");
			form.setValue("tanggal_mulai", "");
			form.setValue("tanggal_habis", "");
			setInitialLicenseLoaded(false);
		}
	}, [tipeApp, form]);

	useEffect(() => {
		if (!dialogOpen || tipeApp !== "pelanggan") {
			return;
		}

		let ignore = false;

		const fetchOptions = async () => {
			try {
				setIsFetchingOptions(true);
				const [pelangganResponse, userResponse] = await Promise.all([
					fetch("/api/pelanggan"),
					fetch("/api/users"),
				]);

				if (!pelangganResponse.ok) {
					const errorPayload = await pelangganResponse.json().catch(() => ({}));
					throw new Error(errorPayload?.message || "Gagal memuat daftar pelanggan.");
				}

				if (!userResponse.ok) {
					const errorPayload = await userResponse.json().catch(() => ({}));
					throw new Error(errorPayload?.message || "Gagal memuat daftar user.");
				}

				const pelangganPayload = await pelangganResponse.json();
				const userPayload = await userResponse.json();

				if (!ignore) {
					setPelangganOptions(Array.isArray(pelangganPayload?.data) ? pelangganPayload.data : []);
					setUserOptions(Array.isArray(userPayload?.data) ? userPayload.data : []);
				}
			} catch (error) {
				if (!ignore) {
					toast.error(error.message || "Gagal memuat data referensi.");
				}
			} finally {
				if (!ignore) {
					setIsFetchingOptions(false);
				}
			}
		};

		fetchOptions();

		return () => {
			ignore = true;
		};
	}, [dialogOpen, tipeApp]);

	useEffect(() => {
		if (!dialogOpen || !isEdit || tipeApp !== "pelanggan" || !initialData?.app_id) {
			return;
		}

		if (initialLicenseLoaded) {
			return;
		}

		let ignore = false;

		const fetchLicense = async () => {
			try {
				const response = await fetch(`/api/aplikasi/${initialData.app_id}/license`);

				if (response.status === 404) {
					if (!ignore) {
						setInitialLicenseLoaded(true);
					}
					return;
				}

				if (!response.ok) {
					const errorPayload = await response.json().catch(() => ({}));
					throw new Error(errorPayload?.message || "Gagal memuat data lisensi.");
				}

				const payload = await response.json();
				const license = payload?.data;

				if (!ignore && license) {
					form.setValue("pelanggan_id", String(license.pelanggan_id ?? ""));
					form.setValue("user_id", String(license.user_id ?? ""));
					form.setValue("tanggal_mulai", license.tanggal_mulai ?? "");
					form.setValue("tanggal_habis", license.tanggal_habis ?? "");
				}

				if (!ignore) {
					setInitialLicenseLoaded(true);
				}
			} catch (error) {
				if (!ignore) {
					toast.error(error.message || "Gagal memuat data lisensi.");
					setInitialLicenseLoaded(true);
				}
			}
		};

		fetchLicense();

		return () => {
			ignore = true;
		};
	}, [dialogOpen, isEdit, tipeApp, initialData?.app_id, initialLicenseLoaded, form]);

	const handleDialogChange = (value) => {
		if (!isControlled) {
			setInternalOpen(value);
		}
		if (!value) {
			form.reset(defaultValues);
			setInitialLicenseLoaded(false);
		}
		onOpenChange?.(value);
	};

	const toNumberOrNull = (value) => {
		if (!value) {
			return null;
		}

		const numeric = Number(value);
		return Number.isNaN(numeric) ? null : numeric;
	};

	const handleSubmit = async (values) => {
		setIsSubmitting(true);

		try {
			const payload = {
				nama_app: values.nama_app.trim(),
				tipe_app: values.tipe_app,
				deskripsi: values.deskripsi?.trim() || null,
				link_web: values.link_web?.trim() || null,
				path_ios: values.path_ios?.trim() || null,
				path_android: values.path_android?.trim() || null,
			};

			if (values.tipe_app === "pelanggan") {
				payload.pelanggan_id = toNumberOrNull(values.pelanggan_id);
				payload.user_id = toNumberOrNull(values.user_id);
				payload.tanggal_mulai = values.tanggal_mulai;
				payload.tanggal_habis = values.tanggal_habis;
			} else {
				payload.pelanggan_id = null;
				payload.user_id = null;
				payload.tanggal_mulai = null;
				payload.tanggal_habis = null;
			}

			const endpoint = isEdit ? `/api/aplikasi/${initialData.app_id}` : "/api/aplikasi";
			const method = isEdit ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menyimpan data aplikasi.");
			}

			const result = await response.json();
			form.reset(defaultValues);
			toast.success(isEdit ? "Aplikasi berhasil diperbarui." : "Aplikasi berhasil disimpan.");
			handleDialogChange(false);

			if (typeof onSuccess === "function") {
				onSuccess(result, { mode: isEdit ? "edit" : "create" });
			}
		} catch (error) {
			toast.error(error.message || "Terjadi kesalahan tak terduga.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const submitLabel = isSubmitting
		? "Menyimpan..."
		: isEdit
			? "Simpan Perubahan"
			: "Simpan Aplikasi";

	return (
		<Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Aplikasi" : "Tambah Aplikasi"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Perbarui informasi aplikasi lalu simpan perubahan."
							: "Isi formulir berikut untuk menambahkan aplikasi baru."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						id="aplikasi-form"
						onSubmit={form.handleSubmit(handleSubmit)}
						className="grid gap-6"
					>
						<FormField
							control={form.control}
							name="nama_app"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nama Aplikasi</FormLabel>
									<FormControl>
										<Input placeholder="Contoh: Sales App" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="tipe_app"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tipe Aplikasi</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Pilih tipe aplikasi" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{tipeAppOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{tipeApp === "pelanggan" && (
							<div className="grid gap-6 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="pelanggan_id"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Pelanggan</FormLabel>
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
												disabled={
												isFetchingOptions || pelangganSelectOptions.length === 0
											}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue
															placeholder={
																isFetchingOptions ? "Memuat pelanggan..." : "Pilih pelanggan"
														}
														/>
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{pelangganSelectOptions.length === 0 ? (
														<SelectItem value="__empty" disabled>
															Belum ada pelanggan
														</SelectItem>
													) : (
														pelangganSelectOptions.map((option) => (
															<SelectItem key={option.value} value={option.value}>
																{option.label}
															</SelectItem>
														))
													)}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="user_id"
									render={({ field }) => (
										<FormItem>
											<FormLabel>User Penanggung Jawab</FormLabel>
											<Select
												value={field.value || undefined}
												onValueChange={field.onChange}
												disabled={isFetchingOptions || userSelectOptions.length === 0}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue
															placeholder={
																isFetchingOptions ? "Memuat user..." : "Pilih penanggung jawab"
														}
														/>
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{userSelectOptions.length === 0 ? (
														<SelectItem value="__empty" disabled>
															Belum ada user
														</SelectItem>
													) : (
														userSelectOptions.map((option) => (
															<SelectItem key={option.value} value={option.value}>
																{option.label}
															</SelectItem>
														))
													)}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						{tipeApp === "pelanggan" && (
							<div className="grid gap-6 sm:grid-cols-2">
								<FormField
									control={form.control}
									name="tanggal_mulai"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tanggal Mulai Lisensi</FormLabel>
											<FormControl>
												<Input type="date" {...field} value={field.value || ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="tanggal_habis"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Tanggal Habis Lisensi</FormLabel>
											<FormControl>
												<Input type="date" {...field} value={field.value || ""} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						)}

						<FormField
							control={form.control}
							name="deskripsi"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Deskripsi</FormLabel>
									<FormControl>
										<Textarea placeholder="Tuliskan deskripsi singkat aplikasi" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="link_web"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Link Web</FormLabel>
									<FormControl>
										<Input placeholder="https://contoh.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid gap-6 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="path_ios"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Path iOS (.ipa)</FormLabel>
										<FormControl>
											<Input placeholder="/files/app-ios.ipa" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="path_android"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Path Android (.apk)</FormLabel>
										<FormControl>
											<Input placeholder="/files/app-android.apk" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</form>
				</Form>
				<DialogFooter>
					<Button type="submit" form="aplikasi-form" disabled={isSubmitting}>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default FormAplikasiDialog;
