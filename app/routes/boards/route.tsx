import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { Plus } from "~/icons";

import styles from "./styles.css";
import { redirect, json } from "@vercel/remix";
import type { LoaderFunctionArgs, LinksFunction } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { createBoard, getBoardsForUser } from "./queries";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request);

  const boards = await getBoardsForUser(userId);

  return json({
    boards,
  });
}

export default function Boards() {
  const { boards } = useLoaderData<typeof loader>();

  const navigation = useNavigation();

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.createBoard;

  return (
    <main>
      <div>
        <h1>Boards</h1>
        <ul>
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/boards/${board.id}`}
                prefetch="render"
                aria-label={board.name || "Untitled board"}
              >
                <span className="name">{board.name || "Untitled"}</span>
                <span className="date">
                  Last opened: {board.lastOpenedAt ?? "Not yet"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <Form method="post">
        <button
          aria-label="Create board"
          name={INTENT}
          value={FORM_INTENTS.createBoard}
          disabled={isSubmitting}
        >
          <Plus />
        </button>
      </Form>
    </main>
  );
}

export async function action({ request }: { request: Request }) {
  const userId = await requireAuthCookie(request);

  const board = await createBoard(userId);

  return redirect(`/boards/${board.id}`);
}
