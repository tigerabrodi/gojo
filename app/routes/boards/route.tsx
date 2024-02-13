import { Form, Link, useNavigation } from "@remix-run/react";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { Plus } from "~/icons";

import styles from "./styles.css";
import { redirect, type LinksFunction } from "@vercel/remix";
import { requireAuthCookie } from "~/auth";
import { createBoard } from "./queries";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export default function Boards() {
  const navigation = useNavigation();

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.createBoard;

  return (
    <main>
      <div>
        <h1>Boards</h1>
        <ul>
          <li>
            <Link to="/boards/1">
              <span className="name">Untitled</span>
              <span className="date">Last opened: 2021-10-10</span>
            </Link>
          </li>
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
