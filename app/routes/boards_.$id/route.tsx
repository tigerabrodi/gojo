import type { LinksFunction, LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { invariant } from "@epic-web/invariant";
import { useLoaderData } from "@remix-run/react";
import { RoomProvider } from "~/liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import styles from "./styles.css";
import { Kakashi } from "~/icons";

export const handle = {
  shouldHideRootNavigation: true,
};

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ params, request }: LoaderFunctionArgs) {
  await requireAuthCookie(request);

  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  return json({
    boardId,
  });
}

function SuspenseFallback() {
  return (
    <main>
      <Kakashi className="suspense-fallback-loader" />
    </main>
  );
}

export default function BoardRoute() {
  const { boardId } = useLoaderData<typeof loader>();

  return (
    <RoomProvider
      id={boardId}
      initialPresence={{ cursor: null }}
      initialStorage={{
        cards: new LiveList(),
      }}
    >
      <ClientSideSuspense fallback={<SuspenseFallback />}>
        {() => <Board />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function Board() {
  return <div>Board</div>;
}
