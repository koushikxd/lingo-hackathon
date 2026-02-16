"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, ClipboardCopy, Globe, Languages } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

type AppState = "idle" | "indexing" | "indexed" | "generating" | "translating" | "done";

const LANGUAGES = [
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

const isValidGitHubUrl = (value: string) =>
  /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/i.test(value.trim());

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [repoUrl, setRepoUrl] = useState("");
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");
  const [chunksIndexed, setChunksIndexed] = useState(0);
  const [locale, setLocale] = useState("en");
  const [docContent, setDocContent] = useState("");
  const [copied, setCopied] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const handleIndex = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = repoUrl.trim();
      if (!isValidGitHubUrl(trimmed)) {
        toast.error("Enter a valid GitHub URL (https://github.com/owner/repo)");
        return;
      }

      setState("indexing");
      try {
        const res = await fetch("/api/repository/index", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoUrl: trimmed }),
        });
        const data = (await res.json()) as {
          success: boolean;
          repositoryId?: string;
          chunksIndexed?: number;
          repository?: { name: string };
          error?: string;
        };

        if (!res.ok || !data.success) {
          toast.error(data.error ?? "Failed to index repository");
          setState("idle");
          return;
        }

        setRepositoryId(data.repositoryId ?? null);
        setChunksIndexed(data.chunksIndexed ?? 0);
        setRepoName(data.repository?.name ?? trimmed.split("/").pop() ?? "");
        setState("indexed");
        toast.success("Repository indexed successfully");
      } catch {
        toast.error("Failed to index repository");
        setState("idle");
      }
    },
    [repoUrl],
  );

  const handleGenerate = useCallback(async () => {
    if (!repositoryId) return;
    setState("generating");
    setDocContent("");

    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to generate docs");
        setState("indexed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setDocContent(accumulated);
      }

      if (locale !== "en") {
        setState("translating");
        const translateRes = await fetch("/api/onboarding/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: accumulated, targetLocale: locale }),
        });
        const translateData = (await translateRes.json()) as {
          translatedText?: string;
          error?: string;
        };

        if (translateRes.ok && translateData.translatedText) {
          setDocContent(translateData.translatedText);
        } else {
          toast.error("Translation failed, showing English version");
        }
      }

      setState("done");
    } catch {
      toast.error("Something went wrong during generation");
      setState("indexed");
    }
  }, [repositoryId, locale]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(docContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [docContent]);

  const handleReset = useCallback(() => {
    setState("idle");
    setRepoUrl("");
    setRepositoryId(null);
    setRepoName("");
    setChunksIndexed(0);
    setLocale("en");
    setDocContent("");
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span className="text-sm font-semibold tracking-tight">lingo-dev</span>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Onboarding Doc Generator</h1>
          <p className="text-xs text-muted-foreground">
            Paste a GitHub repository URL, pick a language, and get onboarding docs instantly.
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repository</CardTitle>
              <CardDescription>Public GitHub repository to generate docs for</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIndex} className="flex gap-2">
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  autoComplete="off"
                  disabled={state !== "idle"}
                />
                {state === "idle" ? (
                  <Button type="submit">Index</Button>
                ) : state === "indexing" ? (
                  <Button disabled>
                    <Spinner className="size-3.5" />
                    Indexing
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </form>
              {state !== "idle" && state !== "indexing" && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary">{repoName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {chunksIndexed} chunks indexed
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {state !== "idle" && state !== "indexing" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Languages className="size-3.5" />
                  Generate Docs
                </CardTitle>
                <CardDescription>
                  Choose a language and generate onboarding documentation powered by AI &amp;
                  lingo.dev
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <div className="space-y-1.5">
                    <label htmlFor="language-select" className="text-xs font-medium">
                      Language
                    </label>
                    <NativeSelect
                      id="language-select"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value)}
                      disabled={state === "generating" || state === "translating"}
                    >
                      {LANGUAGES.map((lang) => (
                        <NativeSelectOption key={lang.code} value={lang.code}>
                          {lang.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={state === "generating" || state === "translating"}
                  >
                    {state === "generating" ? (
                      <>
                        <Spinner className="size-3.5" />
                        Generating
                      </>
                    ) : state === "translating" ? (
                      <>
                        <Spinner className="size-3.5" />
                        Translating
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
                {locale !== "en" && state !== "generating" && state !== "translating" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Docs will be generated in English first, then translated to{" "}
                    {LANGUAGES.find((l) => l.code === locale)?.label ?? locale} using lingo.dev
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {docContent && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {state === "generating"
                      ? "Generating..."
                      : state === "translating"
                        ? "Translating..."
                        : "Onboarding Documentation"}
                  </CardTitle>
                  {state === "done" && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="size-3" /> : <ClipboardCopy className="size-3" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  )}
                </div>
                {state === "translating" && (
                  <CardDescription className="flex items-center gap-1.5">
                    <Spinner className="size-3" />
                    Translating to {LANGUAGES.find((l) => l.code === locale)?.label ?? locale} via
                    lingo.dev...
                  </CardDescription>
                )}
              </CardHeader>
              <Separator />
              <CardContent>
                <div
                  ref={docRef}
                  className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{docContent}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
