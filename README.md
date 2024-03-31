# Gojo

A real-time collaborative brainstorming web app built with [Remix](https://remix.run/) and [Liveblocks](https://liveblocks.io/).

Some notes:

- Double click on board to create a card.
- Click once to "focus" on card. Click again to begin entering text.
- Focusing on a card brings it to the front.
- When sharing, you can also copy link similar to Google Docs. Anyone with the link gets instant access.

https://github.com/tigerabrodi/gojo/assets/49603590/6bab85b4-e0cd-484b-ae87-c32e203b15cf

# Get it running locally

1. Clone or fork it.
2. Run `npm install`
3. Create a `.env` file in root. You're gonna need three environment variables: `COOKIE_SECRET`, `LIVEBLOCKS_SECRET_KEY` and `DATABASE_URL`.
4. Run `npm run dev`

## Environment variables

`COOKIE_SECRET` -> can be whatever you want, I'd recommend generating a random string.
`LIVEBLOCKS_SECRET_KEY` -> setup account on Liveblocks and copy the secret private key from development environment.
`DATABASE_URL` -> URL of a Postgres DB, I setup mine on [Railway](https://railway.app/), it's super easy.

# Features explained

<details>
  <summary>🍿 Add someone as Editor via Email</summary>

---

At the moment, you can only add someone as editor. Supporting other roles shouldn't be too hard, but I left it out for now.

To make this work, we keep track of the roles for every board.

```tsx
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

When focusing on a card, we bring it to the front. The order of zIndex is kept via `zIndexOrderListWithCardIds` in the liveblocks storage.

In the liveblocks storage, we have an array of the cardIds `zIndexOrderListWithCardIds`. The last card has the highest zIndex in this list.

We get the zIndex for every card by simply calling `indexOf` using the card's id.

Liveblocks storage type code:

```tsx
type Storage = {
  cards: LiveList<LiveObject<CardType>>
  zIndexOrderListWithCardIds: LiveList<string>
  boardName: string
}
```

Code inside Card component for bringing cards to the front:

```tsx
const bringCardToFront = useMutation(({ storage }, cardId: string) => {
  const zIndexOrderListWithCardIds = storage.get('zIndexOrderListWithCardIds')
  const index = zIndexOrderListWithCardIds.findIndex((id) => id === cardId)

  if (index !== -1) {
    zIndexOrderListWithCardIds.delete(index)
    zIndexOrderListWithCardIds.push(cardId)
  }
}, [])
```

## Side note

This is a simple way of managing zIndex. It's not the most efficient way, because e.g. adding something to beginning of the array is O(n) time complexity. Arrays are stored as a continuous block of memory, so adding something to the beginning means we have to shift everything else to the right, if there is no space available, we'd have to allocate a new block of memory and copy everything over.

If you were building something like Figma from scratch (no liveblocks) where milliseconds matter, you would probably want to consider a different approach.

</details>

<details>
  <summary>🍿 Share access via link with secret Id</summary>

---

There is also the option to copy a share link on share dialog.

You can simply copy it and share it with a friend.

When they enter the link, they will instantly get access.

For every board, we create a secretId. The link appends this secretId as query parameter on the board's url. If it exists, we verify it's the correct one before creating a role for the new user. However, the user may already exist, so we're using `upsert` here in prisma.

Board model code:

```tsx
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

```tsx
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
        message: "You are not allowed on this board.",
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

```tsx
{
  others.map(({ connectionId, presence }) => {
    if (presence.cursor === null) {
      return null
    }

    return (
      <Cursor
        key={`cursor-${connectionId}`}
        color={getColorWithId(connectionId)}
        x={presence.cursor.x}
        y={presence.cursor.y}
        name={presence.name}
      />
    )
  })
}
```

We make sure to update the user's own presence when they're moving around the page:

```tsx
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

```tsx
export function getColorWithId(id: number) {
  return COLORS[id % COLORS.length]
}
```

At scale where we expect many users on a single board, we'd need to make sure to have many more colors. Currently, COLORS contains 15 colors.

Cursor component:

```tsx
import type { LinksFunction } from '@vercel/remix'
import cursorStyles from './Cursor.css'

type Props = {
  color: string
  name: string
  x: number
  y: number
}

export const cursorLinks: LinksFunction = () => [
  { rel: 'stylesheet', href: cursorStyles },
]

export function Cursor({ color, name, x, y }: Props) {
  return (
    <div
      className="cursor"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
        '--colors-cursor': color,
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
  )
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

```tsx
function onCardClick() {
  const isCardContentCurrentlyFocused =
    document.activeElement === cardContentRef.current

  if (isCardContentCurrentlyFocused) return

  if (!hasCardBeenClickedBefore) {
    setHasCardBeenClickedBefore(true)
    return
  }

  if (cardContentRef.current) {
    cardContentRef.current.focus()
    moveCursorToEnd(cardContentRef.current)
    setIsCardContentFocused(true)
    scrollToTheBottomOfCardContent()
    updateMyPresence({ isTyping: true })
  }
}
```

Now, this is where it gets funky.

When we focus we need to right away update the presence for other users, telling them we're focusing on the card. This gotta be done via `onFocus` and not `onClick`. Because onClick doesn't trigger till the finger leaves the mouse button.

Code for focusing on card:

```tsx
function onCardFocus() {
  updateMyPresence({
    selectedCardId: card.id,
  })
}
```

When blurring the card, things also get interesting. There are several things we wanna do, and we ONLY want the blur logic to proceed if we're not about to edit the content.

Like I said before, blur happens when the focus leaves the element, even if the focus leaves an element for another one that's inside of it.

This is where I learned about `relatedTarget`, taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/relatedTarget): "The MouseEvent.relatedTarget read-only property is the secondary target for the mouse event, if there is one."

This is similar to mouseleave event (referring to the MDN document), `relatedTarget` points to the element it enters.

Code for card blur:

```tsx
function onCardBlur(event: FocusEvent<HTMLDivElement>) {
  // If we're focusing on card content, card's blur should not be triggered
  if (event.relatedTarget === cardContentRef.current) return

  cardContentRef.current?.blur()
  setIsCardContentFocused(false)
  setHasCardBeenClickedBefore(false)
  updateMyPresence({ isTyping: false, selectedCardId: null })
}
```

How do we know someone is selecting what card?

We get that from the `useOthers` hook.

```js
const others = useOthers()
const personFocusingOnThisCard = others.find(
  (person) => person.presence.selectedCardId === card.id
)
```

What's the UI for showing who is editing what card?

If someone else is focusing on a card, we update the styling and also display the name tag for the card:

```tsx
{
  personFocusingOnThisCard && (
    <div
      className="card-presence-name"
      style={{
        backgroundColor: getColorWithId(personFocusingOnThisCard.connectionId),
      }}
    >
      {personFocusingOnThisCard.presence.name}
    </div>
  )
}
```

</details>

<details>
  <summary>🍿 Moving card with arrow keys</summary>

---

When a card is focused, you can move it with arrow keys.

However, we don't want this to happen if you're editing the text. That would otherwise be a very confusing experience.

Code for moving the card with arrow keys:

```tsx
function handleCardMove(direction: 'up' | 'down' | 'left' | 'right') {
  let newX = card.positionX
  let newY = card.positionY

  switch (direction) {
    case 'up':
      newY -= 10
      break
    case 'down':
      newY += 10
      break
    case 'left':
      newX -= 10
      break
    case 'right':
      newX += 10
      break
    default:
      break
  }

  updateCardPosition(card.id, newX, newY)
}

function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key === 'Escape' && cardContentRef.current) {
    cardContentRef.current.blur()
    return
  }

  // If user editing text, moving card with arrow keys should not be triggered
  if (cardContentRef.current === document.activeElement) return

  const arrowKey = ARROW_KEYS[event.key as keyof typeof ARROW_KEYS]

  if (arrowKey) {
    switch (event.key) {
      case 'ArrowUp':
        handleCardMove('up')
        break
      case 'ArrowDown':
        handleCardMove('down')
        break
      case 'ArrowLeft':
        handleCardMove('left')
        break
      case 'ArrowRight':
        handleCardMove('right')
        break
      default:
        break
    }

    // Prevent the page from scrolling when using arrow keys
    event.preventDefault()
  }
}
```

</details>

<details>
  <summary>🍿 Card's content</summary>

---

For the content, we're using a contenteditable div. We're storing the actual HTML content because we want to preserve the formatting.

I'm using DOMPurify to sanitize the HTML content before saving it to the database. This ensures that we're not saving any malicious code.

```tsx
function handleInput(event: React.FormEvent<HTMLSpanElement>) {
  const newHtml = event.currentTarget.innerHTML || ''
  const purifiedHtml = DOMPurify.sanitize(newHtml)
  setContent(purifiedHtml)
  updateCardContent(card.id, purifiedHtml)
}
```

</details>

<details>
  <summary>🍿 Resizing the card</summary>

---

This was a bit of an adventure. I first needed to figure out how to make the card resizable, then figure out how to preserve the aspect ratio while resizing.

To take you through this, let me first show you the entire code, and then we'll break it down.

```tsx
function handleResizeMouseDown(
  resizeHandlerMoustDownEvent: React.MouseEvent<HTMLDivElement>,
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
) {
  // Needed to prevent card from being dragged when resizing
  resizeHandlerMoustDownEvent.stopPropagation()

  const startWidth = card.width
  const startHeight = card.height

  const startX = resizeHandlerMoustDownEvent.clientX
  const startY = resizeHandlerMoustDownEvent.clientY

  const startPosX = card.positionX
  const startPosY = card.positionY

  function handleMouseMove(mouseMoveEvent: MouseEvent) {
    let newWidth = startWidth
    let newHeight = startHeight
    let newX = startPosX
    let newY = startPosY

    const widthDiff = mouseMoveEvent.clientX - startX
    const heightDiff = mouseMoveEvent.clientY - startY

    switch (corner) {
      case 'top-left': {
        newWidth = Math.max(CARD_DIMENSIONS.width, startWidth - widthDiff)
        newHeight = Math.max(CARD_DIMENSIONS.height, startHeight - heightDiff)

        const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
        newWidth = maxNewWidthAndHeight
        newHeight = maxNewWidthAndHeight

        newX = startPosX + (startWidth - maxNewWidthAndHeight)
        newY = startPosY + (startHeight - maxNewWidthAndHeight)
        break
      }

      case 'top-right': {
        newWidth = Math.max(CARD_DIMENSIONS.width, startWidth + widthDiff)
        newHeight = Math.max(CARD_DIMENSIONS.height, startHeight - heightDiff)

        const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
        newWidth = maxNewWidthAndHeight
        newHeight = maxNewWidthAndHeight

        newY = startPosY + (startHeight - maxNewWidthAndHeight)
        break
      }
      case 'bottom-left': {
        newWidth = Math.max(CARD_DIMENSIONS.width, startWidth - widthDiff)
        newHeight = Math.max(CARD_DIMENSIONS.height, startHeight + heightDiff)

        const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
        newWidth = maxNewWidthAndHeight
        newHeight = maxNewWidthAndHeight

        newX = startPosX + (startWidth - maxNewWidthAndHeight)
        break
      }
      case 'bottom-right': {
        newWidth = Math.max(CARD_DIMENSIONS.width, startWidth + widthDiff)
        newHeight = Math.max(CARD_DIMENSIONS.height, startHeight + heightDiff)

        const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
        newWidth = maxNewWidthAndHeight
        newHeight = maxNewWidthAndHeight

        break
      }
    }

    updateCardSize(card.id, newWidth, newHeight)
    updateCardPosition(card.id, newX, newY)
  }

  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}
