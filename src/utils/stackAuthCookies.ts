import { NextResponse } from "next/server";

/** Clear Stack session cookies so the user is fully signed out. */
export function clearStackCookies(req: Request, res: NextResponse) {
  res.cookies.set("stack-access", "", { path: "/", maxAge: 0 });
  res.cookies.set("stack-is-https", "", { path: "/", maxAge: 0 });
  res.cookies.set("__Secure-stack-access", "", { path: "/", maxAge: 0 });
  res.cookies.set("__Host-stack-access", "", { path: "/", maxAge: 0 });

  const cookieHeader = req.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith("stack-refresh-")) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }
}
