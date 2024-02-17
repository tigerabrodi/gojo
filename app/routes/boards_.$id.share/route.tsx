import { Dialog } from "@headlessui/react";
import {
  Form,
  Link,
  useActionData,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";
import { FORM_INTENTS, INTENT } from "~/helpers";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import type { LinksFunction } from "@vercel/remix";
import styles from "./styles.css";
import { Close } from "~/icons";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export default function BoardShareRoute() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const lastResult = useActionData<typeof action>();

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema });
    },
    shouldValidate: "onSubmit",
  });

  const isSubmitting =
    navigation.formData?.get(INTENT) === FORM_INTENTS.shareBoard;

  return (
    <Dialog open onClose={() => navigate("..")} className="members-dialog">
      <div className="backdrop" aria-hidden="true" />

      <Dialog.Panel className="panel">
        <Link to=".." className="close-link" aria-label="close">
          <Close />
        </Link>
        <div className="panel-header">
          <Dialog.Title>Share this board</Dialog.Title>
          <Dialog.Description>Add members to your board.</Dialog.Description>
        </div>

        <Form method="post" {...getFormProps(form)}>
          <label htmlFor={fields.email.id}>Email</label>
          <div className="input-group">
            <input
              {...getInputProps(fields.email, { type: "email" })}
              disabled={isSubmitting}
              placeholder="johnkun@gmail.com"
            />
            <button
              name={INTENT}
              value={FORM_INTENTS.shareBoard}
              disabled={isSubmitting}
            >
              Add
            </button>
          </div>
          {!fields.email.valid && (
            <div className="error" id={fields.email.errorId}>
              {fields.email.errors}
            </div>
          )}
        </Form>

        <div className="members-list">
          <div className="header">
            <h3>People with access</h3>
            <p>We currently only support the editor role.</p>
          </div>

          <ul>
            <li>
              <div>
                <h4>Tiger Abrodi</h4>
                <p>tiger@gmail.com</p>
              </div>

              <span>Owner</span>
            </li>
          </ul>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}

const schema = z.object({
  email: z.string().email(),
});

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  return submission.reply();
}
