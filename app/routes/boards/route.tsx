import { Form, Link } from "@remix-run/react";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { Plus } from "~/icons";

import styles from "./styles.css";
import type { LinksFunction } from "@vercel/remix";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export default function Boards() {
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
        >
          <Plus />
        </button>
      </Form>
    </main>
  );
}
