import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — FindBack" },
      { name: "description", content: "Choose a new password for your FindBack account." },
      { property: "og:title", content: "Reset password — FindBack" },
      { property: "og:description", content: "Choose a new password for your FindBack account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter a new password for your FindBack account.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" variant="hero" className="w-full" disabled={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
