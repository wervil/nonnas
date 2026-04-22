import Image from "next/image";
import Link from "next/link";

type RegisterInviteErrorPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function RegisterInviteErrorPage({
  searchParams,
}: RegisterInviteErrorPageProps) {
  const { code } = await searchParams;
  const isMissingInvite = code === "missing_invite";
  const message = isMissingInvite
    ? "Invite code is required to register. Please use a valid invite link."
    : "This invite code is invalid or expired. Please check your invite link and try again.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-4 flex justify-center">
          <Image src="/logoMain.svg" alt="App logo" width={148} height={88} priority />
        </div>

        <h1 className="text-xl font-semibold text-neutral-900 text-center">
          Registration blocked
        </h1>

        <p className="mt-3 text-sm text-neutral-600 text-center">{message}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2.5 no-underline  text-sm text-neutral-700 hover:bg-neutral-100 transition"
            style={{ color: 'lab(8 0 0)' }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
