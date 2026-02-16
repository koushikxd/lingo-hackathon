import { env } from "@lingo-dev/env/server";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

const supportedLocales = [
  "en",
  "es",
  "fr",
  "de",
  "pt-BR",
  "zh-CN",
  "ja",
  "ko",
  "hi",
  "ar",
  "ru",
  "it",
  "nl",
  "tr",
  "pl",
] as const;

const bodySchema = z.object({
  text: z.string().transform((value) => value.trim()).pipe(z.string().min(1)),
  targetLocale: z.enum(supportedLocales),
});

const engine = new LingoDotDevEngine({
  apiKey: env.LINGODOTDEV_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const translatedText = await engine.localizeText(body.text, {
      sourceLocale: "en",
      targetLocale: body.targetLocale,
    });

    return NextResponse.json({ translatedText });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide text and targetLocale." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
