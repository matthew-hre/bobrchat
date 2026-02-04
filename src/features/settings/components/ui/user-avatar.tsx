import { Avatar } from "~/components/ui/avatar";
import BoringAvatar from "boring-avatars";
import { AvatarFallback } from "~/components/ui/avatar";
import { AvatarImage } from "~/components/ui/avatar";
import { Session } from "~/features/auth/lib/auth";


export function UserAvatar({ session }: { session: Session | null }) {
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