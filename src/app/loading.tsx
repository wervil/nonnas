import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return <div className="h-[100vh] w-full flex flex-row items-center justify-center gap-1 "><LoaderCircle className="w-5 h-5 animate-spin" /> Loading..</div>;
}
