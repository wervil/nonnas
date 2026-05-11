import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Moderates text content using OpenAI's moderation API.
 * Returns true if the content is flagged as inappropriate, false otherwise.
 */
export async function moderateContent(text: string): Promise<boolean> {
  // Fallback if no API key is provided (fail open or closed? usually open for dev, but let's do basic keyword check for demo)
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Using basic keyword moderation.");
    return basicKeywordModeration(text);
  }

  try {
    const response = await openai.moderations.create({
      input: text,
    });

    const result = response.results[0];

    if (result.flagged) {
      console.log("Content flagged by OpenAI:", result.categories);
      return true;
    }

    console.log("OpenAI moderation result passed");

    // OpenAI didn't flag it, but let's check our custom blocklist
    // This catches things OpenAI might consider "safe" but we want to block (e.g. "spam", profanity)
    return basicKeywordModeration(text);
  } catch (error) {
    console.error("Error in content moderation:", error);
    // If moderation fails, we might want to allow it or block it.
    // Blocking prevents potential abuse during outages, but might frustrate users.
    // For now, let's log and fallback to keyword check.
    return basicKeywordModeration(text);
  }
}

function basicKeywordModeration(text: string): boolean {
  // Expanded fallback list for demonstration
  const badWords = [
    "spam",
    "inappropriate",
    "offensive",
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "dick",
    "stupid",
    "idiot",
    "hate",
    "kill",
    "die",
  ];

  // Whole-word match only, so "die" doesn't trip on "medieval"/"ingredient",
  // "kill" doesn't trip on "skill", etc. Unicode-aware boundaries via
  // lookarounds keep matching correct around accented prose ("ragù").
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])(${badWords.join("|")})(?=$|[^\\p{L}\\p{N}])`,
    "iu"
  );

  const match = pattern.exec(text);
  if (match) {
    console.log("Basic keyword moderation: blocked on", match[1]);
    return true;
  }
  return false;
}
