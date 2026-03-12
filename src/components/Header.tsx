"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CurrentInternalUser, CurrentUser, useUser } from "@stackframe/stack";
import {
  Download,
  Home,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Settings,
  User,
  UserPlus
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction } from "react";

import { Select } from '@/components/Select';
import Button from '@/components/ui/Button';
import { useEffect, useState } from "react";
import DotLottieGlobe from "./LottieGlobe";

export const button = (
  path: string,
  n: (key: string) => string,
) => {
  if (path === "/add-recipe") {
    return (
      <Link href="/">
        <Button variant="primary">{n("home")}</Button>
      </Link>
    );
  }

  return (
    <Link href="/add-recipe">
      <Button variant="primary">
        <Plus className="mr-2 h-4 w-4" />
        {n("addRecipe")}
      </Button>
    </Link>
  );
};

type Props = {
  hasAdminAccess: boolean;
  countriesOptions?: { label: string; value: string }[];
  selectedCountry?: { label: string; value: string };
  setSelectedCountry?: Dispatch<
    SetStateAction<{ label: string; value: string }>
  >;
  search?: string;
  setSearch?: Dispatch<SetStateAction<string>>;
  user?: CurrentUser | CurrentInternalUser | null;
  isExplorePage?: boolean;
  className?: string;
  exploreState?: "globe" | "map";
  onExport?: () => void;
  isExporting?: boolean;
  // setExploreState?: Dispatch<SetStateAction<boolean>>
};

