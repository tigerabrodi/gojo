import { Form, useActionData, useNavigation } from "@remix-run/react";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import type { ActionFunctionArgs, LinksFunction } from "@vercel/remix";
import { redirect } from "@vercel/remix";
import { redirectIfLoggedInLoader, setAuthOnResponse } from "~/auth";
import { createUser } from "./queries";
import { checkUserExists } from "./validate";
import authStyles from "~/styles/auth.css";
import { FORM_INTENTS, INTENT } from "~/helpers";

export const loader = redirectIfLoggedInLoader;

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: authStyles },
];

export default function Register() {
  const lastResult = useActionData<typeof action>();
  const navigation = useNavigation();

  const [form, fields] = useForm({
    lastResult: lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onSubmit",
  });

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.register;

  return (
    <main>
      <div className="heading-container">
        <h1>Gojo</h1>
        <p>Collaborate on ideas by brainstorming together.</p>
      </div>

      <Form method="post" {...getFormProps(form)}>
        <h2>Register</h2>

        <div className="groups">
          <div className="group">
            <label htmlFor={fields.name.id}>Name</label>
            <input
              {...getInputProps(fields.name, { type: "text" })}
              placeholder="John Kun"
            />
            {!fields.name.valid && (
              <div className="error">{fields.name.errors}</div>
            )}
          </div>

          <div className="group">
            <label htmlFor={fields.email.id}>Email</label>
            <input
              {...getInputProps(fields.email, { type: "email" })}
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
              {...getInputProps(fields.password, { type: "password" })}
              placeholder="Password"
            />
            {!fields.password.valid && (
              <div className="error" id={fields.password.errorId}>
                {fields.password.errors}
              </div>
            )}
          </div>

          <div className="group">
            <label htmlFor={fields.confirmPassword.id}>Confirm Password</label>
            <input
              {...getInputProps(fields.confirmPassword, { type: "password" })}
            />
            {!fields.confirmPassword.valid && (
              <div className="error" id={fields.confirmPassword.errorId}>
                {fields.confirmPassword.errors}
              </div>
            )}
          </div>
        </div>

        <button
          name={INTENT}
          value={FORM_INTENTS.register}
          disabled={isSubmitting}
        >
          Register
        </button>
      </Form>
    </main>
  );
}

const schema = z.object({
  name: z.string(),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const { email, password, confirmPassword } = submission.value;

  if (password !== confirmPassword) {
    return submission.reply({
      fieldErrors: {
        confirmPassword: ["Passwords do not match."],
      },
    });
  }

  const userExists = await checkUserExists(email);

  if (userExists) {
    return submission.reply({
      fieldErrors: {
        email: ["User with this email already exists."],
      },
    });
  }

  let user = await createUser(email, password);
  return setAuthOnResponse(redirect("/boards"), user.id);
}
