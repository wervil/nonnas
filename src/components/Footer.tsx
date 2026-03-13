import { useTranslations } from "next-intl"
import { Typography } from "./ui/Typography"

export const Footer = () => {
  const f = useTranslations("footer")

  return (
    <footer className="px-20 py-6 w-full bg-white">
      <div className="max-w-7xl mx-auto flex flex-col gap-3 items-center text-center text-black">


        {/* Copyright */}
        <Typography size="bodyL" className="text-black">
          {f("copy")}
        </Typography>

      </div>
    </footer>
  )
}
