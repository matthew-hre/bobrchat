import { authRelations } from "./auth";
import { userSettingsRelations } from "./settings";

export * from "./auth";
export * from "./chat";
export * from "./settings";
export * from "./sharing";
export * from "./keys";

export const relations = {
  ...authRelations,
  ...userSettingsRelations,
};
