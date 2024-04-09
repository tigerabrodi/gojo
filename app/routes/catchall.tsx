import { Link } from '@remix-run/react'

export default function () {
  return (
    <div>
      <h1>Not Found</h1>
      <p>The page you're looking for was not found.</p>
      <Link to="/">Go back home</Link>
    </div>
  )
}
