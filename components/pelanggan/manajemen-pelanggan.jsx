"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon, PlusIcon, RefreshCwIcon, TrashIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import { FormPelangganDialog } from "./form-pelanggan";
import { DetailPelangganDialog } from "./detail-pelanggan";

export function ManajemenPelanggan() {
	const [data, setData] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState("create");
	const [selectedPelanggan, setSelectedPelanggan] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [selectedPelangganDetail, setSelectedPelangganDetail] = useState(null);
	const [openDetail, setOpenDetail] = useState(false);

	const fetchData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/pelanggan");

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal memuat data pelanggan.");
			}

			const payload = await response.json();
			setData(Array.isArray(payload?.data) ? payload.data : []);
		} catch (err) {
			setError(err.message || "Terjadi kesalahan saat memuat data pelanggan.");
			toast.error(err.message || "Terjadi kesalahan saat memuat data pelanggan.");
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
				previous.map((item) =>
					item.pelanggan_id === result.data.pelanggan_id ? result.data : item
				)
			);
		} else {
			setData((previous) => [result.data, ...previous]);
		}
	};

	const handleDialogOpenChange = (value) => {
		setDialogOpen(value);
		if (!value) {
			setSelectedPelanggan(null);
			setDialogMode("create");
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget?.pelanggan_id) {
			return;
		}

		setIsDeleting(true);

		try {
			const response = await fetch(`/api/pelanggan/${deleteTarget.pelanggan_id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menghapus pelanggan.");
			}

			setData((previous) =>
				previous.filter((item) => item.pelanggan_id !== deleteTarget.pelanggan_id)
			);
			toast.success("Pelanggan berhasil dihapus.");
			setDeleteTarget(null);
		} catch (err) {
			toast.error(err.message || "Terjadi kesalahan saat menghapus pelanggan.");
		} finally {
			setIsDeleting(false);
		}
	};

	const renderStatusRow = (message) => (
		<TableRow>
			<TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
				{message}
			</TableCell>
		</TableRow>
	);

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2 text-muted-foreground">
					<UsersIcon className="size-5" />
					<span>Kelola data pelanggan dan informasi kontak.</span>
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
							setSelectedPelanggan(null);
							setDialogOpen(true);
						}}
					>
						<PlusIcon className="size-4" />
						Tambah Pelanggan
					</Button>
				</div>
			</header>

			<div className="rounded-xl border bg-white shadow-sm p-1">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>No</TableHead>
							<TableHead>Nama Pelanggan</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Perusahaan</TableHead>
							<TableHead>Nomor Telepon</TableHead>
							<TableHead className="text-center">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && renderStatusRow("Memuat data pelanggan...")}
						{!isLoading && error && renderStatusRow(error)}
						{!isLoading && !error && data.length === 0 &&
							renderStatusRow("Belum ada data pelanggan.")}
						{!isLoading && !error &&
							data.map((item, index) => (
								<TableRow
									key={item.pelanggan_id ?? `${item.nama_pelanggan}-${index}`}
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => {
										setSelectedPelangganDetail(item);
										setOpenDetail(true);
									}}
								>
									<TableCell>{index + 1}</TableCell>
									<TableCell className="font-medium">{item.nama_pelanggan}</TableCell>
									<TableCell>{item.email_pelanggan ?? "-"}</TableCell>
									<TableCell>{item.perusahaan ?? "-"}</TableCell>
									<TableCell>{item.telepon_pelanggan ?? "-"}</TableCell>
									<TableCell className="text-center">
										<div className="flex justify-center gap-2">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation();
													setDialogMode("edit");
													setSelectedPelanggan(item);
													setDialogOpen(true);
												}}
											>
												<PencilIcon className="size-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation();
													setDeleteTarget(item);
												}}
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

			<FormPelangganDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				mode={dialogMode}
				initialData={selectedPelanggan}
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
						<AlertDialogTitle>Hapus pelanggan?</AlertDialogTitle>
						<AlertDialogDescription>
							Pelanggan &quot;{deleteTarget?.nama_pelanggan}&quot; akan dihapus secara permanen.
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

			<DetailPelangganDialog
				open={openDetail}
				onOpenChange={setOpenDetail}
				pelanggan={selectedPelangganDetail}
			/>
		</section>
	);
}

export default ManajemenPelanggan;
