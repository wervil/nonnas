import type { PanelNonna } from "../types";

export function mapRecipesToPanelNonnas(recipes: unknown[]): PanelNonna[] {
  return recipes.map((raw) => {
    const r = raw as Record<string, unknown>;
    const first = String(r.firstName ?? "").trim();
    const last = String(r.lastName ?? "").trim();
    const title = String(r.grandmotherTitle ?? "").trim();
    const fullName = [first, last].filter(Boolean).join(" ");
    const name =
      [title, fullName].filter(Boolean).join(" · ") ||
      fullName ||
      title ||
      "Nonna";
    const origin = [r.city, r.region, r.country]
      .map((x) => (x ? String(x).trim() : ""))
      .filter(Boolean)
      .join(", ");
    return {
      id: r.id as string | number,
      name,
      recipeTitle: r.recipeTitle as string | undefined,
      history: r.history as string | undefined,
      photo: (r.photo as string[] | null | undefined) ?? null,
      ...(origin ? { origin } : {}),
    };
  });
}