```

Let's now try to break it down and understand what's happening.

I think we can start by focusing on everything besides `handleMouseMove`. For now, we assume `handleMouseMove` is just a black box that does some magic resizing.

```tsx
function handleResizeMouseDown(
  resizeHandlerMoustDownEvent: React.MouseEvent<HTMLDivElement>,
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
) {
  // Needed to prevent card from being dragged when resizing
  resizeHandlerMoustDownEvent.stopPropagation()

  // Width and height of the card when resizing starts
  const startWidth = card.width
  const startHeight = card.height

  // Starting position of the mouse when resizing starts
  // This will be one of the corners of the card aka the resize handlers
  const startX = resizeHandlerMoustDownEvent.clientX
  const startY = resizeHandlerMoustDownEvent.clientY

  // This represents the starting position of the card
  // The coordinates of the top left corner of the card
  const startPosX = card.positionX
  const startPosY = card.positionY

  function handleMouseMove(mouseMoveEvent: MouseEvent) {
    // ...
  }

  // When done resizing, remove the event listeners
  // If we don't do this, the card will keep resizing even after we let go of the mouse button
  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  // Add event listeners for mouse move and mouse up
  // As you can see, we only do this when resizing starts
  // aka in our `handleResizeMouseDown` function
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}
```

Now, with that out of the way, let's focus on `handleMouseMove`.

I feel like it could be broken down into two parts:

1. Resizing.
2. Preserving aspect ratio.

Let's focus on resizing first.

```tsx
function handleMouseMove(mouseMoveEvent: MouseEvent) {
  // This is the card's width
  let newWidth = startWidth

  // This is the card's height
  let newHeight = startHeight

  // We initialize the new position of the card to be the same as the starting position
  let newX = startPosX
  let newY = startPosY

  // The difference between the starting position of the mouse and the current position
  // The starting position is where the mouse was when resizing started
  // This will be one of the corners of the card aka the resize handlers
  const widthDiff = mouseMoveEvent.clientX - startX
  const heightDiff = mouseMoveEvent.clientY - startY

  switch (corner) {
    case 'top-left': {
      newWidth = Math.max(150, startWidth - widthDiff)
      newHeight = Math.max(150, startHeight - heightDiff)

      newX = startPosX + (startWidth - newWidth)
      newY = startPosY + (startHeight - newHeight)
      break
    }

    case 'top-right': {
      newWidth = Math.max(150, startWidth + widthDiff)
      newHeight = Math.max(150, startHeight - heightDiff)

      newY = startPosY + (startHeight - newHeight)
      break
    }
    case 'bottom-left': {
      newWidth = Math.max(150, startWidth - widthDiff)
      newHeight = Math.max(150, startHeight + heightDiff)

      newX = startPosX + (startWidth - newWidth)
      break
    }
    case 'bottom-right': {
      newWidth = Math.max(150, startWidth + widthDiff)
      newHeight = Math.max(150, startHeight + heightDiff)

      break
    }
  }

  updateCardSize(card.id, newWidth, newHeight)
  updateCardPosition(card.id, newX, newY)
}
```

This can be tricky to understand, so let's go over it slowly.

## What are clientX and clientY?

Let's start by looking at the card's `positionX` and `positionY`. These are the coordinates of the top left corner of the card.

You may wonder what coordinates? Well, `positionX` is how many pixels from the left edge of the screen the card is, and `positionY` is how many pixels from the top edge of the screen the card is. That's how the browser calculates the position of elements.

The same goes for `clientX` and `clientY`. These are the coordinates of the mouse pointer when the event happened. `clientX` is how many pixels from the left edge of the screen the mouse pointer is, and `clientY` is how many pixels from the top edge of the screen the mouse pointer is.

## Difference calculation

```tsx
const widthDiff = mouseMoveEvent.clientX - startX
const heightDiff = mouseMoveEvent.clientY - startY
```

Let's say the mouse was at `clientX` 100 when resizing started, and now it's at 150. The difference would be 50. This is how we calculate how much the mouse has moved. If `clientX` has increased, it means the mouse moved to the right. If it has decreased, it means the mouse moved to the left.

If `clientY` has increased, it means the mouse moved down. If it has decreased, it means the mouse moved up.

So if the difference for e.g. `clientX` is negative, it means `clientX` has decreased, and the mouse moved to the left, because we started at a position much further to the right.

Now, with that out of the way, let's look at each case!

## Top left corner

For the top left corner, we know that if we resize the card, we want to not just calculate the new width and height, but also the new position of the card. Because the position of the card is the top left corner, we need to adjust the position of the card as we resize it.

```tsx
newWidth = Math.max(150, startWidth - widthDiff)
newHeight = Math.max(150, startHeight - heightDiff)