export const Header = ({
  hasAdminAccess,
  countriesOptions,
  selectedCountry,
  setSelectedCountry,
  search,
  setSearch,
  user,
  isExplorePage = false,
  className,
  exploreState,
  onExport,
  isExporting,
  // setExploreState
}: Props) => {
  const n = useTranslations("navigation");
  const path = usePathname();
  const currentUser = useUser();

  // Helper function to check if a path is active
  const isActive = (href: string) => {
    const currentPath = path || "";
    if (href === "/" && currentPath === "/") return true;
    if (href !== "/" && currentPath.startsWith(href)) return true;
    return false;
  };

  // Dynamic classes based on page type
  const headerBgClass = "bg-white";
  // const iconColorClass = isExplorePage ? 'text-white' : 'text-gray-700'
  const imageFilterClass = "text-[#9BC9C3]";
  // const logoSrc = isExplorePage ? "/logoMain.svg" : "/logoMain.svg" // Keep same logo, maybe invert if needed? assuming logo looks ok or needs specific invert

  // Always justify-between to keep logo left and content right
  const headerJustifyClass = "justify-between";
  const navVisibilityClass = isExplorePage ? "flex" : "hidden md:flex";

  // Helper to render user icons (reused for desktop and mobile if needed, but structure differs)
  // For mobile dropdown, we'll render DropdownMenuItem

  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    // Set initial width
    setWindowWidth(window.innerWidth);

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header
      className={`flex items-center ${headerJustifyClass} px-3 md:px-20 pt-3 gap-4 ${headerBgClass} ${className} ${exploreState === "map" ? " fixed top-0 w-full " : ""}`}
    >
      <Link className="shrink-0" href="/">
        {/* For logo on dark background, we might want to apply a filter or use a different asset if available. 
            Using brightness/invert for now if it's SVG text-based, or keeping as is if it has its own background. 
            Assuming logoMain.svg handles dark mode or we apply filter. Let's apply partial filter for visibility if needed.
        */}
        <Image
          src="/logoMain.svg"
          width={windowWidth < 779 ? 80 : 120}
          height={windowWidth < 779 ? 60 : 90}
          alt="logo"
        />
      </Link>
      <div className={`items-center gap-1 relative ${navVisibilityClass}`}>
        {onExport && user && (
          <button
            onClick={onExport}
            disabled={isExporting}
            className="mr-2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Export filtered recipes to ZIP"
          >
            {isExporting ? (
              <Loader2
                className={`animate-spin ${isExplorePage ? "text-white" : "text-[#9BC9C3]"
                  }`}
                size={20}
              />
            ) : (
              <Download
                className={isExplorePage ? "text-white" : "text-[#121212B2]"}
                size={20}
              />
            )}
          </button>
        )}

        {setSearch ? (
          <div className="flex items-center gap-1 border-none rounded-md bg-[#F1F1F1CC] p-2 pl-2 mr-2">
            <Image
              src="/search.svg"
              width={20}
              height={20}
              alt="search icon"
              className=""
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="px-2 py-1 w-full max-w-md border-0 outline-0 italic text-black min-w-25"
            />
          </div>
        ) : null}
        {countriesOptions ? (
          <>
            <Select
              options={countriesOptions}
              selectedOption={selectedCountry}
              setSelectedOption={setSelectedCountry}
            />
            <div className="flag-icon" />
          </>
        ) : null}
      </div>

      {/* Right Side Container: Always visible (flex), split into Desktop vs Mobile content */}
      <div className="flex items-center gap-5">
        {/* Desktop View (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center gap-5">
          {/* Home Icon - placed next to Globe */}
          <Link href="/">
            <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`cursor-pointer transition-opacity ${isActive("/") ? "text-white" : `text-[#9BC9C3] ${imageFilterClass}`}`}
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </Link>

          {/* Only show Globe icon here if NOT explore page. If explore page, Home icon moves to right. */}
          {!isExplorePage && (
            <Link
              href="/explore"
              aria-label="Explore"
              className="inline-flex items-center"
            >
              <span className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/explore") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                <DotLottieGlobe
                  src="/lottie/earth-lottie.json"
                  size={40}
                  className={`w-10 h-10 cursor-pointer transition-opacity ${isActive("/explore") ? "opacity-80" : "hover:opacity-80"}`}
                />
              </span>
            </Link>
          )}

          {user ? (
            hasAdminAccess ? (
              <>
                <Link href="/dashboard">
                  <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/dashboard") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                    <Settings
                      className={`w-7 h-7 transition-opacity ${isActive("/dashboard") ? "text-white" : imageFilterClass}`}
                    />
                  </div>
                </Link>
                <Link href="/profile">
                  <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/profile") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                    <User
                      className={`w-7 h-7 transition-opacity ${isActive("/profile") ? "text-white" : imageFilterClass}`}
                    />
                  </div>
                </Link>
                <Link href="/messages">
                  <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/messages") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                    <MessageCircle
                      className={`w-7 h-7 transition-opacity ${isActive("/messages") ? "text-white" : imageFilterClass}`}
                    />
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile">
                  <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/profile") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                    <Settings
                      className={`w-7 h-7 transition-opacity ${isActive("/profile") ? "text-white" : imageFilterClass}`}
                    />
                  </div>
                </Link>
                <Link href="/messages">
                  <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors ${isActive("/messages") ? "bg-[#9BC9C3]" : "hover:bg-gray-100"}`}>
                    <MessageCircle
                      className={`w-7 h-7 transition-opacity ${isActive("/messages") ? "text-white" : imageFilterClass}`}
                    />
                  </div>
                </Link>
              </>
            )
          ) : null}
          {currentUser ? (
            <button
              onClick={() => currentUser?.signOut()}
              className={`inline-flex items-center justify-center w-10 h-10 transition-colors hover:bg-gray-100`}
              title="Log out"
            >
              <LogOut className={`w-7.5 h-7.5 transition-opacity ${imageFilterClass}`} />
            </button>
          ) : (
            <Link href="/handler/sign-in">
              <div className={`inline-flex items-center justify-center w-10 h-10 transition-colors hover:bg-gray-100`} title="Log in">
                <UserPlus className={`w-7.5 h-7.5 transition-opacity ${imageFilterClass}`} />
              </div>
            </Link>
          )}
          {button(path || "", n as (key: string) => string)}
        </div>

        {/* Mobile View (Dropdown Menu) */}
        <div className="flex lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="shrink" className="p-2">
                <Menu className={`w-7.5 h-7.5 ${imageFilterClass}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white z-100">
              <DropdownMenuItem asChild>
                <Link
                  href="/"
                  className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                >
                  <Home className={`mr-2 h-4 w-4 ${isActive("/") ? "text-white" : imageFilterClass}`} /> Home
                </Link>
              </DropdownMenuItem>
              {!isExplorePage && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/explore"
                    className={`cursor-pointer w-full flex items-center px-0! gap-1 rounded-md transition-colors ${isActive("/explore") ? "bg-[#9BC9C3] text-white" : "text-[#9BC9C3]!"}`}
                  >
                    <DotLottieGlobe
                      src="/lottie/earth-lottie.json"
                      size={30}
                      className="w-7.5 h-7.5 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                    Explore
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Login/Logout Button */}
              {currentUser ? (
                <DropdownMenuItem asChild>
                  <button
                    onClick={() => currentUser?.signOut()}
                    className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${imageFilterClass} text-[#9BC9C3]!`}
                  >
                    <LogOut className={`mr-2 h-4 w-4 ${imageFilterClass}`} /> Log out
                  </button>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link
                    href="/handler/sign-in"
                    className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${imageFilterClass} text-[#9BC9C3]!`}
                  >
                    <LogIn className={`mr-2 h-4 w-4 ${imageFilterClass}`} /> Log in
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {user ? (
                <>
                  {hasAdminAccess ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard"
                          className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/dashboard") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                        >
                          <Settings
                            className={`mr-2 h-4 w-4 ${isActive("/dashboard") ? "text-white" : imageFilterClass}`}
                          />{" "}
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/profile") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                        >
                          <User
                            className={`mr-2 h-4 w-4 ${isActive("/profile") ? "text-white" : imageFilterClass}`}
                          />{" "}
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/messages"
                          className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/messages") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                        >
                          <MessageCircle
                            className={`mr-2 h-4 w-4 ${isActive("/messages") ? "text-white" : imageFilterClass}`}
                          />{" "}
                          Messages
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile"
                          className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/profile") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                        >
                          <Settings
                            className={`mr-2 h-4 w-4 ${isActive("/profile") ? "text-white" : imageFilterClass}`}
                          />{" "}
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/messages"
                          className={`cursor-pointer w-full flex items-center rounded-md transition-colors ${isActive("/messages") ? "bg-[#9BC9C3] text-white" : `${imageFilterClass} text-[#9BC9C3]!`}`}
                        >
                          <MessageCircle
                            className={`mr-2 h-4 w-4 ${isActive("/messages") ? "text-white" : imageFilterClass}`}
                          />{" "}
                          Messages
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                {path === "/add-recipe" ? (
                  <Link
                    href="/"
                    className={`cursor-pointer w-full text-[#9BC9C3]!
 ${imageFilterClass}`}
                  >
                    {n("home")}
                  </Link>
                ) : (
                  <Link
                    href="/add-recipe"
                    className={`cursor-pointer w-full text-white! bg-[#9BC9C3] ${imageFilterClass}`}
                  >
                    <Plus className={`mr-2 h-4 w-4 `} /> {n("addRecipe")}
                  </Link>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
