import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";

type HandlerProps = {
  params: Promise<{ stack?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Handler(props: HandlerProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

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
