export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt-BR", label: "Portuguese (BR)" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "tr", label: "Turkish" },
  { code: "pl", label: "Polish" },
] as const;

export const TRANSLATION_LANGUAGES = LANGUAGES.filter((l) => l.code !== "en");

export const PROSE_CLASSES =
  "prose dark:prose-invert max-w-none [&>:first-child]:mt-0 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:text-base [&_h4]:font-medium [&_p]:text-[15px] [&_p]:leading-7 [&_p]:text-foreground/80 [&_li]:text-[15px] [&_li]:leading-7 [&_li]:text-foreground/80 [&_a]:text-primary [&_a]:decoration-primary/30 hover:[&_a]:decoration-primary [&_strong]:text-foreground [&_blockquote]:border-primary/30 [&_blockquote]:text-foreground/60 [&_pre]:bg-muted/50 [&_pre]:border [&_pre]:border-border [&_pre]:p-4 [&_pre]:rounded-lg [&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_code]:before:content-none [&_code]:after:content-none [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:bg-muted/50 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_hr]:border-border [&_img]:rounded-lg";
