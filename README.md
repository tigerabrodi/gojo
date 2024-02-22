# Gojo

A real-time collaborative brainstorming web app built with [Remix](https://remix.run/) and [Liveblocks](https://liveblocks.io/).

Some notes:

- Double click on board to create a card.
- Click once to "focus" on card. Click again to begin entering text.
- Bring to front and back button to manage zIndex for the cards.
- When sharing, you can also copy link similar to Google Docs. Anyone with link gets instant access.

https://github.com/narutosstudent/gojo/assets/49603590/8869323b-d9b3-4a2a-8c21-e3651c46ef41

# Get it running locally

1. Clone or fork it.
2. Run `npm install`
3. Create a `.env` file in root. You're gonna need three environment variables: `COOKIE_SECRET`, `LIVEBLOCKS_SECRET_KEY` and `DATABASE_URL`.
4. Run `npm run dev`

## Environment variables

`COOKIE_SECRET` -> can be whatever you want, I'd recommend generating a random string.
`LIVEBLOCKS_SECRET_KEY` -> setup account on Liveblocks and copy the secret private key from development environment.
`DATABASE_URL` -> URL from a Postgres DB, I setup mine on [Railway](https://railway.app/), it's super easy.

# Features explained

<details>
  <summary>🍿 Add someone as Editor via Email</summary>

---

At the moment, you can only add someone as editor. Supporting other roles shouldn't be too hard, but I left it our for now.

To make this work, we keep track of the roles for every board.

```ts
model BoardRole {
  id       String   @id @default(uuid())
  role     String // owner, editor
  board    Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  boardId  String
  user     User     @relation(fields: [userId], references: [id])
  userId   String
  addedAt DateTime @default(now())

  @@unique([boardId, userId]) // Ensure one role per user per board
}
```

</details>

<details>
  <summary>🍿 zIndex management</summary>

---

We have a bring to back and bring to front button for every single card.

In the liveblocks storage, we have an array of the cardIds `zIndexOrderListWithCardIds`. The last card has the highest zIndex in this list.

We get the zIndex for every card by simply calling `indexOf` using the card's id.

Liveblocks storage type code:

```ts
type Storage = {
  cards: LiveList<LiveObject<CardType>>;
  zIndexOrderListWithCardIds: LiveList<string>;
  boardName: string;
};
```

Code inside Card component for bringing cards back or front:

```ts
  const bringCardToFront = useMutation(({ storage }, cardId: string) => {
    const zIndexOrderListWithCardIds = storage.get(
      "zIndexOrderListWithCardIds"
    );
    const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId);

    if (index !== -1) {
      zIndexOrderListWithCardIds.delete(index);
      zIndexOrderListWithCardIds.push(cardId);
    }
  }, []);

  const bringCardToBack = useMutation(({ storage }, cardId: string) => {
    const zIndexOrderListWithCardIds = storage
      .get("zIndexOrderListWithCardIds")
      .toArray();
    const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId);

    if (index !== -1) {
      zIndexOrderListWithCardIds.splice(index, 1);
      zIndexOrderListWithCardIds.unshift(cardId);
      storage.set(
        "zIndexOrderListWithCardIds",
        new LiveList(zIndexOrderListWithCardIds)
      );
    }
  }, []);
```

</details>

<details>
  <summary>🍿 Share access via link with secret Id</summary>

---

There is also the option to copy a share link on share dialog.

You can simply copy it and share it with a friend.

When they enter the link, they will instantly get access.

For every board, we create a secretId. The link appends this secretId as query parameter on the board's url. If it exists, we verify it's the correct one before creating a role for the new user. However, the user may already exist, so we're using `upsert` here in prisma.

Board model code:

```ts
model Board {
  id       String      @id @default(uuid())
  name     String
  secretId String      @default(uuid()) // secret Id
  roles    BoardRole[]
  lastOpenedAt DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

Board route loader function, this runs on the server before client renders anything:

```ts
export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireAuthCookie(request);
  const boardId = params.id;

  invariant(boardId, "No board ID provided");

  const currentUrl = new URL(request.url);
  const secretId = currentUrl.searchParams.get("secretId");

  if (secretId) {
    const isUserAllowedToEnterBoard =
      await checkUserAllowedToEnterBoardWithSecretId({
        boardId,
        secretId,
      });

    if (!isUserAllowedToEnterBoard) {
      throw redirectWithError("/boards", {
        message: "You are not allowed on this board at all.",
      });
    }

    await upsertUserBoardRole({
      userId,
      boardId,
    });
  }
// ...
```

</details>

<details>
  <summary>🍿 Real-time cursors</summary>

---

This seems hard, and honestly, it is, but Liveblocks makes things simple to implement. There is a `useOthers` hook that gives us access to see the `presence` info of other users on the board in real time.

Code for mapping out the cursor component:

```ts
        {others.map(({ connectionId, presence }) => {
          if (presence.cursor === null) {
            return null;
          }

          return (
            <Cursor
              key={`cursor-${connectionId}`}
              color={getColorWithId(connectionId)}
              x={presence.cursor.x}
              y={presence.cursor.y}
              name={presence.name}
            />
          );
        })}
```

We make sure to update the user's own presence when they're moving around the page:

```ts
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
// ...
```

Get color with id function:

```ts
export function getColorWithId(id: number) {
  return COLORS[id % COLORS.length];
}
```

Cursor component:

```ts
import type { LinksFunction } from "@vercel/remix";
import cursorStyles from "./Cursor.css";

type Props = {
  color: string;
  name: string;
  x: number;
  y: number;
};

export const cursorLinks: LinksFunction = () => [
  { rel: "stylesheet", href: cursorStyles },
];

export function Cursor({ color, name, x, y }: Props) {
  return (
    <div
      className="cursor"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
        "--colors-cursor": color,
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 15 22">
        <path
          fill={color}
          stroke="#162137"
          strokeWidth={1.5}
          d="M6.937 15.03h-.222l-.165.158L1 20.5v-19l13 13.53H6.937Z"
        />
      </svg>
      <span>{name}</span>
    </div>
  );
}
```

</details>

<details>
  <summary>🍿 Moving and editing the card + showing who is doing what in real time</summary>

---

This was hard. I actually struggled with this for several hours, trying to figure out how to get it to work properly.

I had a flickering bug due to card's on blur function running whenever you click the second time to begin entering the text.

My main learning: onBlur runs whenever the focus leaves the component, EVEN if the focus leaves the component for an element inside the component. It was really hard to debug because it was like a deep assumption I've always had. 😅

We also have to keep track of whether the card was clicked already or not, if it wasn't clicked, we don't yet want to focus on the editable content inside the card.

Code when clicking on the card:

```ts
  function onCardClick() {
    const isCardContentCurrentlyFocused =
      document.activeElement === cardContentRef.current;

    if (isCardContentCurrentlyFocused) return;

    if (!hasCardBeenClickedBefore) {
      setHasCardBeenClickedBefore(true);
      return;
    }

    if (cardContentRef.current) {
      cardContentRef.current.focus();
      moveCursorToEnd(cardContentRef.current);
      setIsCardContentFocused(true);
      scrollToTheBottomOfCardContent();
      updateMyPresence({ isTyping: true });
    }
  }
```

Now, this is where it gets funky.

When we focus we need to right away update the presence for other users, telling them we're focusing on the card. This gotta be done via `onFocus` and not `onClick`. Because onClick doesn't trigger till the finger leaves the mouse button.

Code for focusing on card:

```ts
  function onCardFocus() {
    updateMyPresence({
      selectedCardId: card.id,
    });
  }
```

When blurring the card, things also get interesting. There are several things we wanna do, and we ONLY want the blur logic to proceed if we're not about to edit the content.

Like I said before, blur happens when the focus leaves the element, even if the focus leaves an element for another one that's inside of it.

This is where I learned about `relatedTarget`, taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/relatedTarget): "The MouseEvent.relatedTarget read-only property is the secondary target for the mouse event, if there is one."

This is similar to mouseleave, `relatedTarget` points to the element it enters.

Code for card blur:

```ts
  function onCardBlur(event: FocusEvent<HTMLDivElement>) {
    // If we're focusing on card content, card's blur should not be triggered
    if (event.relatedTarget === cardContentRef.current) return;

    cardContentRef.current?.blur();
    setIsCardContentFocused(false);
    setHasCardBeenClickedBefore(false);
    updateMyPresence({ isTyping: false, selectedCardId: null });
  }
```

How do we know someone is selecting what card?

We get that from the `useOthers` hook.

```js
  const others = useOthers();
  const personFocusingOnThisCard = others.find(
    (person) => person.presence.selectedCardId === card.id
  );
```

What's the UI for showing who is editing what card?

If someone else is focusing on a card, we update the styling and also display the name tag for the card:

```ts
      {personFocusingOnThisCard && (
        <div
          className="card-presence-name"
          style={{
            backgroundColor: getColorWithId(
              personFocusingOnThisCard.connectionId
            ),
          }}
        >
          {personFocusingOnThisCard.presence.name}
        </div>
      )}
```

</details>

# Future Improvements Ideas

- Nicer input in share dialog, similar to Google Docs: Auto complete + ability to add multiple users at once before sending out invite.
- Add read role.
- Send an "invite" rather than direct addition.
- Ability to resize cards.
- Ability to change font size, an option to have auto font size similar to Miro cards would be cool too.
- Make it accessible 😬

# Liveblocks

Liveblocks is the service I used for the real-time collab stuff.

It's super neat, I love how it lets me be the one deciding how to authenticate.

Rather than being a complete package right away, it gives you the lego blocks for building collaborative web apps, including Browser Dev Tools for an awesome developer experience.

Another fun thing: It uses Cloudflare Durable objects [under the hood](https://liveblocks.io/docs/platform/websocket-infrastructure). The web socket servers sit on the edge.

# Tech

- Remix -> Fullstack Web Framework
- Liveblocks -> Real time collaboration service
- Vercel -> Deployment
- Railway -> DB hosting (postgres)
- Conform -> Form validation
- CSS -> Styling
- TypeScript -> My love lmao
- Playwright -> Tests
- Radix UI

# Licsense

MIT 💞
