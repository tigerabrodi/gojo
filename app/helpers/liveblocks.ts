import { Liveblocks } from "@liveblocks/node";
import { env } from "./env";

export const liveblocks = new Liveblocks({
  secret: env.LIVEBLOCKS_SECRET_KEY,
});
