"use client";

import { useEffect, useState } from "react";
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

const roleOptions = [
	{ value: "agen", label: "Agen" },
	{ value: "admin", label: "Admin" },
];

// Fungsi untuk normalisasi nomor telepon ke format internasional (Indonesia)
function normalizePhone(phone) {
	if (!phone) return null;
	// Hapus spasi, dash, dll
	phone = phone.replace(/[\s\-\(\)]/g, '');
	if (phone.startsWith('0')) {
		return '62' + phone.slice(1);
	}
	if (phone.startsWith('+62')) {
		return phone.slice(1);
	}
	return phone;
}

const userSchema = z
	.object({
		nama_user: z
			.string({ required_error: "Nama user wajib diisi." })
			.trim()
			.min(1, "Nama user wajib diisi."),
		username: z
			.string({ required_error: "Username wajib diisi." })
			.trim()
			.min(3, "Username minimal 3 karakter.")
			.regex(/^\S+$/, "Username tidak boleh mengandung spasi."),
		email_user: z
			.string()
			.trim()
			.optional()
			.refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
				message: "Format email tidak valid.",
			}),
		telepon_user: z.string().trim().optional(),
		role: z.enum(["agen", "admin"], {
			required_error: "Role wajib dipilih.",
		}),
		password: z.string().optional(),
		confirm_password: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		const password = data.password?.trim() ?? "";
		const confirm = data.confirm_password?.trim() ?? "";

		if (password.length > 0) {
			if (password.length < 8) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["password"],
					message: "Kata sandi minimal 8 karakter.",
				});
			}

			if (password !== confirm) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["confirm_password"],
					message: "Konfirmasi kata sandi tidak sama.",
				});
			}
		} else if (confirm.length > 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["password"],
				message: "Isi kata sandi terlebih dahulu.",
			});
		}
	});

const defaultValues = {
	nama_user: "",
	username: "",
	email_user: "",
	telepon_user: "",
	role: "agen",
	password: "",
	confirm_password: "",
};

export function FormUserDialog({ onSuccess, open, onOpenChange, mode = "create", initialData }) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);
	const [drafts, setDrafts] = useState({ create: null, edit: {} });

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;
	const isEdit = mode === "edit" && initialData?.user_id;

	const form = useForm({
		resolver: zodResolver(userSchema),
		defaultValues,
	});

	useEffect(() => {
		if (!dialogOpen) {
			return;
		}

		if (isEdit && initialData) {
			const draft = drafts.edit?.[initialData.user_id];
			if (draft) {
				form.reset(draft);
				return;
			}

			form.reset({
				nama_user: initialData.nama_user ?? "",
				username: initialData.username ?? "",
				email_user: initialData.email_user ?? "",
				telepon_user: initialData.telepon_user ?? "",
				role: initialData.role ?? "agen",
				password: "",
				confirm_password: "",
			});
			return;
		}

		if (drafts.create) {
			form.reset(drafts.create);
		} else {
			form.reset(defaultValues);
		}
	}, [dialogOpen, isEdit, initialData, form, drafts]);

	const handleDialogChange = (value, options = {}) => {
		const { discardDraft = false } = options;
		if (!isControlled) {
			setInternalOpen(value);
		}

		if (!value) {
			const currentValues = form.getValues();
			const draftKey = isEdit && initialData?.user_id ? initialData.user_id : null;

			if (!discardDraft) {
				setDrafts((previous) => {
					if (draftKey !== null) {
						return {
							...previous,
							edit: {
								...previous.edit,
								[draftKey]: currentValues,
							},
						};
					}

					return {
						...previous,
						create: currentValues,
					};
				});
			} else if (draftKey !== null) {
				setDrafts((previous) => {
					if (!previous.edit?.[draftKey]) {
						return previous;
					}

					const { [draftKey]: _removed, ...rest } = previous.edit;
					return {
						...previous,
						edit: rest,
					};
				});
			} else {
				setDrafts((previous) => ({ ...previous, create: null }));
			}

			form.reset(defaultValues);
		}
		onOpenChange?.(value);
	};

	const handleSubmit = async (values) => {
		setIsSubmitting(true);

		const trimmedPassword = values.password?.trim() ?? "";

		if (!isEdit && trimmedPassword.length === 0) {
			form.setError("password", {
				type: "manual",
				message: "Kata sandi wajib diisi untuk user baru.",
			});
			setIsSubmitting(false);
			return;
		}

		try {
			const payload = {
				nama_user: values.nama_user.trim(),
				username: values.username.trim(),
				email_user: values.email_user?.trim() || null,
				telepon_user: normalizePhone(values.telepon_user?.trim()),
				role: values.role,
			};

			if (trimmedPassword.length > 0) {
				payload.password = trimmedPassword;
			}

			const endpoint = isEdit ? `/api/users/${initialData.user_id}` : "/api/users";
			const method = isEdit ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menyimpan data pengguna.");
			}

			const result = await response.json();
			toast.success(isEdit ? "Pengguna berhasil diperbarui." : "Pengguna berhasil disimpan.");
			handleDialogChange(false, { discardDraft: true });

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
			: "Simpan Pengguna";

	return (
		<Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Perbarui informasi pengguna lalu simpan perubahan."
							: "Isi formulir berikut untuk menambahkan pengguna baru."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						id="user-form"
						onSubmit={form.handleSubmit(handleSubmit)}
						className="grid gap-6"
					>
						<FormField
							control={form.control}
							name="nama_user"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nama Lengkap</FormLabel>
									<FormControl>
										<Input placeholder="Nama Lengkap" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input placeholder="Username" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email_user"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Email Pengguna" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="telepon_user"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nomor Telepon</FormLabel>
									<FormControl>
										<Input placeholder="Nomor Telepon" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Pilih role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{roleOptions.map((option) => (
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

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Kata Sandi {isEdit ? "Baru" : ""}</FormLabel>
									<FormControl>
										<Input type="password" placeholder={isEdit ? "Biarkan kosong jika tidak ingin mengubah" : "Minimal 8 karakter"} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirm_password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Konfirmasi Kata Sandi</FormLabel>
									<FormControl>
										<Input type="password" placeholder="Ulangi kata sandi" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>
				<DialogFooter>
					<Button type="submit" form="user-form" disabled={isSubmitting}>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default FormUserDialog;
