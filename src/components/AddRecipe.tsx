"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { FieldPath, FieldValues, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import Checkbox from "@/components/ui/Checkbox";
import FileUpload from "@/components/ui/FileUpload";
import Input from "@/components/ui/Input";
import { TextEditor } from "@/components/ui/TextEditor";
import { Recipe } from "@/db/schema";
import { sanitizeHtml } from "@/utils/utils";
import { allCountries } from "country-region-data";
import CountryStateCitySelector from "./ui/CountryStateCitySelector";
import Textarea from "./ui/Textarea";
import { Typography } from "./ui/Typography";

// Helper function to strip HTML tags and get text content
const getTextContent = (html: string): string => {
  if (typeof window === "undefined") return html; // Server-side fallback
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

const recipeSchema = z.object({
  grandmotherTitle: z
    .string()
    .min(1, "Grandmother Title is required")
    .max(80, "Grandmother Title must be 80 characters or less")
    .regex(/^[^0-9]*$/, "Grandmother Title cannot contain numbers"),
  firstName: z
    .string()
    .min(1, "First Name is required")
    .max(60, "First Name must be 60 characters or less")
    .regex(/^[^0-9]*$/, "First Name cannot contain numbers"),
  lastName: z
    .string()
    .min(1, "Last Name is required")
    .max(60, "Last Name must be 60 characters or less")
    .regex(/^[^0-9]*$/, "Last Name cannot contain numbers"),
  country: z.string().min(1, "Country is required"),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  coordinates: z.string().optional(),
  history: z
    .string()
    .min(1, "Biography is required")
    .max(700, "Biography must be 700 characters or less"),
  recipeTitle: z
    .string()
    .min(1, "Recipe Title is required")
    .max(80, "Recipe Title must be 80 characters or less")
    .regex(/^[^0-9]*$/, "Recipe Title cannot contain numbers"),
  recipe: z
    .string()
    .min(1, "Ingredients are required")
    .refine((val) => getTextContent(val).length <= 1000, {
      message: "Ingredients must be 1000 characters or less",
    }),
  directions: z
    .string()
    .min(1, "Directions are required")
    .refine((val) => getTextContent(val).length <= 500, {
      message: "Directions must be 500 characters or less",
    }),
  traditions: z
    .string()
    .min(1, "Traditions is required")
    .max(500, "Traditions must be 500 characters or less"),
  geo_history: z
    .string()
    .min(1, "Regional History is required")
    .max(600, "Regional History must be 600 characters or less"),
  influences: z
    .string()
    .min(1, "Influences is required")
    .max(400, "Influences must be 400 characters or less"),
  photo: z.any().refine((val) => val && val.length > 0, {
    message: "Photo of your Grandmother is required",
  }),
  recipe_image: z.any().refine((val) => val && val.length > 0, {
    message: "Recipe Photo is required",
  }),
  dish_image: z.any().optional(),
  avatar_image: z.string().optional(),
  userId: z.string().optional(),
  release_signature: z
    .boolean()
    .default(true)
    .refine((val) => val === true, {
      message: "You must agree to release your signature",
    }),
});

type FormData = z.infer<typeof recipeSchema>;

const MAX_LENGTH = 2000;

export const AddRecipe = ({
  userId,
  recipe,
}: {
  userId?: string;
  recipe?: Recipe;
}) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    recipe?.avatar_image || null,
  );
  const lastGeneratedSource = React.useRef<string | null>(null);
  const b = useTranslations("buttons");
  const l = useTranslations("labels");
  const d = useTranslations("descriptions");

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      grandmotherTitle: "",
      firstName: "",
      traditions: "",
      lastName: "",
      country: "",
      state: "",
      city: "",
      coordinates: "",
      history: "",
      geo_history: "",
      recipeTitle: "",
      recipe: "",
      directions: "",
      influences: "",
      photo: [],
      recipe_image: [],
      dish_image: [],
      avatar_image: "",
      release_signature: false,
      userId: userId || "",
    },
    resolver: zodResolver(recipeSchema),
  });

  // Steps configuration
  const steps = [
    {
      id: "identity",
      title: l("grandmotherTitle"), // Using existing label as title roughly fitting
      fields: [
        "grandmotherTitle",
        "firstName",
        "lastName",
        "country",
        "state",
        "city",
        "coordinates",
      ],
      description: "Tell us about your grandmother.",
    },
    {
      id: "story",
      title: "Her Story",
      fields: ["history", "geo_history"],
      description: d("bio"),
    },
    {
      id: "recipe",
      title: "The Recipe",
      fields: ["recipeTitle", "recipe", "directions"],
      description: "Details of the dish.",
    },
    {
      id: "culture",
      title: l("traditions"),
      fields: ["traditions", "influences"],
      description: "Cultural background and influences.",
    },
    {
      id: "media",
      title: "Media & Review",
      fields: ["photo", "recipe_image", "release_signature"],
      description: "Upload photos and review.",
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const uploadedPhoto = watch("photo");

  useEffect(() => {
    const handleAvatarGen = async () => {
      if (!uploadedPhoto?.length) return;

      const sourceUrl = uploadedPhoto[0];

      if (typeof sourceUrl !== "string") return;
      if (sourceUrl === lastGeneratedSource.current) return;

      try {
        setIsGeneratingAvatar(true);

        const response = await fetch("/api/avatar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_image: sourceUrl, //
            prompt:
              "Make this a 90s cartoon avatar, clean outlines, vibrant colors",
            output_format: "jpg",
          }),
          cache: "no-store",
        });

        const data = await response.json();

        //
        const avatarUrl = data?.avatarUrl ?? data?.url;

        if (response.ok && avatarUrl) {
          setAvatarUrl(avatarUrl);
          lastGeneratedSource.current = sourceUrl;
        } else {
          console.error("Avatar API failed:", data);
        }
      } catch (e) {
        console.error("Error generating avatar", e);
      } finally {
        setIsGeneratingAvatar(false);
      }
    };

    handleAvatarGen();
  }, [uploadedPhoto]);

  const nextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    const fields = steps[currentStep].fields;
    const isValid = await trigger(fields as unknown as FieldPath<FormData>[]);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (recipe) {
      reset({
        grandmotherTitle: recipe.grandmotherTitle,
        firstName: recipe.firstName,
        lastName: recipe.lastName,
        recipeTitle: recipe.recipeTitle,
        country:
          allCountries.find(
            (country) =>
              country[0] === recipe.country || country[1] === recipe.country,
          )?.[1] || recipe.country,
        state: recipe.region || "",
        city: recipe.city || "",
        coordinates: recipe.coordinates || "",
        history: sanitizeHtml(recipe.history),
        geo_history: sanitizeHtml(recipe.geo_history || ""),
        recipe: sanitizeHtml(recipe.recipe),
        directions: sanitizeHtml(recipe.directions),
        influences: sanitizeHtml(recipe.influences || ""),
        traditions: sanitizeHtml(recipe.traditions || ""),
        photo: recipe.photo || [],
        dish_image: recipe.dish_image || [],
        recipe_image: recipe.recipe_image || [],
        avatar_image: recipe.avatar_image || "",
        release_signature: recipe.release_signature || false,
        userId,
      });
    }
  }, [recipe, reset, userId]);

  const onSubmit = async (data: FieldValues) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Sanitize HTML content
      const sanitizedData = {
        grandmotherTitle: data.grandmotherTitle,
        firstName: data.firstName,
        lastName: data.lastName,
        recipeTitle: data.recipeTitle,
        country:
          allCountries.find((country) => country[1] === data.country)?.[0] ||
          data.country,
        region: data.state || null,
        city: data.city || null,
        coordinates: data.coordinates || null,
        history: sanitizeHtml(data.history),
        geo_history: sanitizeHtml(data.geo_history),
        recipe: sanitizeHtml(data.recipe),
        directions: sanitizeHtml(data.directions),
        influences: sanitizeHtml(data.influences),
        traditions: sanitizeHtml(data.traditions),
        photo: data.photo || [],
        dish_image: data.dish_image || [],
        recipe_image: data.recipe_image || [],
        avatar_image: avatarUrl || data.avatar_image || null,
        release_signature: data.release_signature || false,
        user_id: data.userId,
      };

      const response = recipe
        ? await fetch("/api/recipes", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...sanitizedData,
              id: recipe.id,
              published: recipe.published,
            }),
            cache: "no-store",
          })
        : await fetch("/api/recipes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sanitizedData),
          });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle moderation/validation errors gracefully
        if (response.status === 400) {
          toast.error(errorData.message || "Invalid request");
          setIsSubmitting(false);
          return;
        }

        throw new Error(errorData.message || "Failed to save recipe");
      }

      // Redirect to the recipe list page or show success message
      router.push(recipe ? `/profile/${recipe.id}` : "/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "An error occurred while saving the recipe");
        toast.error(err.message || "An error occurred while saving the recipe");
      }
      console.error("Error saving recipe:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-20 sm:py-25 lg:py-30 px-4">
      {/* Background Image with Overlay */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <div className="absolute bg-[rgba(255,255,255,0.8)] inset-0" />
        <Image
          alt=""
          className="absolute max-w-none opacity-20 object-cover size-full"
          src="/bg.webp"
          fill
          unoptimized
        />
      </div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-[90%] sm:max-w-[80%] lg:max-w-300 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Header with Title and Step Counter */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between w-full gap-4">
            <h1 className="capitalize font-normal leading-tight text-4xl! lg:text-5xl! text-black text-center sm:text-left">
              {steps[currentStep].title}
            </h1>
            <div className="flex items-center justify-center sm:justify-end">
              <p className="font-bold leading-5 text-[14px] sm:text-[16px] text-[rgba(0,0,0,0.6)] tracking-[1.5px] sm:tracking-[2.1172px] uppercase">
                STEP {currentStep + 1} OF {steps.length}
              </p>
            </div>
          </div>

          {/* Progress Bar Hidden On Mobile */}
          <div className="flex flex-col gap-3 w-full items-center hidden sm:block">
            <div className="flex items-center w-full max-w-70 sm:max-w-full">
              <div className="flex-1 h-3 relative">
                <div className="flex gap-2 sm:gap-4 items-start size-full">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`${index === 0 ? "w-50 sm:w-70 shrink-0" : "flex-1 min-h-px min-w-px"} h-2 sm:h-3 rounded-[16777200px] ${
                        index <= currentStep ? "bg-[#ffccc8]" : "bg-white"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <p className="font-bold leading-5 text-[14px] sm:text-[16px] text-[rgba(0,0,0,0.6)] tracking-[1.5px] sm:tracking-[2.1172px] uppercase text-center">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className=" text-red-600 text-[14px]">{error}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 w-full  mx-auto"
          >
            {/* Step 1: Identity */}
            {currentStep === 0 && (
              <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Grandmother Title Field */}
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center w-full">
                    <p className="font-semibold leading-normal text-[#2c2c2c] text-[16px] sm:text-[18px] tracking-[-0.4395px]">
                      {l("grandmotherTitle")}*
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="bg-white h-11.25 sm:h-12.25 w-full rounded-[inherit]">
                      <Input
                        label={l("grandmotherTitle")}
                        hideLabel={true}
                        hideCharacterCount={true}
                        name="grandmotherTitle"
                        control={control}
                        error={errors.grandmotherTitle?.message}
                        maxLength={80}
                        className="w-full h-full  font-normal leading-normal text-[13px] sm:text-[14px] text-[#2D2D2D80]! tracking-[-0.1504px] bg-transparent border-none outline-none"
                      />
                    </div>

                    <div className="flex flex-col items-start mt-4">
                      <p className=" font-semibold leading-6 text-[#2c2c2c] text-[15px] tracking-[-0.3125px]">
                        {d("grandmotherDesc")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name Fields Row */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {/* First Name */}
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="font-semibold leading-normal text-[#2c2c2c] text-[16px] sm:text-[18px] tracking-[-0.4395px]">
                      {l("firstName")}*
                    </p>
                    <Input
                      label={l("firstName")}
                      hideLabel={true}
                      name="firstName"
                      control={control}
                      error={errors.firstName?.message}
                      maxLength={60}
                      className="w-full h-full px-3 sm:px-4 py-2 sm:py-3 items-center  font-normal leading-normal text-[13px] sm:text-[14px] text-[#2D2D2D80]! tracking-[-0.1504px] bg-transparent border-none outline-none"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="flex-1 flex flex-col gap-1">
                    <p className="font-semibold leading-normal text-[#2c2c2c] text-[16px] sm:text-[18px] tracking-[-0.4395px]">
                      {l("lastName")}*
                    </p>
                    <Input
                      label={l("lastName")}
                      hideLabel={true}
                      name="lastName"
                      control={control}
                      error={errors.lastName?.message}
                      maxLength={60}
                      className="w-full h-full px-3 sm:px-4 py-2 sm:py-3  font-normal leading-normal text-[13px] sm:text-[14px] text-[#2D2D2D80]! tracking-[-0.1504px] bg-transparent border-none outline-none"
                    />
                  </div>
                </div>

                {/* Country and City/Region using CountryStateCitySelector */}
                <CountryStateCitySelector
                  countryName="country"
                  stateName="state"
                  cityName="city"
                  coordinatesName="coordinates"
                  control={control}
                  setValue={setValue}
                />
              </div>
            )}

            {/* Step 2: Story */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                <Textarea
                  label={`${l("bio")}*`}
                  description={d("bio")}
                  name="history"
                  control={control}
                  error={errors.history?.message}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
                <Textarea
                  label={`${l("geoHistory")}*`}
                  description={d("geoHistory")}
                  name="geo_history"
                  control={control}
                  error={errors.geo_history?.message}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
              </div>
            )}

            {/* Step 3: Recipe */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                <Input
                  label={`${l("recipeTitle")}*`}
                  name="recipeTitle"
                  control={control}
                  error={errors.recipeTitle?.message}
                  maxLength={80}
                />
                <TextEditor
                  title={`${l("ingredients")}*`}
                  description={d("ingredientsDesc")}
                  name="recipe"
                  control={control}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
                <TextEditor
                  title={`${l("directions")}*`}
                  description={d("directionsDesc")}
                  name="directions"
                  control={control}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
              </div>
            )}

            {/* Step 4: Culture */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                <Textarea
                  label={`${l("traditions")}*`}
                  description={d("traditions")}
                  name="traditions"
                  control={control}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
                <Textarea
                  label={`${l("influences")}*`}
                  description={d("influences")}
                  name="influences"
                  control={control}
                  maxLength={MAX_LENGTH}
                  theme="light"
                />
              </div>
            )}

            {/* Step 5: Media */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-right-4 duration-300">
                <FileUpload
                  label={`${l("photo")}*`}
                  description={d("photoDesc")}
                  name="photo"
                  control={control}
                  maxFiles={5}
                  setValue={setValue}
                  watch={watch}
                  theme="light"
                />

                {/* AI Avatar Display Section */}
                {(isGeneratingAvatar || avatarUrl) && (
                  <div className="flex flex-col gap-2 p-4 bg-white/50 rounded-xl border border-primary-border/20">
                    <Typography
                      size="body"
                      className="font-semibold text-brown-dark"
                    >
                      Generated Avatar
                    </Typography>
                    <Typography
                      size="bodyXS"
                      className="text-brown-pale/80 mb-2"
                    >
                      {isGeneratingAvatar
                        ? "Generating your 3D Pixar style avatar..."
                        : "This beautiful 3D avatar was created automatically for the 3D map!"}
                    </Typography>
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-xl flex items-center justify-center bg-gray-100/50 backdrop-blur-md">
                      {isGeneratingAvatar ? (
                        <Loader2 className="w-8 h-8 animate-spin text-brown-pale" />
                      ) : avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt="AI Generated Avatar"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  </div>
                )}

                <FileUpload
                  label={`${l("recipeImage")}*`}
                  description={`${d("recipeImage")} You can upload one image or one video.`}
                  name="recipe_image"
                  control={control}
                  maxFiles={1}
                  maxSize={50 * 1024 * 1024}
                  accept={{
                    "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
                    "video/*": [".mp4", ".webm", ".mov", ".m4v", ".ogg"],
                  }}
                  setValue={setValue}
                  watch={watch}
                  theme="light"
                />
                <Checkbox
                  label={
                    <Typography
                      as="label"
                      htmlFor="release_signature"
                      size="bodyXS"
                      color="black"
                      className="mt-2 cursor-pointer"
                    >
                      {l("releaseSignature")}
                      <a href="/terms-of-use" target="_blank">
                        {l("termsAndConditions")}
                      </a>
                    </Typography>
                  }
                  name="release_signature"
                  control={control}
                  description={d("releaseSignature")}
                  theme="dark"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center w-full mt-4 gap-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-[#ffccc8] px-5 h-10 rounded-[2px]  font-medium text-[16px] text-[#121212] hover:bg-[#ffb8b3] transition-colors"
                >
                  {b("prevPage")}
                </button>
              )}
              <div
                className={`${currentStep === 0 ? "sm:ml-auto" : ""} w-full sm:w-auto`}
              >
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full sm:w-auto bg-[#ffccc8] px-5 h-10 rounded-[2px]  font-medium text-[16px] text-[#121212] hover:bg-[#ffb8b3] transition-colors"
                  >
                    {b("nextPage")}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-[#ffccc8] px-5 h-10 rounded-[2px]  font-medium text-[16px] text-[#121212] hover:bg-[#ffb8b3] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? b("submitting") : b("submit")}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
