import BoringAvatar from "boring-avatars";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

type UserAvatarProps = {
  session: {
    user: {
      name: string;
      email: string;
      image?: string | null;
    };
  } | null;
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: "size-10",
  lg: "size-24",
};

const boringAvatarSizes = {
  sm: 40,
  lg: 96,
};

export function UserAvatar({ session, size = "lg" }: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size])}>
      <AvatarImage
        src={session?.user?.image || undefined}
        alt={session?.user?.name || "User"}
      />
      <AvatarFallback className="bg-transparent p-0">
        <BoringAvatar
          size={boringAvatarSizes[size]}
          name={session?.user?.email || "user"}
          variant="beam"
          colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
        />
      </AvatarFallback>
    </Avatar>
  );
}
