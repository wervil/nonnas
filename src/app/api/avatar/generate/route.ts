import Replicate from "replicate";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  prompt?: string;
  input_image?: string;
  imageUrl?: string;
  output_format?: "jpg" | "png" | "webp";
};

function pickUrl(output: any): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (typeof output?.url === "string") return output.url;
  return null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Missing REPLICATE_API_TOKEN in env" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Body;

    // Accept both keys from frontend
    const input_image = body.input_image ?? body.imageUrl;
    const prompt = body.prompt ?? "Make this a 90s cartoon";
    const output_format = body.output_format ?? "jpg";

    if (!input_image) {
      return NextResponse.json(
        { error: "input_image (or imageUrl) is required", received: body },
        { status: 400 }
      );
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // ✅ Create prediction (async on Replicate)
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        input_image,
        output_format,
      },
    });

    // ✅ Wait until done (this is the key fix)
    const done = await replicate.wait(prediction);

    if (done.status !== "succeeded") {
      return NextResponse.json(
        {
          error: "Replicate prediction failed",
          status: done.status,
          logs: done.logs,
          detail: done.error,
        },
        { status: 500 }
      );
    }

    const url = pickUrl(done.output);

    return NextResponse.json(
      {
        avatarUrl: url,      // ✅ match your frontend expectation
        output: done.output, // helpful for debugging
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/avatar/generate] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
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