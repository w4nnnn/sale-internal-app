"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

const aplikasiSchema = z
	.object({
		nama_app: z
			.string({ required_error: "Nama aplikasi wajib diisi." })
			.trim()
			.min(1, "Nama aplikasi wajib diisi."),
		tipe_app: z.enum(["demo", "pelanggan", "admin"], {
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
	pelanggan_id: null,
	user_id: null,
	tanggal_mulai: "",
	tanggal_habis: "",
};

const tipeAppOptions = [
	{ value: "demo", label: "Demo" },
	{ value: "pelanggan", label: "Pelanggan" },
	{ value: "admin", label: "Admin" },
];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
	day: "2-digit",
	month: "long",
	year: "numeric",
});

const parseDateString = (value) => {
	if (!value) {
		return undefined;
	}

	const parts = value.split("-");
	if (parts.length !== 3) {
		return undefined;
	}

	const [year, month, day] = parts.map((part) => Number(part));

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		return undefined;
	}

	return new Date(year, month - 1, day);
};

const formatDateInput = (date) => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
		return "";
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

export function FormAplikasiDialog({
	onSuccess,
	open,
	onOpenChange,
	mode = "create",
	initialData,
	currentUser,
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isFetchingOptions, setIsFetchingOptions] = useState(false);
	const [pelangganOptions, setPelangganOptions] = useState([]);
	const [userOptions, setUserOptions] = useState([]);
	const [initialLicenseLoaded, setInitialLicenseLoaded] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);
	const [isUploadingAndroid, setIsUploadingAndroid] = useState(false);
	const [isUploadingIos, setIsUploadingIos] = useState(false);
	const currentUserRole = currentUser?.role;
	const currentUserId = currentUser?.id;
	const isAgent = currentUserRole === "agen";

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;
	const isEdit = mode === "edit" && initialData?.app_id;

	const form = useForm({
		resolver: zodResolver(aplikasiSchema),
		defaultValues,
	});

	const tipeApp = form.watch("tipe_app");
	const tipeAppSelectOptions = useMemo(
		() => (isAgent ? tipeAppOptions.filter((option) => option.value === "pelanggan") : tipeAppOptions),
		[isAgent]
	);

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
				pelanggan_id: null,
				user_id: null,
				tanggal_mulai: "",
				tanggal_habis: "",
			});
		} else {
			form.reset(defaultValues);
		}
	}, [dialogOpen, isEdit, initialData, form]);

	useEffect(() => {
		if (!dialogOpen || !isAgent) {
			return;
		}

		form.setValue("tipe_app", "pelanggan");
		if (currentUserId) {
			form.setValue("user_id", String(currentUserId));
		}
	}, [dialogOpen, isAgent, currentUserId, form]);

	useEffect(() => {
		if (tipeApp !== "pelanggan") {
			form.setValue("pelanggan_id", null);
			form.setValue("user_id", null);
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
					form.setValue(
						"pelanggan_id",
						license.pelanggan_id != null ? String(license.pelanggan_id) : null
					);
					form.setValue(
						"user_id",
						license.user_id != null ? String(license.user_id) : null
					);
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
			setIsUploadingAndroid(false);
			setIsUploadingIos(false);
		}
		onOpenChange?.(value);
	};

	const handleClearUploadedFile = useCallback((onChange) => {
		onChange("");
	}, []);

		const uploadFile = useCallback(
			async ({ file, target, onChange, previousPath }) => {
				if (!file) {
					return;
				}

				const currentAppName = form.getValues("nama_app")?.trim();

				if (!currentAppName) {
					toast.error("Isi nama aplikasi terlebih dahulu sebelum mengunggah file.");
					return;
				}

				const extension = file.name.split(".").pop()?.toLowerCase();
				const expectedExtension = target === "android" ? "apk" : "ipa";

				if (extension !== expectedExtension) {
					toast.error(`File ${target === "android" ? "Android" : "iOS"} harus berformat .${expectedExtension}.`);
					return;
				}

				const setUploading = target === "android" ? setIsUploadingAndroid : setIsUploadingIos;

				setUploading(true);

				try {
					const formData = new FormData();
					formData.append("file", file);
					formData.append("appName", currentAppName);

					if (previousPath && previousPath.trim()) {
						formData.append("previousPath", previousPath.trim());
					}

					const response = await fetch("/api/uploads/aplikasi", {
						method: "POST",
						body: formData,
					});

					const payload = await response.json().catch(() => ({}));

					if (!response.ok) {
						throw new Error(payload?.message || "Gagal mengunggah file.");
					}

					const filePath = payload?.data?.path;

					if (!filePath) {
						throw new Error("Respons unggah tidak valid.");
					}

					onChange(filePath);
					toast.success(`File ${target === "android" ? "Android" : "iOS"} berhasil diunggah.`);
				} catch (error) {
					const message = typeof error === "object" && error?.message ? error.message : "Gagal mengunggah file.";
					toast.error(message);
				} finally {
					setUploading(false);
				}
			},
			[form]
		);

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
									<Select value={field.value} onValueChange={field.onChange} disabled={isAgent}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Pilih tipe aplikasi" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{tipeAppSelectOptions.map((option) => (
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
												value={field.value ?? ""}
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
												value={field.value ?? ""}
												onValueChange={field.onChange}
												disabled={isFetchingOptions || userSelectOptions.length === 0 || isAgent}
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
									render={({ field }) => {
										const selectedDate = parseDateString(field.value);
										return (
											<FormItem className="flex flex-col">
												<FormLabel>Tanggal Mulai Lisensi</FormLabel>
												<Popover>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																type="button"
																variant="outline"
																className={cn(
																	"justify-start text-left font-normal",
																	!field.value && "text-muted-foreground"
																)}
															>
																<CalendarIcon className="mr-2 size-4" />
																{selectedDate
																	? dateFormatter.format(selectedDate)
																	: "Pilih tanggal mulai"}
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
														<Calendar
															mode="single"
															selected={selectedDate}
															onSelect={(date) => {
																const nextValue = formatDateInput(date);
																field.onChange(nextValue);
																field.onBlur();
															}}
															initialFocus
														/>
													</PopoverContent>
												</Popover>
												<FormMessage />
											</FormItem>
										);
									}}
								/>

								<FormField
									control={form.control}
									name="tanggal_habis"
									render={({ field }) => {
										const selectedDate = parseDateString(field.value);
										return (
											<FormItem className="flex flex-col">
												<FormLabel>Tanggal Habis Lisensi</FormLabel>
												<Popover>
													<PopoverTrigger asChild>
														<FormControl>
															<Button
																type="button"
																variant="outline"
																className={cn(
																	"justify-start text-left font-normal",
																	!field.value && "text-muted-foreground"
																)}
															>
																<CalendarIcon className="mr-2 size-4" />
																{selectedDate
																	? dateFormatter.format(selectedDate)
																	: "Pilih tanggal habis"}
															</Button>
														</FormControl>
													</PopoverTrigger>
													<PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
														<Calendar
															mode="single"
															selected={selectedDate}
															onSelect={(date) => {
																const nextValue = formatDateInput(date);
																field.onChange(nextValue);
																field.onBlur();
															}}
															initialFocus
														/>
													</PopoverContent>
												</Popover>
												<FormMessage />
											</FormItem>
										);
									}}
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
										<FormLabel>File iOS (.ipa)</FormLabel>
										<FormControl>
											<div className="space-y-3">
												{field.value ? (
													<div className="flex items-center justify-between rounded-md border border-dashed border-muted-foreground/30 px-3 py-2">
														<a
															href={field.value}
															target="_blank"
															rel="noopener noreferrer"
															className="text-sm font-medium text-primary underline-offset-4 hover:underline"
														>
															Unduh file
														</a>
														<Button
															type="button"
															variant="ghost"
															size="sm"
																							onClick={() => handleClearUploadedFile(field.onChange)}
															disabled={isUploadingIos}
														>
															Hapus
														</Button>
													</div>
												) : (
													<p className="text-xs text-muted-foreground">Belum ada file iOS yang diunggah.</p>
												)}
												<div className="flex h-10 items-center gap-3">
													<Input
														type="file"
														accept=".ipa"
														disabled={isUploadingIos}
														onChange={(event) => {
																									const files = event.target.files;

																									if (!files || files.length === 0) {
																										return;
																									}

																									if (files.length > 1) {
																										toast.error("Unggah hanya satu file.");
																										event.target.value = "";
																										return;
																									}

																									const selected = files[0];

																									if (selected) {
																										uploadFile({
																											file: selected,
																											target: "ios",
																											onChange: field.onChange,
																											previousPath: field.value,
																										});
																									}

																									event.target.value = "";
														}}
													/>
													{isUploadingIos ? (
														<p className="text-xs text-muted-foreground">Mengunggah...</p>
													) : null}
												</div>
												<p className="text-xs text-muted-foreground">
													Unggah file berekstensi .ipa. Link unduhan akan tersimpan otomatis.
												</p>
											</div>
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
										<FormLabel>File Android (.apk)</FormLabel>
										<FormControl>
											<div className="space-y-3">
												{field.value ? (
													<div className="flex items-center justify-between rounded-md border border-dashed border-muted-foreground/30 px-3 py-2">
														<a
															href={field.value}
															target="_blank"
															rel="noopener noreferrer"
															className="text-sm font-medium text-primary underline-offset-4 hover:underline"
														>
															Unduh file
														</a>
														<Button
															type="button"
															variant="ghost"
															size="sm"
																							onClick={() => handleClearUploadedFile(field.onChange)}
															disabled={isUploadingAndroid}
														>
															Hapus
														</Button>
													</div>
												) : (
													<p className="text-xs text-muted-foreground">Belum ada file Android yang diunggah.</p>
												)}
												<div className="flex h-10 items-center gap-3">
													<Input
														type="file"
														accept=".apk"
														disabled={isUploadingAndroid}
														onChange={(event) => {
																									const files = event.target.files;

																									if (!files || files.length === 0) {
																										return;
																									}

																									if (files.length > 1) {
																										toast.error("Unggah hanya satu file.");
																										event.target.value = "";
																										return;
																									}

																									const selected = files[0];

																									if (selected) {
																										uploadFile({
																											file: selected,
																											target: "android",
																											onChange: field.onChange,
																											previousPath: field.value,
																										});
																									}

																									event.target.value = "";
														}}
													/>
													{isUploadingAndroid ? (
														<p className="text-xs text-muted-foreground">Mengunggah...</p>
													) : null}
												</div>
												<p className="text-xs text-muted-foreground">
													Unggah file berekstensi .apk. Link unduhan akan tersimpan otomatis.
												</p>
											</div>
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
