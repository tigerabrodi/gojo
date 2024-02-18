import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@vercel/remix";
import { json } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { invariant } from "@epic-web/invariant";
import { Link, Outlet, useFetcher, useLoaderData } from "@remix-run/react";
import {
  RoomProvider,
  useMutation,
  useMyPresence,
  useOthers,
  useStorage,
} from "~/liveblocks.config";
import { LiveList, LiveObject } from "@liveblocks/client";
import { ClientSideSuspense } from "@liveblocks/react";
import styles from "./styles.css";
import { Kakashi } from "~/icons";
import {
  CARD_DIMENSIONS,
  Card,
  NAVIGATION_PORTAL_ID,
  cardLinks,
  cursorLinks,
  Cursor,
} from "~/components";
import { createPortal } from "react-dom";
import { updateBoardLastOpenedAt, updateBoardName } from "./queries";
import type { CardType } from "~/helpers";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { useEffect, type MouseEvent, useRef } from "react";
import { v1 } from "uuid";
import { checkUserAllowedToEditBoard, getUserFromDB } from "~/db";
import { COLORS } from "./constants";

export const handle = {
  shouldHideRootNavigation: true,
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  ...cardLinks(),
  ...cursorLinks(),
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request);

  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  await updateBoardLastOpenedAt(boardId);

  const user = await getUserFromDB(userId);

  invariant(user, "User not found");

  return json({
    boardId,
    userName: user.name,
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
  const { boardId, userName } = useLoaderData<typeof loader>();

  return (
    <RoomProvider
      id={boardId}
      initialPresence={{ cursor: null, name: userName }}
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
  const fetcher = useFetcher();

  const boardName = useStorage((root) => root.boardName);
  const lastSubmittedBoardName = useRef(boardName);
  const cards = useStorage((root) => root.cards);
  const others = useOthers();
  const [{ cursor }, updateMyPresence] = useMyPresence();

  useEffect(() => {
    if (boardName === lastSubmittedBoardName.current) {
      return;
    }

    const handler = setTimeout(() => {
      const formData = new FormData();
      formData.append("boardName", boardName);
      formData.append(INTENT, FORM_INTENTS.updateBoardName);

      fetcher.submit(formData, {
        method: "post",
      });

      // Update lastSubmittedBoardName after submitting
      lastSubmittedBoardName.current = boardName;
    }, 500);

    return () => clearTimeout(handler);
  }, [boardName, fetcher]);

  const updateBoardName = useMutation(({ storage }, newBoardName: string) => {
    storage.set("boardName", newBoardName);
  }, []);

  const navigationPortal = document.getElementById(NAVIGATION_PORTAL_ID)!;

  function focusOnNewCardContent(cardId: string) {
    setTimeout(() => {
      const newCardElement = document.getElementById(cardId)!;
      const editableSpan = newCardElement.querySelector(
        "[contentEditable]"
      ) as HTMLSpanElement;
      editableSpan.focus();
    }, 10);
  }

  const createNewCard = useMutation(
    ({ storage }, event: MouseEvent<HTMLElement>) => {
      const newId = v1();

      const positionX = event.clientX - CARD_DIMENSIONS.width / 2;
      const positionY = event.clientY - CARD_DIMENSIONS.height;

      const newCard: CardType = {
        id: newId,
        text: "",
        positionX,
        positionY,
      };

      storage.get("cards").push(new LiveObject(newCard));
      focusOnNewCardContent(newId);
    },
    []
  );

  return (
    <>
      <main
        onDoubleClick={createNewCard}
        onPointerMove={(event) => {
          updateMyPresence({
            cursor: {
              x: Math.round(event.clientX),
              y: Math.round(event.clientY),
            },
          });
        }}
        onPointerLeave={() =>
          updateMyPresence({
            cursor: null,
          })
        }
      >
        {/* This is for screen readers */}
        <h1 className="sr-only">Board name: {boardName}</h1>
        {cards.map((card, index) => (
          <Card key={card.id} index={index} card={card} />
        ))}

        {others.map(({ connectionId, presence }) => {
          if (presence.cursor === null) {
            return null;
          }

          return (
            <Cursor
              key={`cursor-${connectionId}`}
              color={COLORS[connectionId % COLORS.length]}
              x={presence.cursor.x}
              y={presence.cursor.y}
              name={presence.name}
            />
          );
        })}
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
            }}
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

      <Outlet />
    </>
  );
}

const schema = z.object({
  boardName: z.string(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuthCookie(request);

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  const { boardName } = submission.value;

  const isUserAllowedToEditBoard = await checkUserAllowedToEditBoard({
    userId,
    boardId,
  });

  // If this ever happens, likely API request, because we currently only support editor role
  // No "Read only" role yet
  // Simply throw 403 authorization error
  if (!isUserAllowedToEditBoard) {
    return json(
      { message: "You are not allowed to edit this board" },
      { status: 403 }
    );
  }

  await updateBoardName({
    newBoardName: boardName,
    boardId,
  });

  return submission.reply();
}
