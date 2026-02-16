"use client";

import { use, useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, ClipboardCopy, Languages } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

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

type GenerateState = "idle" | "generating" | "translating" | "done";

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const selectedDocId = searchParams.get("doc");
  const queryClient = useQueryClient();

  const { data: repo, isLoading } = useQuery(
    trpc.repository.getById.queryOptions({ id }),
  );

  const [state, setState] = useState<GenerateState>("idle");
  const [locale, setLocale] = useState("en");
  const [docContent, setDocContent] = useState("");
  const [copied, setCopied] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const selectedDoc = selectedDocId
    ? repo?.onboardingDocs.find((d) => d.id === selectedDocId)
    : null;

  const displayContent = state !== "idle" ? docContent : (selectedDoc?.content ?? "");

  const handleGenerate = useCallback(async () => {
    setState("generating");
    setDocContent("");

    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Failed to generate docs");
        setState("idle");
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
          accumulated = translateData.translatedText;
          setDocContent(accumulated);
        } else {
          toast.error("Translation failed, showing English version");
        }
      }

      const saveRes = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, content: accumulated, locale }),
      });

      if (saveRes.ok) {
        queryClient.invalidateQueries({ queryKey: trpc.repository.getById.queryOptions({ id }).queryKey });
      }

      setState("done");
    } catch {
      toast.error("Something went wrong during generation");
      setState("idle");
    }
  }, [id, locale, queryClient]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!repo) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Repository not found
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Onboarding Docs
        </h1>
        <p className="text-xs text-muted-foreground">
          {repo.owner}/{repo.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Languages className="size-3.5" />
            Generate Documentation
          </CardTitle>
          <CardDescription className="text-xs">
            Choose a language and generate onboarding docs powered by AI
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
        </CardContent>
      </Card>

      {displayContent ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {state === "generating"
                  ? "Generating..."
                  : state === "translating"
                    ? "Translating..."
                    : "Documentation"}
              </CardTitle>
              {(state === "done" || (state === "idle" && displayContent)) ? (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <ClipboardCopy className="size-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <Separator />
          <CardContent>
            <div
              ref={docRef}
              className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {repo.onboardingDocs.length > 0 && state === "idle" && !selectedDocId ? (
        <>
          <Separator />
          <div>
            <h2 className="mb-3 text-sm font-semibold">Previous Docs</h2>
            <div className="space-y-2">
              {repo.onboardingDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/repo/${id}/onboarding?doc=${doc.id}` as never}
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {doc.locale}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">View</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
