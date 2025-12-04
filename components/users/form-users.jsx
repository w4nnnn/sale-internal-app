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
			.string({ required_error: "Email wajib diisi." })
			.trim()
			.min(1, "Email wajib diisi.")
			.email("Format email tidak valid."),
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
			form.reset({
				nama_user: initialData.nama_user ?? "",
				username: initialData.username ?? "",
				email_user: initialData.email_user ?? "",
				telepon_user: initialData.telepon_user ?? "",
				role: initialData.role ?? "agen",
				password: "",
				confirm_password: "",
			});
		} else {
			form.reset(defaultValues);
		}
	}, [dialogOpen, isEdit, initialData, form]);

	const handleDialogChange = (value) => {
		if (!isControlled) {
			setInternalOpen(value);
		}
		if (!value) {
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
				email_user: values.email_user.trim(),
				telepon_user: values.telepon_user?.trim() || null,
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
			form.reset(defaultValues);
			toast.success(isEdit ? "Pengguna berhasil diperbarui." : "Pengguna berhasil disimpan.");
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
