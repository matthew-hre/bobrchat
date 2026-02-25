import BoringAvatar from "boring-avatars";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

type UserAvatarProps = {
  session: {
    user: {
      name: string;
      email: string;
      image?: string | null;
    };
  } | null;
};

export function UserAvatar({ session }: UserAvatarProps) {
  return (
    <Avatar className="size-24">
      <AvatarImage
        src={session?.user?.image || undefined}
        alt={session?.user?.name || "User"}
      />
      <AvatarFallback className="bg-transparent p-0">
        <BoringAvatar
          size={96}
          name={session?.user?.name || "user"}
          variant="beam"
          colors={["#F92672", "#A1EFE4", "#FD971F", "#E6DB74", "#66D9EF"]}
        />
      </AvatarFallback>
    </Avatar>
  );
}
