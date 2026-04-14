"use client";

import HTMLFlipBook from "react-pageflip";
import "./Book.css";

import { Recipe } from "@/db/schema";
import { convertRecipesToPages } from "@/utils/convertRecipesToPages";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ImagesModal } from "../ui/ImagesModal";
// import { generateTOCpages } from '@/utils/generateTOCpages'
// import { Typography } from '../ui/Typography'
import { useUser } from "@stackframe/stack";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import CommentSection from "../Comments/CommentSection";

type Props = {
  recipes: Recipe[];
  tableOfContents: Record<string, Recipe[]>;
  initialRecipeId?: number | null;
};

export type BookHandle = {
  goToPage: (pageNumber: number) => void;
  goToRecipe: (recipeId: number) => void;
};

const HEADER_HEIGHT = 80; //200
const TOC_ITEM_HEIGHT = 40;

// Avatar generation utility
const PALETTES = [
  ["#dc2626", "#ea580c", "#f59e0b"],
  ["#059669", "#10b981", "#34d399"],
  ["#2563eb", "#3b82f6", "#60a5fa"],
  ["#7c3aed", "#8b5cf6", "#a78bfa"],
  ["#db2777", "#ec4899", "#f472b6"],
  ["#0e7490", "#0f766e", "#047857"],
  ["#14b8a6", "#0d9488", "#0891b2"],
];

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function generateAvatarSvgUri(name: string, countryCode: string): string {
  const seed = hashStr(name + countryCode);
  const [c0, c1, c2] = PALETTES[seed % PALETTES.length];
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c0};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${c1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${c2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad${seed})" />
      <text x="50" y="50" text-anchor="middle" dy=".3em" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="32" font-weight="600" fill="white">
        ${initials}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Number of pages before recipes start (cover + TOC pages)
const PAGES_BEFORE_RECIPES = 1; // Just cover page, TOC is commented out

export const Book = forwardRef<BookHandle, Props>(
  ({ recipes, tableOfContents, initialRecipeId }, ref) => {
    const l = useTranslations("labels");
    const user = useUser();
    const [isMobile, setIsMobile] = useState(false);
    const [isSinglePage, setIsSinglePage] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);

    const [images, setImages] = useState<string[] | null>(null);
    // const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
    const [currentRecipeId, setCurrentRecipeId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    // Sequenced cover-open animation: slide container first, then flip hardcover.
    // 'closed'  — book sits off-center (translateX(-35%)) with cover shut
    // 'sliding' — 1000ms slide to center, flipbook is NOT asked to flip yet
    // 'open'    — container is centered; flipbook cover flip may run
    const [coverPhase, setCoverPhase] = useState<'closed' | 'sliding' | 'open'>('closed');
    const totalPages = 1 + recipes.length * 2;

    // Comment Section state for recipe-specific discussions
    const [commentSection, setCommentSection] = useState<{
      open: boolean;
      recipeId: number;
      nonnaName: string;
      titleName: string;
      photo: string | null;
      countryCode: string;
    }>({
      open: false,
      recipeId: 0,
      nonnaName: "",
      titleName: "",
      photo: null,
      countryCode: "",
    });

    const getCurrentLayout = () => {
      if (flipbookRef.current) {
        // setOrientation(
        //   flipbookRef.current.pageFlip()?.getOrientation() || 'landscape'
        // )
      }
    };

    useEffect(() => {
      const recipesQuantity = Object.entries(tableOfContents).reduce(
        (acc, entry) => ({
          ...acc,
          [entry[0]]: (entry[1] as Recipe[]).length * 2,
        }),
        {},
      );
      const countriesQuantity = Object.keys(recipesQuantity).length;
      const maxRecipesPerPage = Math.floor(
        (contentHeight - 52) / TOC_ITEM_HEIGHT,
      );
      // setRecipesPerPage(maxRecipesPerPage)
      let contentsPages = Math.ceil(countriesQuantity / maxRecipesPerPage);
      if (contentsPages % 2 !== 0) {
        contentsPages++;
      }

      // Create page ranges for each country
      const pageRanges: Record<string, string> = {};
      let currentPage = contentsPages + 3;
      for (const [country, pages] of Object.entries(recipesQuantity)) {
        const numPages = Number(pages);
        const startPage = currentPage;
        const endPage = currentPage + numPages - 1;
        pageRanges[country] = `${startPage}-${endPage}`;
        currentPage = endPage + 1;
      }
      // setPageRanges(pageRanges)
    }, [contentHeight, tableOfContents]);

    const checkScreenSize = useCallback(() => {
      const mobile = window.innerWidth < 776; //1024

      setIsMobile(mobile);
      // Switch to single page if it's mobile OR if available space is too narrow
      setIsSinglePage(
        mobile || window.innerWidth < 1200 || recipes.length === 0,
      );

      setContentHeight(window.innerHeight - HEADER_HEIGHT);
      // Call layout check after screen size changes
      setTimeout(getCurrentLayout, 100);
    }, [recipes.length]);

    useEffect(() => {
      checkScreenSize();
      window.addEventListener("resize", checkScreenSize);

      return () => window.removeEventListener("resize", checkScreenSize);
    }, [checkScreenSize]);

    useEffect(() => {
      getCurrentLayout();
      const bookContainer = document.querySelector(".book-container");
      if (!bookContainer) return;

      const resizeObserver = new ResizeObserver(() => {
        setTimeout(getCurrentLayout, 100);
      });

      resizeObserver.observe(bookContainer);

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    const flipbookRef = useRef<{
      pageFlip: () => {
        flipNext: () => void;
        flipPrev: () => void;
        flip: (pageNumber: number) => void;
        getOrientation: () => "landscape" | "portrait";
      };
    } | null>(null);
    const lastPageRef = useRef(0);
    useEffect(() => {
      lastPageRef.current = currentPage;
    }, [currentPage]);

    // Guards against rapid clicks mid-animation, which caused abrupt cuts
    // (both during the cover slide and during regular page flips).
    // Duplicated as state so the arrow buttons can render a disabled style.
    const isAnimatingRef = useRef(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const FLIP_DURATION = 1000;
    const COVER_SLIDE_DURATION = 500;
    const lockAnimation = (ms: number) => {
      isAnimatingRef.current = true;
      setIsAnimating(true);
      setTimeout(() => {
        isAnimatingRef.current = false;
        setIsAnimating(false);
      }, ms);
    };

    const isPrevDisabled = isAnimating || currentPage === 0 || recipes.length === 0;
    // Use ref (updated in onFlip) so double-page mode gets correct page immediately
    const pageForDisable = lastPageRef.current;
    const isNextDisabled =
      isAnimating ||
      totalPages <= 1 ||
      (isSinglePage
        ? pageForDisable >= totalPages - 1
        : pageForDisable >= totalPages - 2);

    const nextPage = useCallback(() => {
      console.log('nextPage called - currentPage:', currentPage, 'isNextDisabled:', isNextDisabled);
      if (isNextDisabled) return;
      if (isAnimatingRef.current) return;
      // On the cover: slide first, then open. Single-page / mobile has no slide offset,
      // so skip straight to the flip.
      if (currentPage === 0 && coverPhase === 'closed' && !isSinglePage) {
        lockAnimation(FLIP_DURATION);
        setCoverPhase('open');
        flipbookRef.current?.pageFlip()?.flipNext();
        return;
      }
      lockAnimation(FLIP_DURATION);
      flipbookRef.current?.pageFlip()?.flipNext();
    }, [isNextDisabled, currentPage, coverPhase, isSinglePage]);

    const prevPage = useCallback(() => {
      console.log('prevPage called - currentPage:', currentPage, 'isPrevDisabled:', isPrevDisabled);
      if (isAnimatingRef.current) return;
      // When about to flip back to the cover, start the slide-left BEFORE the flip
      // so it runs concurrently (mirrors how opening sets 'open' before flipNext)
      if (currentPage <= 2 && coverPhase === 'open' && !isSinglePage) {
        setCoverPhase('closed');
      }
      lockAnimation(FLIP_DURATION);
      flipbookRef.current?.pageFlip()?.flipPrev();
    }, [currentPage, coverPhase, isSinglePage, isPrevDisabled]);

    const goToPage = useCallback((pageNumber: number) => {
      console.log("Book: goToPage called with:", pageNumber);
      if (flipbookRef.current) {
        flipbookRef.current.pageFlip()?.flip(pageNumber);
      }
    }, []);

    // Find the page number for a specific recipe ID
    const getPageNumberForRecipe = useCallback(
      (recipeId: number): number => {
        const recipeIndex = recipes.findIndex((r) => r.id === recipeId);
        console.log("Book: Recipe index in array:", recipeIndex);
        if (recipeIndex === -1) return 0;
        // Each recipe takes 2 pages, and there's a cover page at the start
        // In double-page mode, ensure we start on an even page number (left page of spread)
        const pageNumber = PAGES_BEFORE_RECIPES + recipeIndex * 2;
        return pageNumber;
      },
      [recipes],
    );

    const goToRecipe = useCallback(
      (recipeId: number) => {
        console.log("Book: goToRecipe called for ID:", recipeId);
        const recipeIndex = recipes.findIndex((r) => r.id === recipeId);
        console.log("Book: Recipe index in array:", recipeIndex);
        const pageNumber = getPageNumberForRecipe(recipeId);
        console.log("Book: Calculated page number:", pageNumber);
        goToPage(pageNumber);
      },
      [getPageNumberForRecipe, goToPage, recipes],
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      goToPage,
      goToRecipe,
    }));

    // Handle initial recipe navigation
    useEffect(() => {
      if (initialRecipeId && recipes.length > 0) {
        // Deep-link into a specific Nonna: skip the slide-then-open intro entirely.
        setCoverPhase('open');
        setCurrentRecipeId(initialRecipeId);
        // Small delay to ensure flipbook is fully initialized
        const timer = setTimeout(() => {
          goToRecipe(initialRecipeId);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [initialRecipeId, recipes.length, goToRecipe]); // Added recipes.length to dependency to retry if loaded late

    // Handle updates to the recipe list (e.g. search/filter)
    useEffect(() => {
      // When the recipe list changes (search/filter), effectively "reload" the book.
      // Always reset to the cover (Page 0) and clear the active recipe.
      console.log("Book: Recipes list changed, resetting to cover");
      if (currentPage !== 0) {
        setCurrentPage(0);
      }
      setCurrentRecipeId(null);
      setCoverPhase('closed');
    }, [recipes]); // Re-run whenever the recipes array reference changes (new filter)

    return (
      <div className="book-root h-[calc(100vh-80px)] overflow-hidden flex flex-row relative">
        <div className="transition-all duration-300 ease-in-out h-full relative w-full">
          <div
            className="
  wrap
  min-h-[calc(100vh-100px)]
  min-[391px]:!min-h-[80%]
"
          >
            <div className="custom-container flex justify-center items-center h-full relative">
              <button
                className={`relative md:absolute md:top-1/2 md:-translate-y-1/2 left-2 z-2 ${isPrevDisabled
                  ? "opacity-30 cursor-not-allowed pointer-events-none"
                  : "cursor-pointer hover:scale-110 transition-transform"
                  }`}
                onClick={prevPage}
                disabled={isPrevDisabled}
                style={{ color: "white", fontSize: 20 }}
              >
                <div className="bg-white rounded-md p-3 sm:p-4">
                  <ArrowLeft
                    size={32}
                    className="w-8 h-8 sm:w-10 sm:h-10"
                    color="black"
                  />
                </div>
              </button>

              <div
                className="book-container"
                style={{
                  transition: "transform 500ms ease",
                  transform:
                    coverPhase === 'closed' && !isSinglePage
                      ? `translateX(-${(isMobile ? 300 : contentHeight * 0.75) / 2}px)`
                      : "translateX(0)",
                  ...(isSinglePage
                    ? {
                      width: isMobile ? "300px" : `${contentHeight * 0.75}px`,
                      maxWidth: "100%",
                    }
                    : {}),
                }}
              >
                {contentHeight > 0 && (
                  <HTMLFlipBook
                    key={`${isSinglePage ? "single" : "double"}-${recipes.length}`}
                    width={isMobile ? 300 : contentHeight * 0.75}
                    height={isMobile ? 550 : contentHeight}
                    minHeight={isMobile ? 550 : contentHeight}
                    maxShadowOpacity={0.5}
                    drawShadow={true}
                    showCover={true}
                    size="fixed"
                    useMouseEvents={false}
                    ref={flipbookRef}
                    className=""
                    startPage={currentPage}
                    minWidth={
                      isSinglePage
                        ? isMobile
                          ? 300
                          : contentHeight * 0.75
                        : contentHeight * 1.5
                    }
                    maxWidth={
                      isSinglePage
                        ? isMobile
                          ? 440
                          : contentHeight * 0.75
                        : contentHeight * 1.5
                    }
                    maxHeight={isMobile ? 550 : contentHeight}
                    flippingTime={1000}
                    usePortrait={isSinglePage}
                    startZIndex={0}
                    autoSize={true}
                    swipeDistance={30}
                    showPageCorners={true}
                    disableFlipByClick={false}
                    onFlip={(e) => {
                      const currentPageNum = e.data;
                      lastPageRef.current = currentPageNum;
                      setCurrentPage(currentPageNum);

                      if (currentPageNum < PAGES_BEFORE_RECIPES) {
                        console.log("On cover page, clearing recipe");
                        setCurrentRecipeId(null);
                        // Reverse intro: cover just closed — slide the book back off-center.
                        setCoverPhase('closed');
                        if (!isSinglePage) {
                          // Extend lock so arrows stay disabled through the 500ms slide-back.
                          isAnimatingRef.current = true;
                          setIsAnimating(true);
                          setTimeout(() => {
                            isAnimatingRef.current = false;
                            setIsAnimating(false);
                          }, COVER_SLIDE_DURATION);
                        }
                      } else if (coverPhase !== 'open') {
                        // Safety net: if the flipbook advanced past the cover by any path
                        // (e.g. swipe/click), make sure the container is centered.
                        setCoverPhase('open');
                      } else {
                        // In double-page mode, each flip advances by 2 pages but shows 1 recipe
                        // In single-page mode, each recipe spans 2 pages
                        const recipeIndex = Math.floor(
                          (currentPageNum - PAGES_BEFORE_RECIPES) / 2,
                        );
                        console.log(
                          "Recipe index:",
                          recipeIndex,
                          "Total recipes:",
                          recipes.length,
                          "Current page:",
                          currentPageNum,
                          "isSinglePage:",
                          isSinglePage,
                        );

                        if (recipeIndex >= 0 && recipeIndex < recipes.length) {
                          const recipeId = recipes[recipeIndex].id;
                          console.log("Setting recipe ID to:", recipeId);
                          setCurrentRecipeId(recipeId);
                        } else {
                          console.log("Recipe index out of bounds");
                          setCurrentRecipeId(null);
                        }
                      }
                    }}
                    mobileScrollSupport={false}
                    style={{}}
                    clickEventForward={true}
                  >
                    <div className="cover" key="cover">
                      <Image
                        src={
                          !isSinglePage ? "/cover.webp" : "/cover-mobile.webp"
                        }
                        alt="Title"
                        layout="fill"
                        objectFit="contain"
                        priority
                      />
                    </div>
                    {convertRecipesToPages(
                      recipes,
                      l,
                      contentHeight,
                      setImages,
                    )}
                  </HTMLFlipBook>
                )}
              </div>

              <button
                className={` relative md:absolute md:top-1/2 md:-translate-y-1/2 button right-2.5 md:right-4 ${isNextDisabled
                  ? "opacity-30 cursor-not-allowed pointer-events-none"
                  : "cursor-pointer hover:scale-110 transition-transform"
                  }`}
                onClick={nextPage}
                disabled={isNextDisabled}
                style={{ color: "white", fontSize: 20 }}
              >
                <div className="bg-white rounded-md p-3 sm:p-4">
                  <ArrowRight
                    size={32}
                    className="w-8 h-8 sm:w-10 sm:h-10"
                    color="black"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Toggle Sidebar Button - Visible when sidebar is closed and we have a recipe */}
          {!commentSection.open && currentRecipeId && (
            <button
              onClick={() => {
                const currentRecipe = recipes.find(
                  (r) => r.id === currentRecipeId,
                );
                if (currentRecipe) {
                  setCommentSection({
                    open: true,
                    recipeId: currentRecipe.id,
                    nonnaName: currentRecipe.grandmotherTitle || "Nonna",
                    titleName: currentRecipe.recipeTitle,
                    photo: currentRecipe.photo?.[0] || null,
                    countryCode: currentRecipe.country || "",
                  });
                }
              }}
              className="absolute bottom-8 right-8 z-100 bg-[#CDD8F9] text-[#504DED] p-3 rounded-md shadow-lg hover:bg-[#B8C5F5] transition-colors border-2 border-[#A8B8F0] flex items-center gap-2"
            >
              <MessageCircle size={24} />
              <span className="font-serif hidden">Discussions</span>
            </button>
          )}
        </div>

        {/* Comment Panel — matches DiscussionPanel shell */}
        {commentSection.open && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-[9998]"
              onClick={() =>
                setCommentSection({
                  ...commentSection,
                  open: false,
                  recipeId: 0,
                })
              }
            />
            <div className="fixed top-0 right-0 h-screen w-full md:w-125 bg-white shadow-lg z-[9999] border-l border-gray-200 flex flex-col pt-[20px]">
              <CommentSection
                recipeId={commentSection.recipeId}
                userId={user?.id}
                nonnaName={commentSection.nonnaName}
                photoUrl={
                  commentSection.photo
                    ? `/api/proxy-image?url=${encodeURIComponent(commentSection.photo)}`
                    : generateAvatarSvgUri(
                      commentSection.nonnaName,
                      commentSection.countryCode,
                    )
                }
                onClose={() =>
                  setCommentSection({
                    ...commentSection,
                    open: false,
                    recipeId: 0,
                  })
                }
              />
            </div>
          </>
        )}

        <ImagesModal images={images} onClose={() => setImages(null)} />
      </div>
    );
  },
);

Book.displayName = "Book";
