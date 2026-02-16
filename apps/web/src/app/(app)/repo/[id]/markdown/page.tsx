"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

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

const LANGUAGES = [
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

type TranslatedFile = { path: string; content: string };
type MdState = "idle" | "translating" | "done";

export default function MarkdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: repo, isLoading } = useQuery(
    trpc.repository.getById.queryOptions({ id }),
  );

  const [mdFiles, setMdFiles] = useState<string[]>([]);
  const [mdLocale, setMdLocale] = useState("es");
  const [mdState, setMdState] = useState<MdState>("idle");
  const [translatedFiles, setTranslatedFiles] = useState<TranslatedFile[]>([]);

  useEffect(() => {
    if (!repo || repo.status !== "indexed" || repo.chunksIndexed === 0) return;
    fetch("/api/markdown/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repositoryId: id }),
    })
      .then((r) => r.json() as Promise<{ files?: string[] }>)
      .then((d) => setMdFiles(d.files ?? []))
      .catch(() => {});
  }, [id, repo]);

  const handleTranslate = useCallback(async () => {
    setMdState("translating");
    setTranslatedFiles([]);

    try {
      const res = await fetch("/api/markdown/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, targetLocale: mdLocale }),
      });
      const data = (await res.json()) as {
        files?: TranslatedFile[];
        error?: string;
      };

      if (!res.ok || !data.files) {
        toast.error(data.error ?? "Markdown translation failed");
        setMdState("idle");
        return;
      }

      setTranslatedFiles(data.files);
      setMdState("done");
      toast.success(`Translated ${data.files.length} markdown files`);
      queryClient.invalidateQueries({
        queryKey: trpc.repository.getById.queryOptions({ id }).queryKey,
      });
    } catch {
      toast.error("Markdown translation failed");
      setMdState("idle");
    }
  }, [id, mdLocale, queryClient]);

  const handleDownloadZip = useCallback(
    async (files: TranslatedFile[], locale: string) => {
      if (files.length === 0) return;
      const { default: JsZip } = await import("jszip");
      const zip = new JsZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${repo?.name ?? "repo"}-${locale}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [repo?.name],
  );

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
          Markdown Translation
        </h1>
        <p className="text-xs text-muted-foreground">
          {repo.owner}/{repo.name}
        </p>
      </div>

      {mdFiles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <FileText className="size-3.5" />
              Translate Markdown Files
            </CardTitle>
            <CardDescription className="text-xs">
              {mdFiles.length} markdown{" "}
              {mdFiles.length === 1 ? "file" : "files"} found &mdash; batch
              translate and download as ZIP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {mdFiles.map((f) => (
                <Badge
                  key={f}
                  variant="outline"
                  className="font-mono text-[10px]"
                >
                  {f}
                </Badge>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="md-language-select"
                  className="text-xs font-medium"
                >
                  Target Language
                </label>
                <NativeSelect
                  id="md-language-select"
                  value={mdLocale}
                  onChange={(e) => setMdLocale(e.target.value)}
                  disabled={mdState === "translating"}
                >
                  {LANGUAGES.map((lang) => (
                    <NativeSelectOption key={lang.code} value={lang.code}>
                      {lang.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              {mdState === "done" ? (
                <Button
                  onClick={() => handleDownloadZip(translatedFiles, mdLocale)}
                >
                  <Download className="size-3.5" />
                  Download ZIP
                </Button>
              ) : (
                <Button
                  onClick={handleTranslate}
                  disabled={mdState === "translating"}
                >
                  {mdState === "translating" ? (
                    <>
                      <Spinner className="size-3.5" />
                      Translating {mdFiles.length}{" "}
                      {mdFiles.length === 1 ? "file" : "files"}
                    </>
                  ) : (
                    "Translate & Download"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No markdown files found in this repository
          </CardContent>
        </Card>
      )}

      {repo.markdownTranslations.length > 0 ? (
        <>
          <Separator />
          <div>
            <h2 className="mb-3 text-sm font-semibold">
              Previous Translations
            </h2>
            <div className="space-y-2">
              {(repo.markdownTranslations as unknown as Array<{ id: string; locale: string; files: unknown; createdAt: string }>).map((t) => {
                const files = t.files as TranslatedFile[];
                return (
                  <Card key={t.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {t.locale}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {files.length}{" "}
                          {files.length === 1 ? "file" : "files"} &middot;{" "}
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadZip(files, t.locale)}
                      >
                        <Download className="size-3" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
