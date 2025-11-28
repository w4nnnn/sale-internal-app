"use client";

import { useCallback, useEffect, useState } from "react";
import {
	ExternalLinkIcon,
	LayoutDashboardIcon,
	PencilIcon,
	PlusIcon,
	RefreshCwIcon,
	TrashIcon,
} from "lucide-react";
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

import { FormAplikasiDialog } from "./form-aplikasi";
import DetailAplikasiDialog from "./detail-aplikasi";

export function ManajemenAplikasi({ currentUser }) {
	const [data, setData] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState("create");
	const [selectedAplikasi, setSelectedAplikasi] = useState(null);
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailAplikasi, setDetailAplikasi] = useState(null);
	const canManage = currentUser?.role === "admin";

	const fetchData = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/aplikasi");

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal memuat data aplikasi.");
			}

			const payload = await response.json();
			setData(Array.isArray(payload?.data) ? payload.data : []);
		} catch (err) {
			const message = err.message || "Terjadi kesalahan saat memuat data aplikasi.";
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
				previous.map((item) => (item.app_id === result.data.app_id ? result.data : item))
			);
		} else {
			setData((previous) => [result.data, ...previous]);
		}
	};

	const handleDialogOpenChange = (value) => {
		setDialogOpen(value);
		if (!value) {
			setSelectedAplikasi(null);
			setDialogMode("create");
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget?.app_id) {
			return;
		}

		setIsDeleting(true);

		try {
			const response = await fetch(`/api/aplikasi/${deleteTarget.app_id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error(errorPayload?.message || "Gagal menghapus aplikasi.");
			}

			setData((previous) => previous.filter((item) => item.app_id !== deleteTarget.app_id));
			toast.success("Aplikasi berhasil dihapus.");
			setDeleteTarget(null);
		} catch (err) {
			toast.error(err.message || "Terjadi kesalahan saat menghapus aplikasi.");
		} finally {
			setIsDeleting(false);
		}
	};

	const renderStatusRow = (message) => (
		<TableRow>
			<TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
				{message}
			</TableCell>
		</TableRow>
	);

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2 text-muted-foreground">
					<LayoutDashboardIcon className="size-5" />
					<span>Kelola daftar aplikasi beserta detail distribusinya.</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" variant="outline" onClick={fetchData} disabled={isLoading}>
						<RefreshCwIcon className="size-4" />
						Muat Ulang
					</Button>
					{canManage ? (
						<Button
							type="button"
							onClick={() => {
								setDialogMode("create");
								setSelectedAplikasi(null);
								setDialogOpen(true);
							}}
						>
							<PlusIcon className="size-4" />
							Tambah Aplikasi
						</Button>
					) : null}
				</div>
			</header>

			<div className="rounded-xl border bg-white shadow-sm p-1">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>No</TableHead>
							<TableHead>Nama</TableHead>
							<TableHead>Tipe</TableHead>
							<TableHead>Deskripsi</TableHead>
							<TableHead>Link Web</TableHead>
							<TableHead>Path iOS</TableHead>
							<TableHead>Path Android</TableHead>
							<TableHead className="text-center">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading && renderStatusRow("Memuat data aplikasi...")}
						{!isLoading && error && renderStatusRow(error)}
						{!isLoading && !error && data.length === 0 &&
							renderStatusRow("Belum ada data aplikasi.")}
						{!isLoading && !error &&
							data.map((item, index) => (
								<TableRow
									key={item.app_id ?? `${item.nama_app}-${index}`}
									onClick={() => {
										setDetailAplikasi(item);
										setDetailOpen(true);
									}}
									className="cursor-pointer transition-colors hover:bg-muted/50"
								>
									<TableCell>{index + 1}</TableCell>
									<TableCell className="font-medium">{item.nama_app}</TableCell>
									<TableCell className="capitalize">{item.tipe_app}</TableCell>
									<TableCell className="max-w-xs whitespace-normal text-muted-foreground">
										{item.deskripsi ?? "-"}
									</TableCell>
									<TableCell>
										{item.link_web ? (
											<a
												href={item.link_web}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(event) => event.stopPropagation()}
												className="inline-flex items-center gap-1 text-primary hover:underline"
											>
												<ExternalLinkIcon className="size-4" />
												Kunjungi
											</a>
										) : (
											"-"
										)}
									</TableCell>
									<TableCell>{item.path_ios ?? "-"}</TableCell>
									<TableCell>{item.path_android ?? "-"}</TableCell>
									<TableCell className="text-center">
										{canManage ? (
											<div className="flex justify-center gap-2">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={(event) => {
														event.stopPropagation();
														setDialogMode("edit");
														setSelectedAplikasi(item);
														setDialogOpen(true);
													}}
												>
													<PencilIcon className="size-4" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={(event) => {
														event.stopPropagation();
														setDeleteTarget(item);
													}}
												>
													<TrashIcon className="size-4" />
												</Button>
											</div>
										) : (
											<span className="text-muted-foreground text-sm">-</span>
										)}
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</div>

			<DetailAplikasiDialog
				open={detailOpen}
				aplikasi={detailAplikasi}
				onOpenChange={(value) => {
					setDetailOpen(value);
					if (!value) {
						setDetailAplikasi(null);
					}
				}}
			/>

			<FormAplikasiDialog
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				mode={dialogMode}
				initialData={selectedAplikasi}
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
						<AlertDialogTitle>Hapus aplikasi?</AlertDialogTitle>
						<AlertDialogDescription>
							Aplikasi &quot;{deleteTarget?.nama_app}&quot; akan dihapus secara permanen.
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

export default ManajemenAplikasi;
