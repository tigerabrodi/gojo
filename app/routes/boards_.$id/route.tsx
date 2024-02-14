import type { LinksFunction, LoaderFunctionArgs } from "@vercel/remix";
import { json } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { invariant } from "@epic-web/invariant";
import { Link, useLoaderData } from "@remix-run/react";
import { RoomProvider } from "~/liveblocks.config";
import { LiveList } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import styles from "./styles.css";
import { Kakashi } from "~/icons";
import { NAVIGATION_PORTAL_ID } from "~/components";
import { createPortal } from "react-dom";
import { updateBoardLastOpenedAt } from "./queries";

export const handle = {
  shouldHideRootNavigation: true,
};

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ params, request }: LoaderFunctionArgs) {
  await requireAuthCookie(request);

  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  await updateBoardLastOpenedAt(boardId);

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
  const { boardId } = useLoaderData<typeof loader>();

  const navigationPortal = document.getElementById(NAVIGATION_PORTAL_ID)!;

  return (
    <>
      <main>
        <h1>Board: {boardId}</h1>
        <Link to="/">Go back home</Link>
      </main>

      {createPortal(
        <>
          <input
            placeholder="Vacation trips"
            aria-label="Enter name of board"
            className="portal-board-name-input"
          />
          <Link
            to={`/boards/${boardId}/share`}
            prefetch="render"
            className="portal-board-share-link"
          >
            Share
          </Link>
        </>,
        navigationPortal
      )}
    </>
  );
}
