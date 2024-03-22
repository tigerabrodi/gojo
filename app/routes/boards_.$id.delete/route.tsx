import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  LinksFunction,
} from '@vercel/remix'
import type { RoomEvent } from '~/liveblocks.config'

import { invariant } from '@epic-web/invariant'
import { Dialog } from '@headlessui/react'
import { Form, Link, useNavigate, useNavigation } from '@remix-run/react'
import { json } from '@vercel/remix'
import { redirectWithError, redirectWithSuccess } from 'remix-toast'

import { checkIsUserOwnerOfBoard, deleteBoard } from './queries'
import styles from './styles.css'

import { requireAuthCookie } from '~/auth'
import { FORM_INTENTS, INTENT, liveblocks } from '~/helpers'
import { Close } from '~/icons'


export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireAuthCookie(request)
  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const isUserOwnerOfBoard = await checkIsUserOwnerOfBoard({
    userId,
    boardId,
  })

  if (!isUserOwnerOfBoard) {
    throw redirectWithError(`/boards/${boardId}`, {
      message: 'Only owners of board can delete it.',
    })
  }

  return null
}

export default function BoardShareRoute() {
  const navigate = useNavigate()
  const navigation = useNavigation()

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.deleteBoard

  return (
    <Dialog open onClose={() => navigate('..')} className="delete-dialog">
      <div className="backdrop" aria-hidden="true" />

      <Dialog.Panel className="panel">
        <Link to=".." className="close-link" aria-label="Close dialog">
          <Close />
        </Link>
        <div className="panel-header">
          <Dialog.Title>
            Are you sure you want to delete this board?
          </Dialog.Title>
          <Dialog.Description>
            Deleting this board will inform and redirect all active users to the
            home page.
          </Dialog.Description>
        </div>

        <Form method="post">
          <Link to=".." aria-label="close">
            Cancel
          </Link>
          <button
            name={INTENT}
            value={FORM_INTENTS.deleteBoard}
            disabled={isSubmitting}
          >
            Delete
          </button>
        </Form>
      </Dialog.Panel>
    </Dialog>
  )
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const isUserOwnerOfBoard = await checkIsUserOwnerOfBoard({
    userId,
    boardId,
  })

  // If this ever happens, likely API request, because you would otherwise get redirected back
  // Simply throw 403 authorization error
  if (!isUserOwnerOfBoard) {
    return json(
      { message: 'You are not allowed to edit this board' },
      { status: 403 }
    )
  }

  const event: RoomEvent = {
    type: 'board-deleted',
  }

  // 1. delete board from actual database
  await deleteBoard(boardId)

  // 2. broadcast to all clients that board was deleted
  await liveblocks.broadcastEvent(boardId, event)

  // 3. delete board from liveblocks storage
  await liveblocks.deleteRoom(boardId)

  return redirectWithSuccess('/boards', {
    message: 'Board was successfully deleted',
  })
}
