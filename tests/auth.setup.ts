import { test as setup } from "@playwright/test";

import { createAccount, createRandomUser } from "./utils";

const authFile = "playwright/.auth/user.json";

setup("authenticate", async ({ request }) => {
  const user = createRandomUser();
  await createAccount({
    email: user.email,
    password: user.password,
    name: user.name,
  });

  await request.post("/login", {
    form: {
      email: user.email,
      password: user.password,
    },
  });

  await request.storageState({ path: authFile });
});
