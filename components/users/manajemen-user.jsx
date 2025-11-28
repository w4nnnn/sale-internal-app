"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon, PlusIcon, RefreshCwIcon, TrashIcon, UserCogIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { FormUserDialog } from "./form-user";

export function ManajemenUser() {
	const [data, setData] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState("create");
	const [selectedUser, setSelectedUser] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/users");

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal memuat data pengguna.");
			}

			const payload = await response.json();
			setData(Array.isArray(payload?.data) ? payload.data : []);
		} catch (err) {
			const message = err.message || "Terjadi kesalahan saat memuat data pengguna.";
			setError(message);
			toast.error(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleDialogSuccess = (result, meta) => {
		if (!result?.data) {
			return;
		}

		if (meta?.mode === "edit") {
			setData((previous) =>
				previous.map((item) => (item.user_id === result.data.user_id ? result.data : item))
			);
		} else {
			setData((previous) => [result.data, ...previous]);
		}
	};

	const handleDialogOpenChange = (value) => {
		setDialogOpen(value);
		if (!value) {
			setSelectedUser(null);
			setDialogMode("create");
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget?.user_id) {
			return;
		}

		setIsDeleting(true);

		try {
			const response = await fetch(`/api/users/${deleteTarget.user_id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menghapus pengguna.");
			}

			setData((previous) => previous.filter((item) => item.user_id !== deleteTarget.user_id));
			toast.success("Pengguna berhasil dihapus.");
			setDeleteTarget(null);
		} catch (err) {
			toast.error(err.message || "Terjadi kesalahan saat menghapus pengguna.");
		} finally {
			setIsDeleting(false);
		}
	};

	const renderStatusRow = (message) => (
		<TableRow>
			<TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
				{message}
			</TableCell>
		</TableRow>
	);

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2 text-muted-foreground">
					<UserCogIcon className="size-5" />
					<span>Kelola akun internal dan hak akses.</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" variant="outline" onClick={fetchData} disabled={isLoading}>
						<RefreshCwIcon className="size-4" />
						Muat Ulang
					</Button>
					<Button
						type="button"
						onClick={() => {
							setDialogMode("create");
							setSelectedUser(null);
							setDialogOpen(true);
						}}
					>
						<PlusIcon className="size-4" />
						Tambah Pengguna
					</Button>
				</div>
			</header>

			<div className="rounded-xl border bg-white shadow-sm p-1">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>No</TableHead>
							<TableHead>Nama</TableHead>
							<TableHead>Username</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Telepon</TableHead>
							<TableHead className="text-center">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && renderStatusRow("Memuat data pengguna...")}
						{!isLoading && error && renderStatusRow(error)}
						{!isLoading && !error && data.length === 0 &&
							renderStatusRow("Belum ada data pengguna.")}
						{!isLoading && !error &&
							data.map((item, index) => (
								<TableRow key={item.user_id ?? `${item.username}-${index}`}>
									<TableCell>{index + 1}</TableCell>
									<TableCell className="font-medium">{item.nama_user}</TableCell>
									<TableCell>{item.username}</TableCell>
									<TableCell>{item.email_user}</TableCell>
									<TableCell className="capitalize">
										{item.role.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}
									</TableCell>
									<TableCell>{item.telepon_user ?? "-"}</TableCell>
									<TableCell className="text-center">
										<div className="flex justify-center gap-2">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => {
													setDialogMode("edit");
													setSelectedUser(item);
													setDialogOpen(true);
												}}
											>
												<PencilIcon className="size-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => setDeleteTarget(item)}
											>
												<TrashIcon className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</div>

			<FormUserDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				mode={dialogMode}
				initialData={selectedUser}
				onSuccess={handleDialogSuccess}
			/>

			<AlertDialog
				open={Boolean(deleteTarget)}
				onOpenChange={(value) => {
					if (!value) {
						setDeleteTarget(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
						<AlertDialogDescription>
							{`Akun "${deleteTarget?.nama_user ?? ""}" akan dihapus secara permanen.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
							{isDeleting ? "Menghapus..." : "Hapus"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}

export default ManajemenUser;
