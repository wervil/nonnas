import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">

          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <Image
              src="/logoMain.svg"      // or /logo.png
              alt="App logo"
              width={148}
              height={88}
              priority
            />
          </div>
          {/* <h1 className="text-xl font-semibold text-neutral-900">
          Account not found
        </h1> */}

          <p className="mt-2 text-md text-neutral-600">
            We are in beta, if you have already signed up with our beta program you may sign in now. If not feel free to close this window and browse the virtual book.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {/* Primary OAuth-style action */}
            <Link
              href="/handler/sign-in"
              className="inline-flex items-center no-underline justify-center rounded-md hover:text-white visited:text-white bg-neutral-900 px-4 py-2.5 text-sm font-medium hover:bg-neutral-800 transition"
              style={{ color: 'white' }}
            >
              Continue with another account
            </Link>

            {/* Secondary action */}
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 no-underline  text-sm text-neutral-700 hover:bg-neutral-100 transition"
              style={{ color: 'lab(8 0 0)' }}
            >
              Back to home
            </Link>
          </div>

          {/* Optional OAuth-style helper text */}
          <p className="mt-6 text-xs text-neutral-500">
            Need access? Ask an admin to send you an invite.
          </p>
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

  const isAuthForm = stack === "sign-in" || stack === "sign-up";

  return (
    <div className={isAuthForm ? "min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6" : ""}>
      {isAuthForm ? (
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logoMain.svg"
              width={120}
              height={90}
              alt="logo"
              priority
            />
          </div>
          {stack === "sign-in" && (
            <p className="mt-2 text-md text-neutral-600 text-center mb-6 border border-gray p-2 rounded-[20px]">
              We are in beta, if you have already signed up with our beta program you may sign in now. If not feel free to close this window and browse the virtual book.
            </p>
          )}
          <StackHandler
            fullPage={false}
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
        </div>
      ) : (
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
      )}
    </div>
  );
}
