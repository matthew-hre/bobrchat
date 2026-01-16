"use client";

import { LoaderIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { authClient, useSession } from "~/features/auth/lib/auth-client";
import { cn } from "~/lib/utils";

export function ProfileTab() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <ProfileTabSkeleton />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <h3 className="text-lg font-semibold">Profile</h3>
        <p className="text-muted-foreground text-sm">
          Manage your account details and personal information.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-20">
              <AvatarImage
                src={session?.user?.image || undefined}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback
                className={cn(`
                  from-primary/20 to-primary/5 ring-primary/20 bg-linear-to-br
                  text-lg ring-2
                `)}
              >
                {session?.user?.name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-center text-xl font-medium">
                {session?.user?.name || "Unnamed User"}
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                {session?.user?.email || "No email available"}
              </p>
            </div>
          </div>

          <Separator />

          <ChangeNameSection
            currentName={session?.user?.name || ""}
          />

          <Separator />

          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}

function ChangeNameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const hasChanges = name !== currentName && name.trim() !== "";

  const handleSave = async () => {
    if (!hasChanges)
      return;

    setLoading(true);
    const { error } = await authClient.updateUser({
      name: name.trim(),
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to update name");
      return;
    }

    toast.success("Name updated successfully");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="name">Display Name</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button
          onClick={handleSave}
          disabled={!hasChanges || loading}
          className="shrink-0"
        >
          {loading
            ? <LoaderIcon className="size-4 animate-spin" />
            : "Save"}
        </Button>
      </div>
    </div>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete)
      return;

    setLoading(true);
    const { error } = await authClient.deleteUser();
    setLoading(false);

    if (error) {
      toast.error(error.message || "Failed to delete account");
      return;
    }

    toast.success("Account deleted successfully");
    router.push("/auth");
  };

  return (
    <div className="space-y-2">
      <Label className="text-destructive">Danger Zone</Label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="text-destructive size-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data, including chats, settings, and preferences will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type
              {" "}
              <span className="font-mono font-bold">DELETE</span>
              {" "}
              to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || loading}
            >
              {loading
                ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Deleting...
                    </>
                  )
                : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className="text-muted-foreground text-xs">
        Permanently delete your account and all associated data.
      </p>
    </div>
  );
}

function ProfileTabSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-6">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
