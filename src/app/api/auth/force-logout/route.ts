import { NextResponse } from "next/server"

function clearStackCookies(req: Request, res: NextResponse) {
  res.cookies.set("stack-access", "", { path: "/", maxAge: 0 })
  res.cookies.set("stack-is-https", "", { path: "/", maxAge: 0 })
  res.cookies.set("__Secure-stack-access", "", { path: "/", maxAge: 0 })
  res.cookies.set("__Host-stack-access", "", { path: "/", maxAge: 0 })

  const cookieHeader = req.headers.get("cookie") || ""
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim()
    if (name?.startsWith("stack-refresh-")) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 })
    }
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const reason = url.searchParams.get("reason") ?? "forced"

  const redirectTo = new URL("/", req.url)
  redirectTo.searchParams.set("error", reason)

  const res = NextResponse.redirect(redirectTo)
  clearStackCookies(req, res)
  return res
}
