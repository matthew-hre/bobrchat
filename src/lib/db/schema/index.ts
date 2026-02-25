import { userSettingsRelations } from "./settings";

export * from "./auth";
export * from "./chat";
export * from "./keys";
export * from "./models";
export * from "./settings";
export * from "./sharing";
export * from "./subscriptions";

export const relations = {
  ...userSettingsRelations,
};
