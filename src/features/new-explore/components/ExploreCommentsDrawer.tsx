"use client";

import CommentSection from "@/components/Comments/CommentSection";
import { useInvalidateGlobe } from "../hooks/useInvalidateGlobe";

export default function ExploreCommentsDrawer({
  open,
  recipeId,
  nonnaDisplayName,
  titleName,
  photo,
  countryCode,
  userId,
  onClose,
}: {
  open: boolean;
  recipeId: number;
  nonnaDisplayName: string;
  titleName: string;
  photo: string | null;
  countryCode: string;
  userId?: string;
  onClose: () => void;
}) {
  const { invalidateRecipes, invalidateClusters } = useInvalidateGlobe();

  if (!open || !recipeId) return null;

  const handleClose = () => {
    void invalidateRecipes();
    void invalidateClusters();
    onClose();
  };

  return (
    <CommentSection
      recipeId={recipeId}
      nonnaDisplayName={nonnaDisplayName}
      nonnaTitle={titleName}
      photoUrl={photo}
      userId={userId}
      onClose={handleClose}
    />
  );
}