newX = startPosX + (startWidth - newWidth)
newY = startPosY + (startHeight - newHeight)
```

We are using `max` to make sure the card does not get too small. We do not want the card to be smaller than 150 pixels. This applies to all cases.

We can get the new width by subtracting the difference from the starting width. To understand this, we need some math. If the width difference is negative, it means the mouse moved to the left. Because we are dragging from the top left corner, we know that if we drag towards the left, the card should get wider. So if the width difference is negative, it would be e.g. `startWidth - (-50)`, which is the same as `startWidth + 50`. Minus and minus is a plus in math.

What about the height?

For the height, it is the same thing. If the height difference is negative, it means the mouse moved up. If the mouse moved up, the card should get taller. So if the height difference is negative, it would be e.g. `startHeight - (-50)`, which is the same as `startHeight + 50`.

Do you start to see how it works?

It just logic and basic math. We need to think about every corner and how it should behave when resizing.

How do we calculcate the new top left corner position of the card: `newX` and `newY`?

We know that the top left corner of the card is at `startPosX` and `startPosY`. We need to both adjust the offset from the left and the offset from the top.

`newX = startPosX + (startWidth - newWidth)` -> This is how we calculate the new `x` position of the card. Say the startPosX is 400, and the startWidth is 200, and the newWidth is 150. We would get `400 + (200 - 150)`, which is `400 + 50`, which is `450`. This is what we want here because more towards the right means a higher `x` value, which would mean the card shrunk.

Let's do another example. Let's say the startPosX is 400, and the startWidth is 200, and the newWidth is 250. We would get `400 + (200 - 250)`, which is `400 - 50`, which is `350`. This is what we want here because more towards the left means a lower `x` value, which would mean the card grew.

Remember, this is how it works for the top left corner. Case by case, the calculations are different.

`newY = startPosY + (startHeight - newHeight)` -> This is how we calculate the new `y` position of the card. Say the startPosY is 400, and the startHeight is 200, and the newHeight is 150. We would get `400 + (200 - 150)`, which is `400 + 50`, which is `450`. This is what we want here because more towards the bottom means a higher `y` value, which would mean the card shrunk.

## Top right corner

We covered a lot in the past sections, so we will focus on the new things here.

This is the top right corner.

```tsx
newWidth = Math.max(150, startWidth + widthDiff)
newHeight = Math.max(150, startHeight - heightDiff)

