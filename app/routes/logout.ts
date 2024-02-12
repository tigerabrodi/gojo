import { redirectWithClearedCookie } from "~/auth";

export function action() {
  return redirectWithClearedCookie();
}
