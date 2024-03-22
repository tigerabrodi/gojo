import type { LinksFunction } from '@vercel/remix'

import { Link, useLocation } from '@remix-run/react'

import navigationStyles from './Navigation.css'

import { Kakashi } from '~/icons'

export const NAVIGATION_PORTAL_ID = 'navigation-portal'

export const navigationLinks: LinksFunction = () => [
  { rel: 'stylesheet', href: navigationStyles },
]

export function Navigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation()

  return (
    <nav>
      <div className="logo">
        <Link to="/" aria-label="home" className="logo" prefetch="render">
          <Kakashi />
          <span>Gojo</span>
        </Link>
      </div>

      <div id={NAVIGATION_PORTAL_ID} />

      {isAuthenticated ? (
        <form method="post" action="/logout">
          <button>Logout</button>
        </form>
      ) : (
        <div className="links">
          <Link
            to="/login"
            prefetch="render"
            className={location.pathname === '/login' ? 'active' : ''}
          >
            Login
          </Link>
          <Link
            to="/register"
            prefetch="render"
            className={location.pathname === '/register' ? 'active' : ''}
          >
            Register
          </Link>
        </div>
      )}
    </nav>
  )
}
