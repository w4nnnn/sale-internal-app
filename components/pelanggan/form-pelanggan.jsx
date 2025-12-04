"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormControl,
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

const pelangganSchema = z.object({
	nama_pelanggan: z
		.string({ required_error: "Nama pelanggan wajib diisi." })
		.trim()
		.min(1, "Nama pelanggan wajib diisi."),
	email_pelanggan: z
		.string()
		.trim()
		.optional()
		.refine(
			(value) => !value || value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			"Email tidak valid."
		),
	perusahaan: z.string().trim().optional(),
	telepon_pelanggan: z.string().trim().optional(),
});

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

const defaultValues = {
	nama_pelanggan: "",
	email_pelanggan: "",
	perusahaan: "",
	telepon_pelanggan: "",
};

export function FormPelangganDialog({ onSuccess, open, onOpenChange, mode = "create", initialData }) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);
	const [drafts, setDrafts] = useState({ create: null, edit: {} });

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;
	const isEdit = mode === "edit" && initialData?.pelanggan_id;

	const form = useForm({
		resolver: zodResolver(pelangganSchema),
		defaultValues,
	});

	useEffect(() => {
		if (!dialogOpen) {
			return;
		}

		if (isEdit && initialData) {
			const draft = drafts.edit?.[initialData.pelanggan_id];
			if (draft) {
				form.reset(draft);
				return;
			}

			form.reset({
				nama_pelanggan: initialData.nama_pelanggan ?? "",
				email_pelanggan: initialData.email_pelanggan ?? "",
				perusahaan: initialData.perusahaan ?? "",
				telepon_pelanggan: initialData.telepon_pelanggan ?? "",
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
			const draftKey = isEdit && initialData?.pelanggan_id ? initialData.pelanggan_id : null;

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

		try {
			const payload = {
				nama_pelanggan: values.nama_pelanggan.trim(),
				email_pelanggan: values.email_pelanggan?.trim() || null,
				perusahaan: values.perusahaan?.trim() || null,
				telepon_pelanggan: normalizePhone(values.telepon_pelanggan?.trim()),
			};

			const endpoint = isEdit ? `/api/pelanggan/${initialData.pelanggan_id}` : "/api/pelanggan";
			const method = isEdit ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menyimpan data pelanggan.");
			}

			const result = await response.json();
			toast.success(isEdit ? "Pelanggan berhasil diperbarui." : "Pelanggan berhasil disimpan.");
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
			: "Simpan Pelanggan";

	return (
		<Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Perbarui informasi pelanggan lalu simpan perubahan."
							: "Isi formulir berikut untuk menambahkan pelanggan baru."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						id="pelanggan-form"
						onSubmit={form.handleSubmit(handleSubmit)}
						className="grid gap-6"
					>
						<FormField
							control={form.control}
							name="nama_pelanggan"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nama Pelanggan</FormLabel>
									<FormControl>
										<Input placeholder="Nama Pelanggan" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email_pelanggan"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Email Pelanggan" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="perusahaan"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Perusahaan</FormLabel>
									<FormControl>
										<Input placeholder="Perusahaan" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="telepon_pelanggan"
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
					</form>
				</Form>
				<DialogFooter>
					<Button type="submit" form="pelanggan-form" disabled={isSubmitting}>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default FormPelangganDialog;
