import { authRelations } from "./auth";
import { userSettingsRelations } from "./settings";

export * from "./auth";
export * from "./chat";
export * from "./keys";
export * from "./settings";
export * from "./sharing";

export const relations = {
  ...authRelations,
  ...userSettingsRelations,
};
