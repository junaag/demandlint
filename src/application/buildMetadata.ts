import { createBuildMetadata } from "./buildMetadataFactory";
export type { BuildMetadata } from "./buildMetadataFactory";

declare const __DEMANDLINT_VERSION__: string;
declare const __DEMANDLINT_GIT_SHA__: string;

export const embeddedBuildMetadata = createBuildMetadata(
  __DEMANDLINT_VERSION__,
  __DEMANDLINT_GIT_SHA__,
);
