"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const profileSchema = z
  .object({
    nama_user: z
      .string({ required_error: "Nama wajib diisi." })
      .trim()
      .min(1, "Nama wajib diisi."),
    username: z
      .string({ required_error: "Username wajib diisi." })
      .trim()
      .min(3, "Username minimal 3 karakter.")
      .regex(/\S+/, "Username tidak boleh mengandung spasi."),
    email_user: z
      .string({ required_error: "Email wajib diisi." })
      .trim()
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    telepon_user: z
      .string({ required_error: "Nomor telepon wajib diisi." })
      .trim()
      .min(1, "Nomor telepon wajib diisi."),
    role: z.enum(["agen", "admin"]),
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

export function SelfUserDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
  onDeleted,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      return;
    }

    setConfirmDeleteOpen(false);
    setIsLoading(false);
    form.reset(defaultValues);
  }, [open, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialData = {
      nama_user: user?.name ?? user?.nama_user ?? "",
      username: user?.username ?? "",
      email_user: user?.email ?? user?.email_user ?? "",
      telepon_user: user?.telepon_user ?? "",
      role: user?.role ?? "agen",
      password: "",
      confirm_password: "",
    };

    form.reset(initialData);

    const userId = user?.user_id ?? user?.id;

    if (!userId) {
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Gagal memuat data pengguna.");
        }
        const data = payload?.data;

        if (data) {
          form.reset({
            nama_user: data.nama_user ?? "",
            username: data.username ?? "",
            email_user: data.email_user ?? "",
            telepon_user: data.telepon_user ?? "",
            role: data.role ?? "agen",
            password: "",
            confirm_password: "",
          });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        toast.error(error?.message || "Gagal memuat data pengguna.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      controller.abort();
    };
  }, [open, user, form]);

  const handleDialogChange = (value) => {
    onOpenChange?.(value);
  };

  const handleSubmit = async (values) => {
    if (!user?.id && !user?.user_id) {
      toast.error("Data pengguna tidak valid.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userId = user.user_id ?? user.id;
      const payload = {
        nama_user: values.nama_user.trim(),
        username: values.username.trim(),
        email_user: values.email_user.trim(),
        telepon_user: values.telepon_user.trim(),
        role: values.role,
      };

      const password = values.password?.trim() ?? "";
      if (password.length > 0) {
        payload.password = password;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Gagal memperbarui profil.");
      }

      const result = await response.json();
      toast.success("Profil berhasil diperbarui.");
      handleDialogChange(false);
      onUpdated?.(result?.data ?? null);
    } catch (error) {
      toast.error(error.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id && !user?.user_id) {
      toast.error("Data pengguna tidak valid.");
      return;
    }

    setIsDeleting(true);

    try {
      const userId = user.user_id ?? user.id;
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Gagal menghapus akun.");
      }

      toast.success("Akun berhasil dihapus.");
      setConfirmDeleteOpen(false);
      handleDialogChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error.message || "Terjadi kesalahan saat menghapus akun.");
    } finally {
      setIsDeleting(false);
    }
  };

  const submitLabel = isSubmitting ? "Menyimpan..." : "Simpan Perubahan";
  const isFormBusy = isSubmitting || isLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg" aria-busy={isLoading}>
        <DialogHeader>
          <DialogTitle>Pengaturan Akun</DialogTitle>
          <DialogDescription>
            Ubah informasi profil Anda atau perbarui kata sandi secara mandiri.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="self-user-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="nama_user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input placeholder="Nama Lengkap" disabled={isFormBusy} {...field} />
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
                    <Input placeholder="Username" disabled={isFormBusy} {...field} />
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
                    <Input type="email" placeholder="Email Pengguna" disabled={isFormBusy} {...field} />
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
                    <Input placeholder="Nomor Telepon" disabled={isFormBusy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kata Sandi Baru</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Kosongkan jika tidak ingin mengubah" disabled={isFormBusy} {...field} />
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
                      <Input type="password" placeholder="Ulangi kata sandi baru" disabled={isFormBusy} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isSubmitting || isDeleting || isLoading}
          >
            Hapus Akun
          </Button>
          <Button type="submit" form="self-user-form" disabled={isFormBusy}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus akun Anda secara permanen. Anda perlu menghubungi admin untuk mendapatkan akses kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting || isLoading}>
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SelfUserDialog;
