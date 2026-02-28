/**
 * Session type for BobrChat auth.
 */
export type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};
