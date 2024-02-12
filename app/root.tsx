import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import rootStyles from "./styles/root.css";
import {
  redirect,
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@vercel/remix";
import { getAuthFromRequest } from "./auth/auth";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: rootStyles },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Gojo" },
    {
      name: "description",
      content:
        "Gojo is a site where you can brainstorm ideas with friends in real-time.",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  let userId = await getAuthFromRequest(request);
  if (userId && new URL(request.url).pathname === "/") {
    throw redirect("/login");
  }
  return userId;
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Analytics />
      </body>
    </html>
  );
}
