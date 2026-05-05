"use client";

import { RecipesList } from "@/components/RecipesList";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Recipe } from "@/db/schema";
import { countriesData } from "@/utils/countries";
import { exportRecipesToPdf } from "@/utils/generatePdf";
import {
  Copy,
  Download,
  FileText,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/?(p|br|div|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addSection(
  lines: string[],
  label: string,
  content: string | null | undefined,
) {
  if (!content) return;
  const clean = stripHtml(content);
  if (!clean) return;
  lines.push(`   ${label}:`);
  clean.split("\n").forEach((line) => lines.push(`      ${line}`));
  lines.push("");
}

function exportRecipesToTxt(
  recipes: Recipe[],
  filename: string,
  countryLabel?: string,
) {
  if (!recipes.length) return;

  const lines: string[] = [];

  const header = countryLabel
    ? `Nonna's Recipes - ${countryLabel}`
    : `Nonna's Recipes - All Countries`;
  lines.push(header);
  lines.push("=".repeat(header.length));
  lines.push(`Total: ${recipes.length} recipes`);
  lines.push("");
  lines.push("");

  const numWidth = String(recipes.length).length;

  recipes.forEach((r, i) => {
    const num = String(i + 1).padStart(numWidth, " ");
    const grandmother = r.grandmotherTitle || "";
    const fullName = [grandmother, r.firstName, r.lastName]
      .filter(Boolean)
      .join(" ");
    const location = [r.country, r.region, r.city].filter(Boolean).join(", ");

    lines.push(`${num}.  ${fullName}`);
    lines.push(`    Location: ${location}`);
    lines.push("");

    addSection(lines, "Bio", r.history);
    addSection(lines, "History", r.geo_history);

    if (r.recipeTitle) {
      lines.push(`   Recipe: ${r.recipeTitle}`);
      lines.push("");
    }

    addSection(lines, "Ingredients", r.recipe);
    addSection(lines, "Directions", r.directions);
    addSection(lines, "Traditions", r.traditions);
    addSection(lines, "Influences", r.influences);

    lines.push("-".repeat(60));
    lines.push("");
  });

  const txt = lines.join("\n");
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type StackUserRow = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  signedUpAt?: string;
  role: string;
};

// Minimal trash row returned by /api/admin/recipes/trash
type TrashRecipe = {
  id: number;
  grandmotherTitle: string;
  firstName: string;
  lastName: string;
  recipeTitle: string;
  country: string;
  region: string | null;
  photo: string[] | null;
  published: boolean | null;
  createdAt: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

interface TabContentProps {
  activeTab: "recipes" | "users";
  isSuperAdmin: boolean;
  loading: boolean;
  recipes: Recipe[];
  sortedUsers: StackUserRow[];
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  roleUpdatingId: string | null;
  deleteUserId: string | null;
  setDeleteUserId: (id: string | null) => void;
  togglePublished: (id: number, published: boolean) => void;
  deleteRecipe: (id: number) => Promise<void>;
  deletingRecipeId: number | null;
  bulkDeleteRecipes: (ids: number[]) => Promise<void>;
  updateUserRole: (userId: string, role: "team_member" | "client") => void;
  l: (key: string) => string;
  d: (key: string) => string;
  b: (key: string) => string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_SEC_EMAIL: string;
  loadTabData: (activeTab: "recipes" | "users", page?: number) => Promise<void>;
  copyInviteLink?: () => void;
  copied?: boolean;
  usersPagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  currentPage?: number;
}

export function TabContent({
  activeTab,
  isSuperAdmin,
  loading,
  recipes,
  sortedUsers,
  selectedCountry,
  setSelectedCountry,
  roleUpdatingId,
  setDeleteUserId,
  togglePublished,
  deleteRecipe,
  deletingRecipeId,
  bulkDeleteRecipes,
  updateUserRole,
  l,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_SEC_EMAIL,
  loadTabData,
  copyInviteLink,
  copied,
  usersPagination,
  currentPage,
}: TabContentProps) {
  // Load data when tab changes
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const countries = Object.keys(countriesData);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState("");

  // Trash panel (super admin only)
  const [showTrash, setShowTrash] = useState(false);
  const [trashRecipes, setTrashRecipes] = useState<TrashRecipe[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<number>>(
    new Set(),
  );

  // Confirm modals for trash actions
  const [restoreConfirm, setRestoreConfirm] = useState<number[] | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState<number[] | null>(null);
  const [trashActionLoading, setTrashActionLoading] = useState(false);

  const loadTrash = async () => {
    setTrashLoading(true);
    try {
      const res = await fetch("/api/admin/recipes/trash", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch trash");
      const data = await res.json();
      setTrashRecipes(data.recipes ?? []);
    } catch {
      toast.error("Failed to load trash");
    } finally {
      setTrashLoading(false);
    }
  };

  const handleToggleTrash = () => {
    const next = !showTrash;
    setShowTrash(next);
    setSelectedTrashIds(new Set());
    if (next) loadTrash();
  };

  const toggleTrashOne = (id: number) => {
    setSelectedTrashIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleTrashAll = () => {
    if (selectedTrashIds.size === trashRecipes.length) {
      setSelectedTrashIds(new Set());
    } else {
      setSelectedTrashIds(new Set(trashRecipes.map((r) => r.id)));
    }
  };

  const handleRestore = async (ids: number[]) => {
    setTrashActionLoading(true);
    try {
      const res = await fetch("/api/admin/recipes/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Restore failed");
      toast.success(
        `${ids.length} recipe${ids.length !== 1 ? "s" : ""} restored`,
      );
      setSelectedTrashIds(new Set());
      await Promise.all([loadTrash(), loadTabData("recipes")]);
    } catch {
      toast.error("Failed to restore recipes");
    } finally {
      setTrashActionLoading(false);
      setRestoreConfirm(null);
    }
  };

  const handlePurge = async (ids: number[]) => {
    setTrashActionLoading(true);
    try {
      const res = await fetch("/api/admin/recipes/purge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Purge failed");
      toast.success(
        `${ids.length} recipe${ids.length !== 1 ? "s" : ""} permanently deleted`,
      );
      setSelectedTrashIds(new Set());
      await loadTrash();
    } catch {
      toast.error("Failed to purge recipes");
    } finally {
      setTrashActionLoading(false);
      setPurgeConfirm(null);
    }
  };

  const daysAgo = (dateStr: string | null) => {
    if (!dateStr) return "?";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const daysLeft = (dateStr: string | null) => {
    if (!dateStr) return 30;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - days);
  };

  if (activeTab === "users") {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm overflow-x-auto">
        <div className="grid grid-cols-6 gap-0 p-4 font-(--font-bell) bg-gray-50 text-gray-700 border-b border-gray-200 min-w-200">
          <div className="pr-4 border-r border-gray-200">Name</div>
          <div className="px-4 border-r border-gray-200">Email</div>
          <div className="px-4 border-r border-gray-200">Role</div>
          <div className="px-4 border-r border-gray-200">Signed up</div>
          <div className="px-4 text-right border-r border-gray-200">Action</div>
          <div className="pl-4 text-right">Delete</div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          </div>
        )}

        {!loading &&
          sortedUsers.map((u) => {
            const userEmail = (u.primaryEmail || "").toLowerCase();
            const isSuper =
              userEmail === SUPER_ADMIN_EMAIL ||
              userEmail === SUPER_ADMIN_SEC_EMAIL;
            const isAdmin = u.role === "team_member";
            const badge = isSuper
              ? "Super Admin"
              : isAdmin
                ? "Admin"
                : "Client";

            return (
              <div
                key={u.id}
                className={`grid grid-cols-6 gap-0 p-4 border-t border-l border-r border-gray-200 items-center transition-colors hover:bg-gray-50 min-w-200 ${isSuper ? "bg-[#6D2924]/10" : ""}`}
              >
                <div
                  className="pr-4 border-r border-gray-200 truncate text-gray-900 font-(--font-bell)"
                  title={u.displayName || undefined}
                >
                  {u.displayName || "—"}
                </div>
                <div
                  className="px-4 border-r border-gray-200 truncate text-gray-600 font-(--font-bell)"
                  title={u.primaryEmail || undefined}
                >
                  {u.primaryEmail || "—"}
                </div>

                <div className="px-4 border-r border-gray-200 whitespace-nowrap">
                  {isSuper ? (
                    <span className="text-xs px-3 py-2 rounded-full bg-[#FFCCC8] text-[#6D2924] font-semibold border border-[#FFCCC8]">
                      {badge}
                    </span>
                  ) : isAdmin ? (
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      {badge}
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                      {badge}
                    </span>
                  )}
                </div>

                <div className="px-4 border-r border-gray-200 text-gray-500 font-(--font-bell) text-sm">
                  {u.signedUpAt ? new Date(u.signedUpAt).toLocaleString() : "—"}
                </div>

                <div className="px-4 border-r border-gray-200 flex justify-end">
                  {isSuper ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <Button
                      onClick={() =>
                        updateUserRole(u.id, isAdmin ? "client" : "team_member")
                      }
                      disabled={roleUpdatingId === u.id}
                      className="bg-[#9BC9C3] hover:bg-[#8AB8B1] rounded-lg! text-[#26786E] border border-[#9BC9C3] text-sm! sm:text-lg! px-2! py-1! sm:px-4! sm:py-2!"
                      variant="empty"
                    >
                      {roleUpdatingId === u.id
                        ? "Updating..."
                        : isAdmin
                          ? "Make Client"
                          : "Make Admin"}
                    </Button>
                  )}
                </div>

                <div className="pl-4 flex justify-end">
                  {!isSuperAdmin || isSuper ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <Button
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-sm! sm:text-lg! px-2! py-1! sm:px-4! sm:py-2! rounded-lg!"
                      onClick={() => setDeleteUserId(u.id)}
                      disabled={roleUpdatingId === u.id}
                      variant="empty"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

        {usersPagination && !loading && (
          <div className="flex justify-between items-center p-4 border-t border-l border-r border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600 font-(--font-bell)">
              Showing {((currentPage || 1) - 1) * usersPagination.limit + 1} to{" "}
              {Math.min(
                (currentPage || 1) * usersPagination.limit,
                usersPagination.totalCount,
              )}{" "}
              of {usersPagination.totalCount} users
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => loadTabData("users", (currentPage || 1) - 1)}
                disabled={!usersPagination.hasPrev || loading}
                className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-sm! px-3! py-1!"
                variant="empty"
              >
                ← Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-700 font-(--font-bell)">
                Page {currentPage || 1} of {usersPagination.totalPages}
              </span>
              <Button
                onClick={() => loadTabData("users", (currentPage || 1) + 1)}
                disabled={!usersPagination.hasNext || loading}
                className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-sm! px-3! py-1!"
                variant="empty"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Recipes tab ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {isSuperAdmin && copyInviteLink && (
            <Button
              onClick={copyInviteLink}
              className="bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white transition-colors flex items-center gap-2 px-6 py-3 h-12 rounded-xl text-base font-medium whitespace-nowrap"
              variant="empty"
            >
              <Copy className="w-5 h-5" />
              {copied ? "Copied ✓" : "Copy Invite Link"}
            </Button>
          )}

          {/* Trash toggle — super admin only */}
          {isSuperAdmin && (
            <Button
              onClick={handleToggleTrash}
              className={`flex items-center gap-2 px-5 py-3 h-12 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                showTrash
                  ? "bg-[#FFCCC8] text-[#6D2924] hover:bg-[#FFB8B3] border border-[#FFCCC8]"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
              variant="empty"
            >
              <Trash2 className="w-4 h-4" />
              {showTrash ? "Hide Trash" : "View Trash"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-50">
            <SearchableSelect
              options={countries.map((c) => ({
                value: countriesData[c as keyof typeof countriesData].name,
                label: countriesData[c as keyof typeof countriesData].name,
                flag: countriesData[c as keyof typeof countriesData].flag,
              }))}
              value={selectedCountry}
              onChange={setSelectedCountry}
              placeholder={l("all")}
              variant="light"
            />
          </div>

          {recipes.length > 0 && !showTrash && (
            <>
              <Button
                onClick={() => {
                  const filename = selectedCountry
                    ? `recipes-${selectedCountry.toLowerCase().replace(/\s+/g, "-")}.txt`
                    : "recipes-all.txt";
                  exportRecipesToTxt(
                    recipes,
                    filename,
                    selectedCountry || undefined,
                  );
                }}
                className="bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white transition-colors flex items-center gap-2 px-4 py-3 h-12 rounded-xl text-sm font-medium whitespace-nowrap"
                variant="empty"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">
                  .TXT ({recipes.length})
                </span>
              </Button>

              <Button
                onClick={async () => {
                  if (pdfExporting) return;
                  setPdfExporting(true);
                  setPdfProgress(`0 / ${recipes.length}`);
                  try {
                    const filename = selectedCountry
                      ? `recipes-${selectedCountry.toLowerCase().replace(/\s+/g, "-")}.pdf`
                      : "recipes-all.pdf";
                    await exportRecipesToPdf(
                      recipes,
                      filename,
                      selectedCountry || undefined,
                      (current, total) =>
                        setPdfProgress(`${current} / ${total}`),
                    );
                  } finally {
                    setPdfExporting(false);
                    setPdfProgress("");
                  }
                }}
                disabled={pdfExporting}
                className="bg-[#FFCCC8] hover:bg-[#FF7D73] text-[#6D2924] hover:text-white transition-colors flex items-center gap-2 px-4 py-3 h-12 rounded-xl text-sm font-medium whitespace-nowrap disabled:opacity-60"
                variant="empty"
              >
                {pdfExporting ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">{pdfProgress}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      .PDF ({recipes.length})
                    </span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Trash panel ── */}
      {showTrash && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-(--font-bell)">
                Trash
              </h3>
              <p className="text-sm text-gray-500 font-(--font-bell)">
                Deleted recipes are kept for 30 days before expiring. Super
                Admin only.
              </p>
            </div>
            {selectedTrashIds.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    setRestoreConfirm(Array.from(selectedTrashIds))
                  }
                  disabled={trashActionLoading}
                  className="flex items-center gap-2 bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white px-4 py-2 text-sm! rounded-lg!"
                  variant="empty"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore ({selectedTrashIds.size})
                </Button>
                <Button
                  onClick={() => setPurgeConfirm(Array.from(selectedTrashIds))}
                  disabled={trashActionLoading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm! rounded-lg!"
                  variant="empty"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge ({selectedTrashIds.size})
                </Button>
              </div>
            )}
          </div>

          {trashLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF7D73]"></div>
            </div>
          ) : trashRecipes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Trash2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-(--font-bell)">Trash is empty</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              {/* Header row */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
                <input
                  type="checkbox"
                  aria-label="Select all trashed recipes"
                  className="w-4 h-4 accent-[#FF7D73] cursor-pointer"
                  checked={selectedTrashIds.size === trashRecipes.length}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedTrashIds.size > 0 &&
                        selectedTrashIds.size < trashRecipes.length;
                    }
                  }}
                  onChange={toggleTrashAll}
                />
                <span className="text-sm font-(--font-bell) text-gray-600">
                  {selectedTrashIds.size > 0
                    ? `${selectedTrashIds.size} selected`
                    : `${trashRecipes.length} deleted recipe${trashRecipes.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              {trashRecipes?.length > 0 &&
                trashRecipes.map((recipe) => {
                  const left = daysLeft(recipe.deleted_at);
                  const urgent = left <= 5;
                  return (
                    <div
                      key={recipe.id}
                      className={`flex items-center gap-3 p-4 border-t border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedTrashIds.has(recipe.id) ? "bg-red-50/40" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${recipe.firstName} ${recipe.lastName}`}
                        className="w-4 h-4 accent-[#FF7D73] cursor-pointer shrink-0"
                        checked={selectedTrashIds.has(recipe.id)}
                        onChange={() => toggleTrashOne(recipe.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-(--font-bell) text-gray-900 truncate">
                          {recipe.grandmotherTitle} {recipe.firstName}{" "}
                          {recipe.lastName}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {recipe.country}
                          {recipe.region ? ` · ${recipe.region}` : ""}{" "}
                          &nbsp;·&nbsp; Deleted {daysAgo(recipe.deleted_at)}
                          {recipe.deleted_by && ` by ${recipe.deleted_by}`}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium font-(--font-bell) shrink-0 ${
                          urgent
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                      >
                        {left === 0 ? "Expiring" : `${left}d left`}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => setRestoreConfirm([recipe.id])}
                          disabled={trashActionLoading}
                          className="flex items-center gap-1.5 bg-[#9BC9C31A] hover:bg-[#9BC9C3] text-[#26786E] border border-[#9BC9C3] px-3 py-2 text-xs! rounded-lg!"
                          variant="empty"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </Button>
                        <Button
                          onClick={() => setPurgeConfirm([recipe.id])}
                          disabled={trashActionLoading}
                          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 text-xs! rounded-lg!"
                          variant="empty"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Purge
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="border-t border-dashed border-gray-200 my-8" />
        </div>
      )}

      {/* Active recipes */}
      {/* Active recipes — always mounted so checkbox state is never reset */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF7D73]"></div>
          </div>
        )}
        <div className={loading ? "opacity-40 pointer-events-none" : ""}>
          <RecipesList
            recipes={recipes}
            isAdminView={!!isSuperAdmin}
            togglePublished={togglePublished}
            deleteRecipe={deleteRecipe}
            deletingRecipeId={deletingRecipeId}
            bulkDeleteRecipes={bulkDeleteRecipes}
          />
        </div>
      </div>

      {/* ── Restore confirmation ── */}
      <Dialog
        open={restoreConfirm !== null}
        onOpenChange={(open) => !open && setRestoreConfirm(null)}
      >
        <DialogContent className="bg-white border-gray-200 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-[var(--font-bell)] text-2xl">
              Restore {restoreConfirm?.length ?? 0} recipe
              {(restoreConfirm?.length ?? 0) !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-[var(--font-bell)] mt-1">
              The selected recipe
              {(restoreConfirm?.length ?? 0) !== 1 ? "s" : ""} will be moved out
              of Trash and can be published again.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-3 bg-[#9BC9C31A] rounded-lg border border-[#9BC9C3]">
            <p className="text-sm text-[#26786E] font-[var(--font-bell)]">
              Restored recipes are set back to their previous state and remain
              unpublished until manually published.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-900"
              onClick={() => setRestoreConfirm(null)}
              variant="empty"
            >
              Cancel
            </Button>
            <Button
              className="bg-[#9BC9C3] hover:bg-[#26786E] text-[#26786E] hover:text-white shadow-sm"
              disabled={trashActionLoading}
              onClick={() => restoreConfirm && handleRestore(restoreConfirm)}
              variant="empty"
            >
              {trashActionLoading ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purge (permanent delete) confirmation ── */}
      <Dialog
        open={purgeConfirm !== null}
        onOpenChange={(open) => !open && setPurgeConfirm(null)}
      >
        <DialogContent className="bg-white border-gray-200 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-[var(--font-bell)] text-2xl">
              Permanently delete {purgeConfirm?.length ?? 0} recipe
              {(purgeConfirm?.length ?? 0) !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-[var(--font-bell)] mt-1">
              This action is <strong>irreversible</strong>. The data will be
              gone forever.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700 font-[var(--font-bell)]">
              All associated comments will also be permanently removed. There is
              no undo.
            </p>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-900"
              onClick={() => setPurgeConfirm(null)}
              variant="empty"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              disabled={trashActionLoading}
              onClick={() => purgeConfirm && handlePurge(purgeConfirm)}
              variant="empty"
            >
              {trashActionLoading ? "Deleting…" : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
