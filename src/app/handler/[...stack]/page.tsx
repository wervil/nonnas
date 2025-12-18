import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";
import { redirect } from "next/navigation";
import Link from "next/link";

type HandlerProps = {
  params: Promise<{ stack?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Handler(props: HandlerProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const stack = params.stack?.[0]; // "sign-in", "sign-up", etc.
  const after = searchParams.after_auth_return_to;

  // ✅ If user is blocked, show a hard-block screen (NO StackHandler)
  if (stack === "sign-in" && searchParams.error === "user_not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white p-6 text-center">
          <h1 className="text-xl font-semibold">Account not found</h1>
          <p className="mt-2 text-sm text-neutral-600">
            This email is not registered. Please use an invite link or contact an admin.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Go to Home
            </Link>

            <Link
              href="/handler/sign-in"
              className="rounded-md bg-gray-50 px-4 py-2 text-sm text-whiteho ver:bg-grey-100 border"
            >
              Try another account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Enforce our post-login guard for sign-in (only when not showing error)
  if (stack === "sign-in") {
    const desired = "/api/auth/sign-in-guard";
    const current = typeof after === "string" ? after : undefined;

    if (current !== desired) {
      redirect(
        `/handler/sign-in?after_auth_return_to=${encodeURIComponent(desired)}`
      );
    }
  }

  return (
    <StackHandler
      fullPage
      app={stackServerApp}
      routeProps={{ params, searchParams }}
      componentProps={{
        SignUp: {
          extraInfo: (
            <p className="mt-4 text-center text-sm text-neutral-500">
              By signing up, you agree to our{" "}
              <a
                href="/terms-of-use"
                className="underline hover:text-neutral-700"
                target="_blank"
                rel="noreferrer"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                className="underline hover:text-neutral-700"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              .
            </p>
          ),
        },
      }}
    />
  );
}
