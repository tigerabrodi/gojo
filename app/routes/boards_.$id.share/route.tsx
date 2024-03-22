import type { SubmissionResult } from '@conform-to/react'
import type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  LinksFunction,
} from '@vercel/remix'

import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { Dialog } from '@headlessui/react'
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react'
import { useCopyToClipboard } from '@uidotdev/usehooks'
import { json } from '@vercel/remix'
import { useEffect } from 'react'
import { jsonWithSuccess, redirectWithError } from 'remix-toast'
import { z } from 'zod'

import { addNewBoardMember, getAllBoardRoles, getBoardById } from './queries'
import styles from './styles.css'

import { requireAuthCookie } from '~/auth'
import { checkUserAllowedToEditBoard } from '~/db'
import { FORM_INTENTS, INTENT } from '~/helpers'
import { Close, Link as LinkIcon } from '~/icons'

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }]

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await requireAuthCookie(request)
  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const isUserAllowedToEditBoard = await checkUserAllowedToEditBoard({
    userId,
    boardId,
  })

  if (!isUserAllowedToEditBoard) {
    throw redirectWithError('/boards', {
      message: 'Something went wrong. You are not allowed on this board.',
    })
  }

  const [allExistingBoardRoles, board] = await Promise.all([
    getAllBoardRoles(boardId),
    getBoardById(boardId),
  ])

  invariant(board, 'No board found')

  const baseUrl = new URL(request.url)
  const boardUrl = new URL(`${baseUrl.origin}/boards/${params.id}`)
  boardUrl.searchParams.set('secretId', board.secretId)
  const shareLink = boardUrl.toString()

  return json({ allExistingBoardRoles, shareLink })
}

export default function BoardShareRoute() {
  const navigate = useNavigate()
  const navigation = useNavigation()
  const lastResult = useActionData<typeof action>()
  const [copiedText, copyToClipboard] = useCopyToClipboard()
  const hasCopiedText = Boolean(copiedText)

  const { allExistingBoardRoles, shareLink } = useLoaderData<typeof loader>()

  const [form, fields] = useForm({
    // We throw 403 json from action if user is not allowed to edit board
    // Happens only on API requests
    lastResult: lastResult as SubmissionResult<Array<string>>,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema })
    },
    shouldValidate: 'onSubmit',
  })

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.shareBoard

  useEffect(() => {
    const wasFormSubmissionSuccessful =
      lastResult && 'status' in lastResult && lastResult.status === 'success'
    if (wasFormSubmissionSuccessful) {
      form.reset()
    }
  }, [form, lastResult])

  return (
    <Dialog open onClose={() => navigate('..')} className="members-dialog">
      <div className="backdrop" aria-hidden="true" />

      <Dialog.Panel className="panel">
        <Link to=".." className="close-link" aria-label="Close dialog">
          <Close />
        </Link>
        <div className="panel-header">
          <Dialog.Title>Share this board</Dialog.Title>
          <Dialog.Description>Add members to your board.</Dialog.Description>
        </div>

        <Form method="post" {...getFormProps(form)}>
          <label htmlFor={fields.email.id}>Email</label>
          <div className="input-group">
            <input
              {...getInputProps(fields.email, { type: 'email' })}
              disabled={isSubmitting}
              placeholder="johnkun@gmail.com"
            />
            <button
              name={INTENT}
              value={FORM_INTENTS.shareBoard}
              disabled={isSubmitting}
            >
              Add
            </button>
          </div>
          {!fields.email.valid && (
            <div className="error" id={fields.email.errorId}>
              {fields.email.errors}
            </div>
          )}
        </Form>

        <div className="members-list">
          <div className="header">
            <h3>People with access</h3>
            <p>We currently only support the editor role.</p>
          </div>

          <ul>
            {allExistingBoardRoles.map((boardRole) => (
              <li key={boardRole.boardRoleId}>
                <div>
                  <h4>{boardRole.name}</h4>
                  <p>{boardRole.email}</p>
                </div>

                <span>{boardRole.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel-footer">
          <div className="copy-link-wrapper">
            {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
            <button type="button" onClick={() => copyToClipboard(shareLink)}>
              <LinkIcon />
              <span>Copy link</span>
            </button>
            <p>
              {hasCopiedText
                ? 'Copied to clipboard!'
                : 'Share link and collaborate.'}{' '}
            </p>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  )
}

const schema = z.object({
  email: z.string().email(),
})

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireAuthCookie(request)

  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema })

  if (submission.status !== 'success') {
    return submission.reply()
  }

  const boardId = params.id

  invariant(boardId, 'No board ID provided')

  const isUserAllowedToEditBoard = await checkUserAllowedToEditBoard({
    userId,
    boardId,
  })

  // If this ever happens, likely API request, because we currently only support editor role
  // No "Read only" role yet
  // Simply throw 403 authorization error
  if (!isUserAllowedToEditBoard) {
    return json(
      { message: 'You are not allowed to edit this board' },
      { status: 403 }
    )
  }

  const { email } = submission.value

  const result = await addNewBoardMember({
    email,
    boardId,
  })

  if (!result.success) {
    return submission.reply({
      fieldErrors: {
        email: [result.message],
      },
    })
  }

  return jsonWithSuccess(submission.reply(), {
    message: 'Successfully added member to board.',
  })
}