newY = startPosY + (startHeight - newHeight)
```

`newWidth = Math.max(150, startWidth + widthDiff)` -> If widthDiff is negative, it means `clientX` has decreased, and the mouse moved to the left. If the most moved to the left, the card should get smaller because we are dragging from the top right corner. So if the width difference is negative, it would be e.g. `startWidth + (-50)`, which is the same as `startWidth - 50`.

`newHeight = Math.max(150, startHeight - heightDiff)` -> If heightDiff is negative, it means `clientY` has decreased, and the mouse moved up. If the mouse moved up, the card should get taller. So if the height difference is negative, it would be e.g. `startHeight - (-50)`, which is the same as `startHeight + 50`.

Because we can change the height of the top, which includes the top left corner, we also have to update `newY` which is the card's `y` position.

`newY = startPosY + (startHeight - newHeight)` -> This is how we calculate the new `y` position of the card. Say the startPosY is 400, and the startHeight is 200, and the newHeight is 150. We would get `400 + (200 - 150)`, which is `400 + 50`, which is `450`. This is what we want here because more towards the bottom means a higher `y` value, which would mean the card shrunk.

## Bottom left corner

This is the bottom left corner.

```tsx
newWidth = Math.max(150, startWidth - widthDiff)
newHeight = Math.max(150, startHeight + heightDiff)

