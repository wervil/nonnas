import { Recipe } from "@/db/schema";
import { sanitizeHtml } from "@/utils/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export const MAX_RECIPES_PER_PAGE = 14;

const convertRecipe = (recipe: Recipe) => ({
  ...recipe,
  history: sanitizeHtml(recipe.history || ""),
  geo_history: sanitizeHtml(recipe.geo_history || ""),
  recipe: sanitizeHtml(recipe.recipe || ""),
  directions: sanitizeHtml(recipe.directions || ""),
  influences: sanitizeHtml(recipe.influences || ""),
  traditions: sanitizeHtml(recipe.traditions || ""),
});

export const useRecipes = () => {
  const n = useTranslations("navigation");
  const [selectedCountry, setSelectedCountry] = useState<{
    label: string;
    value: string;
  }>({ value: "", label: n("all") });
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]); // These are now ALL recipes
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]); // These are subsets
  const [loading, setLoading] = useState(true);
  const [tableOfContents, setTableOfContents] = useState<
    Record<string, Recipe[]>
  >({});
  const [lang] = useState("en-US");

  // Fetch all recipes once
  const fetchRecipes = async (lang: string) => {
    setLoading(true);
    const url = `/api/recipes?published=true&lang=${lang}`;

    try {
      const res = await fetch(url, {
        cache: "no-store",
      });
      const data = await res.json();

      if (Array.isArray(data.recipes)) {
        const convertedRecipes = data.recipes.map(convertRecipe);
        // Sort recipes by ID to ensure consistent navigation
        const sortedById = convertedRecipes.sort(
          (a: Recipe, b: Recipe) => a.id - b.id,
        );
        setRecipes(sortedById);
      } else {
        const sortedRecipes: Record<string, Recipe[]> = Object.keys(
          data.recipes,
        )
          .sort()
          .reduce(
            (acc, key) => {
              acc[key] = data.recipes[key];
              return acc;
            },
            {} as Record<string, Recipe[]>,
          );

        setTableOfContents(sortedRecipes);

        const allRecipes = Object.values(sortedRecipes).flat() as Recipe[];
        const convertedRecipes = allRecipes.map(convertRecipe);
        // Sort recipes by ID to ensure consistent navigation
        const sortedById = convertedRecipes.sort(
          (a: Recipe, b: Recipe) => a.id - b.id,
        );

        setRecipes(sortedById);
      }
    } catch (error) {
      console.error("Failed to fetch recipes", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter recipes when search or country changes
  useEffect(() => {
    let result = recipes;

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.recipeTitle.toLowerCase().includes(lowerSearch) ||
          r.firstName.toLowerCase().includes(lowerSearch) ||
          r.lastName.toLowerCase().includes(lowerSearch) ||
          (r.grandmotherTitle &&
            r.grandmotherTitle.toLowerCase().includes(lowerSearch)),
      );
    }

    if (selectedCountry.value) {
      result = result.filter((r) => r.country === selectedCountry.value);
    }

    setFilteredRecipes(result);
  }, [recipes, search, selectedCountry]);

  useEffect(() => {
    fetchRecipes(lang);
  }, [lang]);

  // NOTE: Removed the debounce search fetch because we filter client side now.

  return {
    loading,
    recipes, // Passing ALL recipes to the book
    filteredRecipes, // Passing filtered recipes to the modal
    tableOfContents,
    selectedCountry,
    setSelectedCountry,
    search,
    setSearch,
  };
};
