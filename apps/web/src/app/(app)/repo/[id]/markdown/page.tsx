"use client";

import { use, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  Search,
  History,
  FileCode,
  Globe,
  ArrowRightLeft,
  ChevronDown,
} from "lucide-react";

import { trpc } from "@/utils/trpc";
import {
  PROSE_CLASSES,
  TRANSLATION_LANGUAGES,
  LANGUAGES,
} from "@/lib/constants";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type TranslatedFile = { path: string; content: string };

export default function MarkdownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { t } = useUiI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: repo, isLoading } = useQuery(
    trpc.repository.getById.queryOptions({ id }),
  );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [locale, setLocale] = useState("es");
  const [viewMode, setViewMode] = useState<"original" | "translated">(
    "original",
  );
  const [historyView, setHistoryView] = useState<{
    content: string;
    locale: string;
  } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const isIndexed =
    repo?.status === "indexed" && (repo?.chunksIndexed ?? 0) > 0;

  const { data: mdFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: [id, "md-files"],
    queryFn: async () => {
      const res = await fetch("/api/markdown/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id }),
      });
      const data = (await res.json()) as { files?: string[] };
      return data.files ?? [];
    },
    enabled: isIndexed,
  });

  const filteredFiles = useMemo(
    () =>
      mdFiles.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase())),
    [mdFiles, searchQuery],
  );

  const { data: fileContent = "", isLoading: loadingContent } = useQuery({
    queryKey: [id, "md-content", selectedFile],
    queryFn: async () => {
      const res = await fetch("/api/markdown/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, filePath: selectedFile }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok || !data.content)
        throw new Error(data.error ?? t("markdown.toastLoadFileFailed"));
      return data.content;
    },
    enabled: !!selectedFile,
  });

  const translateFileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markdown/translate-file", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repositoryId: id,
          filePath: selectedFile,
          targetLocale: locale,
        }),
      });
      const data = (await res.json()) as {
        translated?: string;
        error?: string;
      };
      if (!res.ok || !data.translated)
        throw new Error(data.error ?? t("markdown.toastTranslationFailed"));
      return data.translated;
    },
    onSuccess: () => {
      setViewMode("translated");
      toast.success(t("markdown.toastFileTranslated"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const batchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markdown/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, targetLocale: locale }),
      });
      const data = (await res.json()) as {
        files?: TranslatedFile[];
        error?: string;
      };
      if (!res.ok || !data.files)
        throw new Error(
          data.error ?? t("markdown.toastBatchTranslationFailed"),
        );
      return data.files;
    },
    onSuccess: (files) => {
      toast.success(
        t("markdown.toastBatchTranslated", { count: files.length }),
      );
      queryClient.invalidateQueries({
        queryKey: trpc.repository.getById.queryOptions({ id }).queryKey,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectFile = (filePath: string) => {
    setSelectedFile(filePath);
    translateFileMutation.reset();
    setHistoryView(null);
    setViewMode("original");
  };

  const handleViewHistoryFile = (
    filePath: string,
    content: string,
    historyLocale: string,
  ) => {
    setSelectedFile(filePath);
    translateFileMutation.reset();
    setHistoryView({ content, locale: historyLocale });
    setViewMode("translated");
    setHistoryOpen(false);
  };

  const handleDownloadFile = useCallback(
    (content: string, filename: string) => {
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const handleDownloadZip = useCallback(
    async (files: TranslatedFile[], translationLocale: string) => {
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
      a.download = `${repo?.name ?? "repo"}-${translationLocale}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [repo?.name],
  );

  const translatedContent =
    translateFileMutation.data ?? historyView?.content ?? "";
  const isTranslating = translateFileMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center motion-safe:animate-in motion-safe:fade-in duration-200">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-2 motion-safe:animate-in motion-safe:fade-in duration-300">
        <FileCode className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("common.repositoryNotFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background motion-safe:animate-in motion-safe:fade-in duration-200">
      <div className="flex w-64 flex-col border-r bg-card/50">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold">{t("markdown.files")}</span>
          <Badge
            variant="secondary"
            className="ml-auto text-[10px] font-normal"
          >
            {mdFiles.length}
          </Badge>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {loadingFiles ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="mb-1 h-7 w-full" />
              ))
            ) : filteredFiles.length === 0 ? (
              <div className="px-2 py-8 text-center text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in duration-200">
                {t("markdown.noFilesFound")}
              </div>
            ) : (
              filteredFiles.map((f) => (
                <button
                  key={f}
                  onClick={() => handleSelectFile(f)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-[color,background-color] duration-150 ease-out",
                    selectedFile === f
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <FileText className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{f}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-3 bg-card/80 backdrop-blur-sm">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {t("markdown.targetLanguage")}
              </label>
              <Select
                value={locale}
                onValueChange={(val) => val && setLocale(val)}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <SelectItem
                      key={lang.code}
                      value={lang.code}
                      className="text-xs"
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full h-8 text-xs"
              size="sm"
              onClick={() => batchMutation.mutate()}
              disabled={batchMutation.isPending || mdFiles.length === 0}
            >
              {batchMutation.isPending ? (
                <Loader2 className="mr-2 size-3 animate-spin" />
              ) : (
                <Globe className="mr-2 size-3" />
              )}
              {t("common.translateAll")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground truncate">
                {selectedFile ?? "Select a file"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedFile && (
              <>
                {translatedContent && (
                  <div className="flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in duration-200">
                    {historyView && (
                      <Badge variant="secondary" className="text-[10px]">
                        {LANGUAGES.find((l) => l.code === historyView.locale)
                          ?.label ?? historyView.locale}
                      </Badge>
                    )}
                    <div className="flex items-center border bg-muted/50 p-0.5">
                      <button
                        onClick={() => setViewMode("original")}
                        className={cn(
                          "px-3 py-1 text-xs font-medium transition-all duration-150 ease-out",
                          viewMode === "original"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t("common.original")}
                      </button>
                      <button
                        onClick={() => setViewMode("translated")}
                        className={cn(
                          "px-3 py-1 text-xs font-medium transition-all duration-150 ease-out",
                          viewMode === "translated"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t("common.translated")}
                      </button>
                    </div>
                  </div>
                )}

                <div className="h-4 w-px bg-border mx-2" />

                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "h-8 gap-2",
                    })}
                  >
                    <Download className="size-3.5" />
                    <span className="hidden sm:inline">
                      {t("common.export")}
                    </span>
                    <ChevronDown className="size-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        const name = selectedFile.split("/").pop() ?? "file.md";
                        handleDownloadFile(fileContent, name);
                      }}
                    >
                      {t("markdown.downloadOriginal")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!translatedContent}
                      onClick={() => {
                        const name = selectedFile.split("/").pop() ?? "file.md";
                        handleDownloadFile(
                          translatedContent,
                          `${locale}-${name}`,
                        );
                      }}
                    >
                      {t("markdown.downloadTranslated")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!translatedContent && (
                  <Button
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => translateFileMutation.mutate()}
                    disabled={isTranslating}
                  >
                    {isTranslating ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="size-3.5" />
                    )}
                    {t("common.translate")}
                  </Button>
                )}
              </>
            )}

            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "h-8 w-8 ml-2",
                })}
              >
                <History className="size-4 text-muted-foreground" />
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{t("markdown.translationHistory")}</SheetTitle>
                  <SheetDescription>
                    {t("markdown.accessPreviousTranslations")}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {repo.markdownTranslations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {t("markdown.noHistoryAvailable")}
                    </div>
                  ) : (
                    (repo.markdownTranslations as any[]).map((translation) => (
                      <div
                        key={translation.id}
                        className="border text-sm overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-normal">
                              {LANGUAGES.find(
                                (l) => l.code === translation.locale,
                              )?.label ?? translation.locale}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                translation.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() =>
                              handleDownloadZip(
                                translation.files as any[],
                                translation.locale,
                              )
                            }
                          >
                            <Download className="mr-1.5 size-3" />
                            {t("markdown.zip")}
                          </Button>
                        </div>
                        <div className="border-t divide-y">
                          {(translation.files as TranslatedFile[]).map(
                            (file) => (
                              <button
                                key={file.path}
                                onClick={() =>
                                  handleViewHistoryFile(
                                    file.path,
                                    file.content,
                                    translation.locale,
                                  )
                                }
                                className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 ease-out"
                              >
                                <FileText className="size-3 shrink-0 opacity-50" />
                                <span className="truncate">{file.path}</span>
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {isTranslating && (
          <div className="flex items-center gap-3 border-b border-neutral-700/50 bg-neutral-900/30 px-6 py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 duration-200">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span className="text-xs font-medium">
              {t("common.translating")}
            </span>
            <Badge variant="outline" className="text-[10px] font-normal">
              {TRANSLATION_LANGUAGES.find((l) => l.code === locale)?.label ??
                locale}
            </Badge>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {!selectedFile ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground motion-safe:animate-in motion-safe:fade-in duration-300">
              <div className="bg-muted p-4 border border-border">
                <FileText className="size-8 opacity-60" />
              </div>
              <p className="text-sm font-medium">
                {t("markdown.selectFilePrompt")}
              </p>
            </div>
          ) : loadingContent ? (
            <div className="flex h-full items-center justify-center motion-safe:animate-in motion-safe:fade-in duration-200">
              <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
            </div>
          ) : (
            <ScrollArea className="h-full" key={`${selectedFile}-${viewMode}`}>
              <div className="mx-auto max-w-3xl px-8 py-10 motion-safe:animate-in motion-safe:fade-in duration-200">
                <article className={PROSE_CLASSES}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {viewMode === "translated" && translatedContent
                      ? translatedContent
                      : fileContent}
                  </ReactMarkdown>
                </article>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
