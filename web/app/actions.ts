"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, describeApiError, type Bug } from "@/lib/api";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export interface BugFormValues {
  title: string;
  description: string;
  stepsToReproduce: string;
  severity: string;
}

export interface CreateBugState {
  error?: string;
  // What was sent, so the form can show it again: React resets a form after its action runs.
  values?: BugFormValues;
  // Counts failed submits; the form uses it as a key so every field, the select included,
  // starts again from these values.
  attempt?: number;
}

// Used with useActionState: a validation error comes back to the form instead of an error page.
export async function createBug(_prev: CreateBugState, form: FormData): Promise<CreateBugState> {
  const values: BugFormValues = {
    title: field(form, "title"),
    description: field(form, "description"),
    stepsToReproduce: field(form, "stepsToReproduce"),
    severity: field(form, "severity"),
  };
  let bug: Bug;
  try {
    bug = await api<Bug>("/bugs", { method: "POST", body: JSON.stringify(values) });
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) return { error: describeApiError(err), values, attempt: (_prev.attempt ?? 0) + 1 };
    throw err;
  }
  revalidatePath("/");
  redirect(`/bugs/${bug.id}`);
}

export async function updateStatus(id: number, form: FormData) {
  await api(`/bugs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: field(form, "status") }),
  });
  revalidatePath(`/bugs/${id}`);
}

export async function deleteBug(id: number) {
  await api(`/bugs/${id}`, { method: "DELETE" });
  revalidatePath("/");
  redirect("/");
}
