"use client";
import { Recipe } from "@/db/schema";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileEdit, Trash2 } from "lucide-react";

type Props = {
  recipes: Recipe[];
  /**
   * Explicit flag — set to true only from the admin dashboard.
   * Controls checkbox and bulk-bar visibility with a stable boolean so
   * they never flicker during HMR or React strict-mode double renders.
   */
  isAdminView?: boolean;
  /**
   * When provided, adds an "Edit" button to each row linking to
   * `{editBasePath}/{recipe.id}/edit`. Use from the user's own profile.
   */
  editBasePath?: string;
  togglePublished?: (id: number, published: boolean) => void;
  deleteRecipe?: (id: number) => Promise<void>;
  deletingRecipeId?: number | null;
  bulkDeleteRecipes?: (ids: number[]) => Promise<void>;
};

export const RecipesList = ({
  recipes,
  isAdminView = false,
  editBasePath,
  togglePublished,
  deleteRecipe,
  deletingRecipeId,
  bulkDeleteRecipes,
}: Props) => {
  const b = useTranslations("buttons");
  const d = useTranslations("descriptions");
  const pathname = usePathname();

  const [recipeToDelete, setRecipeToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const allSelected = recipes.length > 0 && selectedIds.size === recipes.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipes.map((r) => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteRecipes || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteRecipes(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  };

  return (
    <div>
      {/* ── Bulk action / select-all bar ── only in admin view ── */}
      {isAdminView && recipes.length > 0 && (
        <div
          className={`flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border transition-all duration-200 ${
            selectedIds.size > 0
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              aria-label="Select all recipes"
              className="w-4 h-4 accent-[#FF7D73] cursor-pointer"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
            />
            <span className="text-sm text-gray-600 font-(--font-bell)">
              {allSelected
                ? "Deselect all"
                : someSelected
                  ? `${selectedIds.size} selected`
                  : `Select all (${recipes.length})`}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowBulkConfirm(true)}
              disabled={bulkDeleting}
              className="ml-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm! rounded-lg!"
              variant="empty"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting
                ? "Deleting…"
                : `Delete selected (${selectedIds.size})`}
            </Button>
          )}
        </div>
      )}

      <ul className="space-y-4">
        {recipes && recipes.length === 0 && (
          <li className="text-gray-500 font-(--font-bell)">
            {d("noRecipesFound")}
          </li>
        )}

        {recipes.map((recipe) => (
          <li
            key={recipe.id}
            className={`group relative bg-white rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg ${
              selectedIds.has(recipe.id)
                ? "border-[#FF7D73]/60 bg-red-50/30"
                : "border-gray-200 hover:border-[#FF7D73]/30"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Per-row checkbox — only in admin view */}
                {isAdminView && (
                  <input
                    type="checkbox"
                    aria-label={`Select ${recipe.firstName} ${recipe.lastName}`}
                    className="w-4 h-4 accent-[#FF7D73] cursor-pointer shrink-0"
                    checked={selectedIds.has(recipe.id)}
                    onChange={() => toggleOne(recipe.id)}
                  />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#FF7D73] to-[#FF7D73] flex items-center justify-center text-xs font-bold text-white shadow-md shadow-amber-900/20 shrink-0">
                    {recipe.firstName?.[0]}
                    {recipe.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-[--font-imprint] text-xl truncate text-gray-900 group-hover:text-[#FF7D73] transition-colors">
                        {recipe.grandmotherTitle} {recipe.firstName}{" "}
                        {recipe.lastName}
                      </span>
                      {/* Draft badge */}
                      {recipe.is_draft && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-(--font-bell) shrink-0">
                          Draft
                        </span>
                      )}
                      {/* Unpublished badge (submitted but not yet published) */}
                      {!recipe.is_draft && !recipe.published && editBasePath && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-(--font-bell) shrink-0">
                          Pending review
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{recipe.country}</span>
                      {recipe.region && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{recipe.region}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 ml-11 sm:ml-0 flex-wrap">
                {/* View Details — skip for drafts since they may be incomplete */}
                {!recipe.is_draft && (
                  <Link
                    href={`${pathname}/${recipe.id}`}
                    className="px-8 py-4 rounded-lg bg-[#FFCCC81A] hover:bg-[#FFCCC8] border border-[#FFCCC8] text-[#FF7D73]! hover:text-[#FF7D73]! text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    {b("viewDetails")}
                  </Link>
                )}

                {/* Edit button — shown in profile view */}
                {editBasePath && (
                  <Link
                    href={`${editBasePath}/${recipe.id}/edit`}
                    className="flex items-center gap-1.5 px-4 py-4 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    {recipe.is_draft ? "Continue Editing" : b("edit")}
                  </Link>
                )}

                {togglePublished && !recipe.is_draft && (
                  <button
                    className={`px-8 py-4 rounded-lg text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg border ${
                      recipe.published
                        ? "bg-[#FFCCC8] text-[#85312B] border-[#FFCCC8] hover:bg-[#FFCCC8]"
                        : "bg-[#9BC9C3] text-[#26786E] border-[#9BC9C3] hover:bg-[#8AB8B1]"
                    }`}
                    onClick={() =>
                      togglePublished(recipe.id, !recipe.published)
                    }
                  >
                    {recipe.published ? b("unpublish") : b("publish")}
                  </button>
                )}

                {deleteRecipe && (
                  <Button
                    className="px-6 py-4 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    onClick={() => setRecipeToDelete(recipe.id)}
                    disabled={deletingRecipeId === recipe.id}
                  >
                    {deletingRecipeId === recipe.id ? "Deleting…" : b("delete")}
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Single-delete confirmation ── */}
      <Dialog
        open={recipeToDelete !== null}
        onOpenChange={(open) => !open && setRecipeToDelete(null)}
      >
        <DialogContent className="bg-white border-gray-200 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-(--font-bell) text-2xl">
              Delete recipe?
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-(--font-bell) mt-1">
              This will move the recipe to the Trash. A Super Admin can restore
              it within 30&nbsp;days.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700 font-(--font-bell)">
              The recipe will be hidden from all public views immediately.
            </p>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-900"
              onClick={() => setRecipeToDelete(null)}
              variant="empty"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              disabled={
                recipeToDelete === null || deletingRecipeId === recipeToDelete
              }
              onClick={async () => {
                if (recipeToDelete === null || !deleteRecipe) return;
                await deleteRecipe(recipeToDelete);
                setRecipeToDelete(null);
              }}
              variant="empty"
            >
              {deletingRecipeId === recipeToDelete ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk-delete confirmation ── */}
      <Dialog
        open={showBulkConfirm}
        onOpenChange={(open) => !open && setShowBulkConfirm(false)}
      >
        <DialogContent className="bg-white border-gray-200 shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-(--font-bell) text-2xl">
              Delete {selectedIds.size} recipe
              {selectedIds.size !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-(--font-bell) mt-1">
              All selected recipes will be moved to the Trash. A Super Admin can
              restore them within 30&nbsp;days.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-red-700 font-(--font-bell)">
              {selectedIds.size} recipe{selectedIds.size !== 1 ? "s" : ""} will
              be hidden from all public views immediately.
            </p>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-900"
              onClick={() => setShowBulkConfirm(false)}
              variant="empty"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              variant="empty"
            >
              {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
