import type { LiveList, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { CardType } from "./helpers";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

export type Storage = {
  cards: LiveList<LiveObject<CardType>>;
  boardName: string;
};

type UserMeta = {
  id: string;
  info: {
    email: string;
  };
};

export const {
  suspense: {
    RoomProvider,
    useOthers,
    useSelf,
    useMyPresence,
    useStorage,
    useMutation,
    useStatus,
  },
} = createRoomContext<Presence, Storage, UserMeta>(client);
