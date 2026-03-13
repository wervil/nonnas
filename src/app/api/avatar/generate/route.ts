import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

type Body = {
  prompt?: string;
  input_image?: string | string[];
  imageUrl?: string | string[];
  output_format?: "jpg" | "png" | "webp";
};

function pickUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (
    typeof output === "object" &&
    output !== null &&
    "url" in output &&
    typeof output.url === "string"
  )
    return output.url;
  return null;
}

async function processImage(
  replicate: Replicate,
  input_image: string,
  prompt: string,
): Promise<{ avatarUrl: string; originalUrl: string }> {
  console.log("[processImage] Starting avatar generation for:", input_image);
  console.log("[processImage] Prompt:", prompt);

  // 1) Generate avatar
  console.log("[processImage] Creating prediction...");
  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-kontext-pro",
    input: {
      prompt,
      input_image,
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      safety_tolerance: 2,
    },
  });

  console.log("[processImage] Prediction created:", prediction.id);
  console.log("[processImage] Waiting for completion...");

  const done = await replicate.wait(prediction);

  console.log("[processImage] Prediction completed with status:", done.status);

  if (done.status !== "succeeded") {
    console.error("[processImage] Avatar generation failed:", done);
    throw new Error(`Avatar generation failed: ${done.status}`);
  }

  const url = pickUrl(done.output);
  console.log("[processImage] Generated avatar URL:", url);

  if (!url) {
    throw new Error("No output URL from avatar generation");
  }

  // 2) Remove background
  console.log("[processImage] Starting background removal...");
  const backgroundRemoval = await replicate.run(
    "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    {
      input: {
        image: url,
      },
    },
  );

  const transparentUrl = pickUrl(backgroundRemoval);
  console.log(
    "[processImage] Background removed, transparent URL:",
    transparentUrl,
  );

  return {
    avatarUrl: transparentUrl || url,
    originalUrl: url,
  };
}

export async function POST(req: Request) {
  console.log("[POST] Avatar generation request received");

  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("[POST] Missing REPLICATE_API_TOKEN");
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN in env" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as Body;
    console.log("[POST] Request body:", body);

    // Accept both keys from frontend, support single or multiple images
    const input_images = body.input_image ?? body.imageUrl;
    const prompt =
      body.prompt ??
      "Make this a 90s cartoon avatar, clean outlines, vibrant colors";

    console.log("[POST] Input images:", input_images);
    console.log("[POST] Prompt:", prompt);

    // Normalize to array and filter out undefined values
    const imageArray = (
      Array.isArray(input_images) ? input_images : [input_images]
    ).filter((img): img is string => img !== undefined && img !== null);

    console.log("[POST] Processed image array:", imageArray);

    if (!input_images || imageArray.length === 0) {
      console.error("[POST] No valid images provided");
      return NextResponse.json(
        { error: "input_image (or imageUrl) is required", received: body },
        { status: 400 },
      );
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    console.log("[POST] Replicate client initialized");

    // Process all images in parallel
    try {
      console.log(
        "[POST] Starting parallel processing of",
        imageArray.length,
        "images",
      );
      const results = await Promise.all(
        imageArray.map((image) => processImage(replicate, image, prompt)),
      );

      console.log("[POST] All images processed successfully");
      console.log("[POST] Results:", results);

      return NextResponse.json(
        {
          results: results, // Array of { avatarUrl, originalUrl }
          count: results.length,
        },
        { status: 200 },
      );
    } catch (error: any) {
      console.error("[POST] Error during parallel processing:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[/api/avatar/generate] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

// import Replicate from "replicate";
// import { NextResponse } from "next/server";

// export const runtime = "nodejs";

// type Body = {
//   imageUrl?: string;      // what your frontend sends
//   input_image?: string;   // optional alternate key
//   output_format?: "jpg" | "png" | "webp";
// };

// function outputToUrl(out: any): string | null {
//   if (!out) return null;

//   // FileOutput object
//   if (typeof out?.url === "function") return out.url();

//   // direct string URL
//   if (typeof out === "string") return out;

//   // array of URLs / FileOutputs
//   if (Array.isArray(out) && out.length > 0) {
//     const first = out[0];
//     if (typeof first?.url === "function") return first.url();
//     if (typeof first === "string") return first;
//   }

//   return null;
// }

// export async function POST(req: Request) {
//   try {
//     if (!process.env.REPLICATE_API_TOKEN) {
//       return NextResponse.json(
//         { error: "Missing REPLICATE_API_TOKEN in env" },
//         { status: 500 }
//       );
//     }

//     const body = (await req.json()) as Body;
//     console.log("[/api/avatar/generate] body:", body);

//     const input_image = body.input_image ?? body.imageUrl;
//     const output_format = body.output_format ?? "jpg";

//     if (!input_image) {
//       return NextResponse.json(
//         { error: "imageUrl (or input_image) is required" },
//         { status: 400 }
//       );
//     }

//     const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

//     // 1) Face gate (detect + crop). Returns a URL if face exists.
//     const faceCrop = await replicate.run(
//       "ahmdyassr/detect-crop-face:23ef97b1c72422837f0b25aacad4ec5fa8e2423e2660bc4599347287e14cf94d",
//       {
//         input: {
//           image: input_image,
//           padding: 0.2,
//         },
//         wait: { mode: "poll" },
//       }
//     );

//     const faceCropUrl = outputToUrl(faceCrop);

//     if (!faceCropUrl) {
//       return NextResponse.json(
//         { error: "No person/face detected. Please upload a clear photo of a person." },
//         { status: 400 }
//       );
//     }

//     // 2) Avatar generation with a backend default prompt (frontend doesn't need to send it)
//     const prompt =
//       "Make this a 90s cartoon";

//     const avatarOut = await replicate.run("black-forest-labs/flux-kontext-pro", {
//       input: {
//         prompt,
//         input_image,
//         output_format,
//       },
//       wait: { mode: "poll" },
//     });

//     const avatarUrl = outputToUrl(avatarOut);

//     if (!avatarUrl) {
//       return NextResponse.json(
//         { error: "Avatar generation returned empty output", output: avatarOut },
//         { status: 500 }
//       );
//     }

//     // ✅ Return avatarUrl because your frontend checks that key
//     return NextResponse.json(
//       { avatarUrl, faceCropUrl },
//       { status: 200 }
//     );
//   } catch (err: any) {
//     console.error("[/api/avatar/generate] error:", err);
//     return NextResponse.json(
//       { error: err?.message ?? "Unknown error" },
//       { status: 500 }
//     );
//   }
// }
