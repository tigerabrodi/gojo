import type { LinksFunction } from "@vercel/remix";
import navigationStyles from "./Navigation.css";
import { Kakashi } from "~/icons";
import { Link, useLocation } from "@remix-run/react";

export const navigationLinks: LinksFunction = () => [
  { rel: "stylesheet", href: navigationStyles },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav>
      <div className="logo">
        <Link to="/" aria-label="home">
          <Kakashi />
        </Link>
        <span>Gojo</span>
      </div>

      <div className="links">
        <Link
          to="/login"
          className={location.pathname === "/login" ? "active" : ""}
        >
          Login
        </Link>
        <Link
          to="/register"
          className={location.pathname === "/register" ? "active" : ""}
        >
          Register
        </Link>
      </div>
    </nav>
  );
}
