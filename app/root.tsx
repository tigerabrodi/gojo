import overpassFont from '@fontsource-variable/overpass/index.css'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'
import { Analytics } from '@vercel/analytics/react'
import {
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
} from '@vercel/remix'
import { useEffect } from 'react'
import { ToastContainer, toast as notify } from 'react-toastify'
import toastStyles from 'react-toastify/dist/ReactToastify.css'
import { getToast } from 'remix-toast'

import { getAuthFromRequest } from './auth/auth'
import { Navigation, navigationLinks } from './components'
import rootStyles from './styles/root.css'

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: 'stylesheet', href: cssBundleHref }] : []),
  ...navigationLinks(),
  { rel: 'stylesheet', href: rootStyles },
  { rel: 'stylesheet', href: overpassFont },
  { rel: 'stylesheet', href: toastStyles },
]

export const meta: MetaFunction = () => {
  return [
    { title: 'Gojo' },
    {
      name: 'description',
      content:
        'Gojo is a site where you can brainstorm ideas with friends in real-time.',
    },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getAuthFromRequest(request)

  const { toast, headers } = await getToast(request)
  return json({ toast, isAuthenticated: Boolean(userId) }, { headers })
}

export default function App() {
  const { isAuthenticated, toast } = useLoaderData<typeof loader>()

  useEffect(() => {
    if (toast) {
      notify(toast.message, { type: toast.type })
    }
  }, [toast])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Navigation isAuthenticated={isAuthenticated} />
        <ToastContainer autoClose={2500} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Analytics />
      </body>
    </html>
  )
}
