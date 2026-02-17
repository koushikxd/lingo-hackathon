"use client";

import { use, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Languages,
  Loader2,
  Search,
  History,
  FileCode,
  Globe,
  ArrowRightLeft,
  Check,
  ChevronDown,
} from "lucide-react";

import { trpc } from "@/utils/trpc";
import {
  PROSE_CLASSES,
  TRANSLATION_LANGUAGES,
  LANGUAGES,
} from "@/lib/constants";
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
  const [searchQuery, setSearchQuery] = useState("");

  const { data: repo, isLoading } = useQuery(
    trpc.repository.getById.queryOptions({ id }),
  );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [locale, setLocale] = useState("es");
  const [viewMode, setViewMode] = useState<"original" | "translated">(
    "original",
  );

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

  const filteredFiles = mdFiles.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase()),
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
        throw new Error(data.error ?? "Failed to load file");
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
        throw new Error(data.error ?? "Translation failed");
      return data.translated;
    },
    onSuccess: () => {
      setViewMode("translated");
      toast.success("File translated");
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
        throw new Error(data.error ?? "Batch translation failed");
      return data.files;
    },
    onSuccess: (files) => {
      toast.success(`Translated ${files.length} files`);
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
    setViewMode("original");
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

  const translatedContent = translateFileMutation.data ?? "";

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-2">
        <FileCode className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r bg-card/50">
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-sm font-semibold">Files</span>
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
              placeholder="Search..."
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
              <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                No files found
              </div>
            ) : (
              filteredFiles.map((f) => (
                <button
                  key={f}
                  onClick={() => handleSelectFile(f)}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors",
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
                Target Language
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
              Translate All
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
                  <div className="flex items-center border bg-muted/50 p-0.5">
                    <button
                      onClick={() => setViewMode("original")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium transition-all",
                        viewMode === "original"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setViewMode("translated")}
                      className={cn(
                        "px-3 py-1 text-xs font-medium transition-all",
                        viewMode === "translated"
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Translated
                    </button>
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
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="size-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        const name = selectedFile.split("/").pop() ?? "file.md";
                        handleDownloadFile(fileContent, name);
                      }}
                    >
                      Download Original
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
                      Download Translated
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {!translatedContent && (
                  <Button
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => translateFileMutation.mutate()}
                    disabled={translateFileMutation.isPending}
                  >
                    {translateFileMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="size-3.5" />
                    )}
                    Translate
                  </Button>
                )}
              </>
            )}

            <Sheet>
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
                  <SheetTitle>Translation History</SheetTitle>
                  <SheetDescription>
                    Access previous batch translations.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {repo.markdownTranslations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No history available
                    </div>
                  ) : (
                    (repo.markdownTranslations as any[]).map((t) => (
                      <div
                        key={t.id}
                        className="flex flex-col gap-3 border p-4 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-normal">
                            {LANGUAGES.find((l) => l.code === t.locale)
                              ?.label ?? t.locale}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {(t.files as any[]).length} files
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 -mr-2"
                            onClick={() =>
                              handleDownloadZip(t.files as any[], t.locale)
                            }
                          >
                            <Download className="mr-2 size-3" />
                            ZIP
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {!selectedFile ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="bg-muted p-4 border border-border">
                <FileText className="size-8 opacity-60" />
              </div>
              <p className="text-sm font-medium">
                Select a file to view content
              </p>
            </div>
          ) : loadingContent ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground/50" />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-3xl px-8 py-10">
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