newX = startPosX + (startWidth - newWidth)
```

`newWidth = Math.max(150, startWidth - widthDiff)` -> If widthDiff is negative, it means `clientX` has decreased, and the mouse moved to the left. If the most moved to the left, the card should get wider because we are dragging from the bottom left corner. So if the width difference is negative, it would be e.g. `startWidth - (-50)`, which is the same as `startWidth + 50`.

`newHeight = Math.max(150, startHeight + heightDiff)` -> If heightDiff is negative, it means `clientY` has decreased, and the mouse moved up. If the mouse moved up, the card should get shorter. So if the height difference is negative, it would be e.g. `startHeight + (-50)`, which is the same as `startHeight - 50`.

Because we can change the left side, which includes the top left corner, we also have to update `newX` which is the card's `x` position.

`newX = startPosX + (startWidth - newWidth)` -> Say the startPosX is 400, and the startWidth is 200, and the newWidth is 150. We would get `400 + (200 - 150)`, which is `400 + 50`, which is `450`. This is what we want here because more towards the right means a higher `x` value, which would mean the card shrunk.

## Bottom right corner

This is the bottom right corner.

```tsx
newWidth = Math.max(150, startWidth + widthDiff)
newHeight = Math.max(150, startHeight + heightDiff)
```

`newWidth = Math.max(150, startWidth + widthDiff)` -> If widthDiff is negative, it means `clientX` has decreased, and the mouse moved to the left. If the mouse moved to the left, the card should get smaller because we are dragging from the bottom right corner. So if the width difference is negative, it would be e.g. `startWidth + (-50)`, which is the same as `startWidth - 50`.

`newHeight = Math.max(150, startHeight + heightDiff)` -> If heightDiff is negative, it means `clientY` has decreased, and the mouse moved up. If the mouse moved up, the card should get shorter. So if the height difference is negative, it would be e.g. `startHeight + (-50)`, which is the same as `startHeight - 50`.

## Preserving aspect ratio

Now that we've gone through the resizing logic, let's talk about preserving the aspect ratio.

When we resize the card, we don't want it to get distorted. We want it to remain a square. That's why when you look at the original code, you see that we calculate the new width and height, and then we calculate the maximum of the two. Now, maybe you could take the minimum of those two, but I decided to take the maximum and it works.

```tsx
const maxNewWidthAndHeight = Math.max(newWidth, newHeight)
newWidth = maxNewWidthAndHeight
newHeight = maxNewWidthAndHeight
```

</details>

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

# License

MIT 💞
