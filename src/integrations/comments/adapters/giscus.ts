import { builtinCapabilities } from "../capabilities";
import type { CommentAdapterFactory } from "../types";
import { mountFrame } from "../frame-client";
const createGiscus: CommentAdapterFactory = (settings) => ({
  id: "giscus",
  capabilities: builtinCapabilities.giscus,
  mount: (context) => mountFrame(settings, context),
});
export default createGiscus;
