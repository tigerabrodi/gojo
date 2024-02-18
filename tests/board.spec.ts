import { test } from "@playwright/test";
import { user1Details, user1File, user2Details, user2File } from "./auth.setup";
import fs from "fs";

test("Test board collaboration", async ({ browser }) => {
  // Load storage states for both users
  const user1Context = await browser.newContext({
    storageState: user1File,
  });
  const user2Context = await browser.newContext({
    storageState: user2File,
  });

  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();

  user1Page.on("console", (msg) => console.log(msg.text()));
  user2Page.on("console", (msg) => console.log(msg.text()));

  await user1Page.goto("/boards");
  await user2Page.goto("/boards");

  await user1Page.getByRole("heading", { name: "Boards" }).isVisible();

  // Read user details from JSON files
  const user1 = JSON.parse(fs.readFileSync(user1Details, "utf8"));
  const user2 = JSON.parse(fs.readFileSync(user2Details, "utf8"));

  await user1Page.getByRole("button", { name: "Create board" }).click();
  // await user1Page.waitForURL(/boards\/\d+/);

  await user1Page
    .getByRole("heading", { name: "Board name: Untitled board" })
    .isHidden();

  await user1Page.dblclick("main");

  await user1Page.pause();

  // Cleanup
  await user1Context.close();
  await user2Context.close();
});
