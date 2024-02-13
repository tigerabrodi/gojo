import { cssBundleHref } from "@remix-run/css-bundle";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from "@remix-run/react";
import { Analytics } from "@vercel/analytics/react";
import rootStyles from "./styles/root.css";
import overpassFont from "@fontsource-variable/overpass/index.css";
import {
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
} from "@vercel/remix";
import { getAuthFromRequest } from "./auth/auth";
import { Navigation, navigationLinks } from "./components";
import type { MatchHandle } from "./helpers";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: rootStyles },
  ...navigationLinks(),
  { rel: "stylesheet", href: overpassFont },
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
  const userId = await getAuthFromRequest(request);

  return json({
    isAuthenticated: Boolean(userId),
  });
}

export default function App() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
  const matches = useMatches();

  const shouldHideRootNavigation =
    matches.filter(
      (match) => (match.handle as MatchHandle)?.shouldHideRootNavigation
    ).length > 0;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {!shouldHideRootNavigation && (
          <Navigation isAuthenticated={isAuthenticated} />
        )}
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
        <Analytics />
      </body>
    </html>
  );
}
