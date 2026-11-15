"use client";

import { useActionState } from "react";
import { createBug, type CreateBugState } from "@/app/actions";
import { SEVERITIES } from "@/lib/api";

export function BugForm() {
  const [state, formAction, pending] = useActionState<CreateBugState, FormData>(createBug, {});
  const values = state.values;

  return (
    <form key={state.attempt ?? 0} action={formAction} className="stack">
      <label>
        Title
        <input
          name="title"
          required
          minLength={3}
          maxLength={120}
          placeholder="Short, specific summary"
          defaultValue={values?.title}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "form-error" : undefined}
        />
      </label>
      {state.error && (
        <p id="form-error" role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <label>
        Severity
        <select name="severity" defaultValue={values?.severity || "medium"}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label>
        What happened? (expected vs. actual)
        <textarea name="description" maxLength={5000} defaultValue={values?.description} />
      </label>
      <label>
        Steps to reproduce
        <textarea name="stepsToReproduce" maxLength={5000} placeholder={"1. Go to…\n2. Click…\n3. See error"} defaultValue={values?.stepsToReproduce} />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create bug"}</button>
    </form>
  );
}
