import type { LinksFunction } from '@vercel/remix'

import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { Form, useActionData, useNavigation } from '@remix-run/react'
import { redirect } from '@vercel/remix'
import { z } from 'zod'

import { login } from './queries'

import { redirectIfLoggedInLoader, setAuthOnResponse } from '~/auth'
import { FORM_INTENTS, INTENT } from '~/helpers'
import authStyles from '~/styles/auth.css'

export const loader = redirectIfLoggedInLoader

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: authStyles },
]

export default function Login() {
  const lastResult = useActionData<typeof action>()
  const navigation = useNavigation()

  const [form, fields] = useForm({
    lastResult: lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema })
    },
    shouldValidate: 'onSubmit',
  })

  const isSubmitting = navigation.formData?.get(INTENT) === FORM_INTENTS.login

  return (
    <main>
      <div className="heading-container">
        <h1>Gojo</h1>
        <p>Collaborate on ideas by brainstorming together.</p>
      </div>

      <Form method="post" {...getFormProps(form)}>
        <h2>Login</h2>

        <div className="groups">
          <div className="group">
            <label htmlFor={fields.email.id}>Email</label>
            <input
              {...getInputProps(fields.email, { type: 'email' })}
              placeholder="johnkun@gmail.com"
            />
            {!fields.email.valid && (
              <div className="error" id={fields.email.errorId}>
                {fields.email.errors}
              </div>
            )}
          </div>

          <div className="group">
            <div className="label-group">
              <label htmlFor={fields.password.id}>Password</label>
              <span className="helper-text" id={fields.password.descriptionId}>
                Password must be at least 6 characters.
              </span>
            </div>
            <input
              {...getInputProps(fields.password, { type: 'password' })}
              placeholder="Password"
            />
            {!fields.password.valid && (
              <div className="error" id={fields.password.errorId}>
                {fields.password.errors}
              </div>
            )}
          </div>
        </div>

        <button
          name={INTENT}
          value={FORM_INTENTS.login}
          disabled={isSubmitting}
        >
          Login
        </button>
      </Form>
    </main>
  )
}

const schema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
})

export async function action({ request }: { request: Request }) {
  const formData = await request.formData()
  const submission = parseWithZod(formData, { schema })

  if (submission.status !== 'success') {
    return submission.reply()
  }

  const { email, password } = submission.value

  const userId = await login(email, password)
  if (!userId) {
    return submission.reply({
      fieldErrors: {
        email: ['Invalid email or password.'],
      },
    })
  }

  let response = redirect('/boards')
  // TODO: Toast message
  return setAuthOnResponse(response, userId)
}
