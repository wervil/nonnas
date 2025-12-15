import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";

export default function Handler(props: { params: any; searchParams: any }) {
  return (
    <StackHandler
      fullPage
      app={stackServerApp}
      routeProps={props}
      componentProps={{
        SignUp: {
          extraInfo: (
            <p className="mt-4 text-center text-sm text-neutral-500">
              By signing up, you agree to our{" "}
              <a
                href="/terms-of-use"
                className="underline hover:text-neutral-700"
                target="_blank"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                className="underline hover:text-neutral-700"
                target="_blank"
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
