import { authRelations } from "./auth";
import { userSettingsRelations } from "./settings";

export * from "./auth";
export * from "./chat";
export * from "./settings";

export const relations = {
  ...authRelations,
  ...userSettingsRelations,
};
