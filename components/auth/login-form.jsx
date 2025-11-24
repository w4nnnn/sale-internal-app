"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/post-login",
      });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push("/post-login");
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Akses dashboard internal dengan akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginForm;
