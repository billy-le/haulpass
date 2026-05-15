import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenAI, Type } from "@google/genai";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, nullable: true },
    description: { type: Type.STRING, nullable: true },
    general_location: { type: Type.STRING, nullable: true },
    relevant_indices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
    make: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    height: { type: Type.NUMBER, nullable: true },
    width: { type: Type.NUMBER, nullable: true },
    length: { type: Type.NUMBER, nullable: true },
    dimension_unit: { type: Type.STRING, nullable: true },
    weight: { type: Type.NUMBER, nullable: true },
    weight_unit: { type: Type.STRING, nullable: true },
  },
  required: [
    "name",
    "description",
    "general_location",
    "relevant_indices",
    "make",
    "model",
    "height",
    "width",
    "length",
    "dimension_unit",
    "weight",
    "weight_unit",
  ],
};

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { error: authErr } = await userClient.auth.getUser();
  if (authErr) return new Response("Unauthorized", { status: 401 });

  let body: { images?: { data: string; mimeType: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { images } = body;
  if (!Array.isArray(images) || images.length === 0) {
    return new Response("images must be a non-empty array", { status: 422 });
  }

  const ai = new GoogleGenAI({ apiKey: Deno.env.get("GOOGLE_GENAI_API_KEY")! });

  const imageParts = images.map(({ data, mimeType }) => ({
    inlineData: { data, mimeType },
  }));

  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          ...imageParts,
          {
            text: `You are a logistics assistant helping describe items that need to be hauled or moved.

Analyze the provided images and extract the following:

- name: A short, clear item name (e.g. "Sectional Sofa", "Upright Piano", "Dining Table Set"). Do not copy text from the image — infer from what you see.
- description: A concise, practical description of the item focusing on what matters for hauling: material, color, condition, notable features. 2-3 sentences max. Do not copy listing text verbatim.
- general_location: City or region if visible anywhere in the images. Null if not visible.
- relevant_indices: Indices (0-based) of images that clearly show the item. Exclude blurry, duplicate, or background-only images. Include all if unsure.
- make: Brand or manufacturer if identifiable (e.g. "IKEA", "Herman Miller"). Null if unknown.
- model: Specific model name/number if identifiable. Null if unknown.
- height, width, length: Estimated or visible dimensions as numbers. Null if not determinable.
- dimension_unit: Unit for dimensions — "inches" or "centimeters". Null if dimensions are null.
- weight: Estimated or visible weight as a number. Null if not determinable.
- weight_unit: Unit for weight — "lbs" or "kg". Null if weight is null.

Images are indexed 0 to ${images.length - 1}.
Return null for any field that cannot be determined.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = result.text;
  if (!text) {
    return new Response(JSON.stringify({ error: "No response from model" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
