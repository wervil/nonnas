"use client";

import Button from "@/components/ui/Button";
import { Recipe } from "@/db/schema";
import { useUser } from "@stackframe/stack";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AdminTabSwitcher } from "@/components/AdminTabSwitcher";
import { Header } from "@/components/Header";
import { TabContent } from "@/components/TabContent";
import { toast } from "sonner";

type StackUserRow = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  signedUpAt?: string;
  role: string; // expected: "team_member" for admins; otherwise treat as client
};

type UsersResponse = {
  users: StackUserRow[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

const fetchStackUsers = async (page: number = 1, limit: number = 5) => {
  const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data as UsersResponse;
};

const fetchRecipes = async (country: string) => {
  const res = await fetch(
    `/api/recipes${country ? `?country=${country}` : ""}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return data.recipes ?? [];
};

export default function Dashboard() {
  const user = useUser();
  const router = useRouter();

  // Optional: if dashboard should not render while logged out
  useEffect(() => {
    if (!user) router.replace("/handler/sign-in");
  }, [user, router]);

  if (!user) return null;

  // ✅ only mount the component that calls Stack hooks when user exists
  return <DashboardAuthed user={user} />;
}

function DashboardAuthed({ user }: { user: any }) {
  /* ================= SUPER ADMIN ================= */
  const SUPER_ADMIN_EMAIL =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() || "";
  const SUPER_ADMIN_SEC_EMAIL =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() || "";

  const currentEmail = user?.primaryEmail?.toLowerCase() || "";
  const isSuperAdmin =
    currentEmail &&
    (currentEmail === SUPER_ADMIN_EMAIL ||
      currentEmail === SUPER_ADMIN_SEC_EMAIL);

  /* ================= ADMIN PERMISSION ================= */
  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || "";
  const team = user.useTeam(teamId); // ✅ always called (no conditional)
  const hasPermissions = !!(team && user.usePermission(team, "team_member")); // ✅ always called

  return (
    <DashboardInner
      user={user}
      isSuperAdmin={isSuperAdmin}
      hasPermissions={hasPermissions}
      SUPER_ADMIN_EMAIL={SUPER_ADMIN_EMAIL}
      SUPER_ADMIN_SEC_EMAIL={SUPER_ADMIN_SEC_EMAIL}
    />
  );
}

function DashboardInner({
  user,
  isSuperAdmin,
  hasPermissions,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_SEC_EMAIL,
}: {
  user: any;
  isSuperAdmin: any;
  hasPermissions: boolean;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_SEC_EMAIL: string;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [users, setUsers] = useState<StackUserRow[]>([]);
  const [usersPagination, setUsersPagination] = useState<
    UsersResponse["pagination"] | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [copied, setCopied] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);

  const l = useTranslations("labels");
  const d = useTranslations("descriptions");
  const b = useTranslations("buttons");

  const router = useRouter();

  /* ================= REDIRECT NON ADMINS ================= */
  useEffect(() => {
    if (user && !hasPermissions) {
      router.push("/");
    }
  }, [user, hasPermissions, router]);

  /* ================= USERS TAB GUARD ================= */
  // No longer needed since AdminTabSwitcher handles this

  /* ================= INVITE LINK ================= */
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?invite=${process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite link", err);
    }
  };

  /* ================= ROLE UPDATE ================= */
  const updateUserRole = async (
    userId: string,
    role: "team_member" | "client",
  ) => {
    try {
      setRoleUpdatingId(userId);
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to update role");
      }

      // Refresh list
      const response = await fetchStackUsers(currentPage);
      setUsers(response.users);
      setUsersPagination(response.pagination);
    } catch (e) {
      console.error(e);
      alert("Failed to update role. Check console.");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  /* ================= TOGGLE PUBLISHED ================= */
  const togglePublished = async (id: number, published: boolean) => {
    try {
      const res = await fetch("/api/recipes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published }),
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to update recipe");
      }

      // Re-fetch from API to avoid stale/cached state drift.
      const refreshed = await fetchRecipes(selectedCountry);
      setRecipes(refreshed);

      toast.success(published ? "Recipe published" : "Recipe unpublished");
    } catch (error) {
      console.error("Error updating recipe:", error);
      toast.error("Failed to update recipe");
    }
  };

  const deleteRecipe = async (id: number) => {
    try {
      setDeletingRecipeId(id);

      const res = await fetch(`/api/recipes?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete recipe");
      }

      toast.success("Recipe moved to Trash");
      setRecipes((prevRecipes) =>
        prevRecipes.filter((recipe) => recipe.id !== id),
      );
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete recipe",
      );
    } finally {
      setDeletingRecipeId(null);
    }
  };

  const bulkDeleteRecipes = async (ids: number[]) => {
    try {
      const res = await fetch("/api/admin/recipes/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete recipes");
      }

      const data = await res.json();
      toast.success(data.message || `${ids.length} recipe(s) moved to Trash`);
      setRecipes((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch (error) {
      console.error("Error bulk-deleting recipes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete recipes",
      );
      throw error;
    }
  };

  /* ================= LOAD DATA ================= */
  const loadTabData = useCallback(
    async (activeTab: "recipes" | "users", page: number = 1) => {
      setLoading(true);
      try {
        if (activeTab === "users") {
          // ✅ ALWAYS reset recipes (prevents undefined issues)
          setRecipes([]);

          if (!isSuperAdmin) {
            setUsers([]);
            setUsersPagination(null);
            return;
          }

          const response = await fetchStackUsers(page);
          setUsers(response.users);
          setUsersPagination(response.pagination);
          setCurrentPage(page);
        } else {
          const data = await fetchRecipes(selectedCountry);
          setRecipes(data);
          setUsers([]);
          setUsersPagination(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, selectedCountry, setLoading],
  );

  const deleteUser = async () => {
    if (!deleteUserId) return;

    try {
      setRoleUpdatingId(deleteUserId);

      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteUserId }),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to delete user");
      }

      toast.success("User deleted successfully");

      const response = await fetchStackUsers(currentPage);
      setUsers(response.users);
      setUsersPagination(response.pagination);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong while deleting the user");
    } finally {
      setRoleUpdatingId(null);
      setDeleteUserId(null); // close dialog
    }
  };

  useEffect(() => {
    // Load initial data for recipes tab
    loadTabData("recipes");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reload recipes when country changes
    if (selectedCountry !== undefined) {
      loadTabData("recipes");
    }
  }, [selectedCountry, isSuperAdmin, loadTabData]);

  /* ================= SUPER ADMIN FIRST ================= */
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aEmail = (a.primaryEmail || "").toLowerCase();
      const bEmail = (b.primaryEmail || "").toLowerCase();
      const aIsSuper =
        aEmail === SUPER_ADMIN_EMAIL || aEmail === SUPER_ADMIN_SEC_EMAIL;
      const bIsSuper =
        bEmail === SUPER_ADMIN_EMAIL || bEmail === SUPER_ADMIN_SEC_EMAIL;
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      return 0;
    });
  }, [users, SUPER_ADMIN_EMAIL, SUPER_ADMIN_SEC_EMAIL]);

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <Header hasAdminAccess={hasPermissions} user={user} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ADMIN TAB SWITCHER */}
        <AdminTabSwitcher isSuperAdmin={isSuperAdmin}>
          {(activeTab) => {
            return (
              <TabContent
                activeTab={activeTab}
                isSuperAdmin={isSuperAdmin}
                loading={loading}
                recipes={recipes}
                sortedUsers={sortedUsers}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                roleUpdatingId={roleUpdatingId}
                deleteUserId={deleteUserId}
                setDeleteUserId={setDeleteUserId}
                togglePublished={togglePublished}
                deleteRecipe={deleteRecipe}
                deletingRecipeId={deletingRecipeId}
                bulkDeleteRecipes={bulkDeleteRecipes}
                updateUserRole={updateUserRole}
                l={l as (key: string) => string}
                d={d as (key: string) => string}
                b={b as (key: string) => string}
                SUPER_ADMIN_EMAIL={SUPER_ADMIN_EMAIL}
                SUPER_ADMIN_SEC_EMAIL={SUPER_ADMIN_SEC_EMAIL}
                loadTabData={loadTabData}
                copyInviteLink={copyInviteLink}
                copied={copied}
                usersPagination={usersPagination}
                currentPage={currentPage}
              />
            );
          }}
        </AdminTabSwitcher>
      </div>

      <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <DialogContent className="bg-white border-gray-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-[var(--font-bell)] text-2xl">
              Delete user?
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-[var(--font-bell)]">
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              className="bg-gray-100 hover:bg-gray-200 text-gray-900"
              onClick={() => {
                setDeleteUserId(null);
                toast("Deletion cancelled");
              }}
              variant="empty"
            >
              Cancel
            </Button>

            <Button
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={deleteUser}
              disabled={!!roleUpdatingId}
              variant="empty"
            >
              {roleUpdatingId ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
