import Link from "next/link"
import { Typography } from "./ui/Typography"
import { useTranslations } from "next-intl"

export const Footer = () => {
  const f = useTranslations("footer")

  return (
    <footer className="px-20 py-6 w-full bg-primary-hover">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 items-center text-center text-white">

        {/* Legal Links */}
        <div className="flex gap-4 text-sm text-white">
          <Link
            href="/privacy-policy"
            className="underline hover:opacity-80 text-white"
          >
             <span  className="text-white">{f("privacyPolicy")}</span>
          </Link>

          <span className="text-white">|</span>

          <Link
            href="/terms-of-use"
            className="underline hover:opacity-80 text-white"
          >
            <span  className="text-white">{f("termsOfService")}</span>
          </Link>
        </div>

        {/* Copyright */}
        <Typography size="bodyS" className="text-white">
          {f("copy")}
        </Typography>

      </div>
    </footer>
  )
}
