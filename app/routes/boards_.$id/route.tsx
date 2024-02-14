import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@vercel/remix";
import { json } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { invariant } from "@epic-web/invariant";
import { Link, useLoaderData } from "@remix-run/react";
import { RoomProvider, useMutation, useStorage } from "~/liveblocks.config";
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import styles from "./styles.css";
import { Kakashi } from "~/icons";
import {
  CARD_DIMENSIONS,
  Card,
  NAVIGATION_PORTAL_ID,
  cardLinks,
} from "~/components";
import { createPortal } from "react-dom";
import { updateBoardLastOpenedAt, updateBoardName } from "./queries";
import { useDebounceFetcher } from "remix-utils/use-debounce-fetcher";
import type { CardType } from "~/helpers";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import type { MouseEvent } from "react";
import { v1 } from "uuid";

export const handle = {
  shouldHideRootNavigation: true,
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  ...cardLinks(),
];

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
        boardName: "Untitled board",
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
  const fetcher = useDebounceFetcher();
  const boardName = useStorage((root) => root.boardName);
  const cards = useStorage((root) => root.cards);

  function handleUpdateBoardName() {
    const formData = new FormData();
    formData.append("boardName", boardName);
    formData.append(INTENT, FORM_INTENTS.updateBoardName);

    fetcher.submit(formData, { debounceTimeout: 2000, method: "post" });
  }

  const updateBoardName = useMutation(({ storage }, newBoardName: string) => {
    storage.set("boardName", newBoardName);
  }, []);

  const navigationPortal = document.getElementById(NAVIGATION_PORTAL_ID)!;

  const createNewCard = useMutation(
    ({ storage }, event: MouseEvent<HTMLElement>) => {
      const newId = v1();

      console.log("event.clientX", event.clientX);
      console.log("event.clientY", event.clientY);

      const positionX = event.clientX - CARD_DIMENSIONS.width / 2;
      const positionY = event.clientY - CARD_DIMENSIONS.height;

      const newCard: CardType = {
        id: newId,
        text: "",
        positionX,
        positionY,
      };

      storage.get("cards").push(new LiveObject(newCard));
    },
    []
  );

  return (
    <>
      <main onDoubleClick={createNewCard}>
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </main>

      {createPortal(
        <>
          <input
            placeholder="Vacation trips"
            aria-label="Enter name of board"
            className="portal-board-name-input"
            value={boardName}
            onChange={(event) => {
              updateBoardName(event.target.value);
              handleUpdateBoardName();
            }}
          />
          <Link
            to={`/boards/${boardId}/share`}
            // prefetch="render"
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

const schema = z.object({
  boardName: z.string(),
  intent: z.literal(FORM_INTENTS.updateBoardName),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  const { intent, boardName } = submission.value;

  if (intent === FORM_INTENTS.updateBoardName) {
    await updateBoardName({
      newBoardName: boardName,
      boardId,
    });
  }

  return submission.reply();
}
