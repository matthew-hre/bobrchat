/**
 * Session type for BobrChat auth.
 */
export type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    token: string;
    userId: string;
    expiresAt: Date;
  };
};
