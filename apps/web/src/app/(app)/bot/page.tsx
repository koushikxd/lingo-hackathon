"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Building2,
  ExternalLink,
  Languages,
  Sparkles,
  Tags,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "zh-CN", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "ru", label: "Russian" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "tr", label: "Turkish" },
  { value: "pl", label: "Polish" },
] as const;

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/lingo-bolt/installations/new";

export default function BotDashboardPage() {
  const queryClient = useQueryClient();
  const { data: installations, isLoading } = useQuery(trpc.bot.list.queryOptions());

  const updateMutation = useMutation(
    trpc.bot.updateSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Settings updated");
        queryClient.invalidateQueries({
          queryKey: trpc.bot.list.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update settings");
      },
    }),
  );

  const installCount = installations?.length ?? 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6 pt-6 pb-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">lingo-bolt</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          GitHub App for translation, summarization, and auto-labeling
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">
            GitHub App
          </Badge>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {installCount} installation{installCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4" aria-hidden="true" />
              Installations
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage per-account settings and defaults
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-3 w-20" />
              ) : installCount > 0 ? (
                `${installCount} active`
              ) : (
                "Not installed"
              )}
            </span>
            <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]">
                <ExternalLink className="size-3" aria-hidden="true" />
                Add to GitHub
              </Button>
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="size-4" aria-hidden="true" />
              Commands
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mention the bot in any issue or pull request
            </p>
          </div>
          <div className="mt-4 space-y-1">
            <code className="block text-[10px] font-mono text-muted-foreground">
              @lingo-bolt translate to spanish
            </code>
            <code className="block text-[10px] font-mono text-muted-foreground">
              @lingo-bolt summarize in french
            </code>
          </div>
        </div>
      </div>

      {isLoading ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Installations</h2>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-neutral-700 bg-neutral-900 p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </section>
      ) : installCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border py-16 text-center">
          <Bot className="size-6 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No installations yet</p>
            <p className="text-xs text-muted-foreground">
              Install lingo-bolt on your GitHub account or organization to get started
            </p>
          </div>
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="mt-1">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Add to GitHub
            </Button>
          </a>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Installations</h2>
          <div className="space-y-1.5">
            {installations!.map((inst) => (
              <InstallationCard
                key={inst.id}
                installation={inst}
                onUpdate={(data) => updateMutation.mutate({ id: inst.id, ...data })}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Reference</h2>
        <div className="space-y-1.5">
          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">Mention commands</span>
            </div>
            <div className="space-y-2 pl-5">
              <ReferenceRow
                command="@lingo-bolt translate to spanish"
                description="Translate the issue or PR body"
              />
              <ReferenceRow
                command="@lingo-bolt summarize"
                description="Summarize in your default language"
              />
              <ReferenceRow
                command="@lingo-bolt summarize in french"
                description="Summarize in a specific language"
              />
            </div>
          </div>

          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">Automatic features</span>
            </div>
            <div className="space-y-2 pl-5">
              <div className="flex items-start gap-3">
                <Tags className="size-3 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-xs text-foreground">Auto-labeling</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    — adds{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                      lang:chinese
                    </code>{" "}
                    labels on new issues
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Languages className="size-3 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-xs text-foreground">Auto-translate</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    — translates new issues to your default language
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReferenceRow({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <code className="shrink-0 font-mono text-[10px] text-foreground">{command}</code>
      <span className="text-[10px] text-muted-foreground">— {description}</span>
    </div>
  );
}

type Installation = {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  defaultLanguage: string;
  autoTranslate: boolean;
  autoLabel: boolean;
};

function InstallationCard({
  installation,
  onUpdate,
  isPending,
}: {
  installation: Installation;
  onUpdate: (data: {
    defaultLanguage?: string;
    autoTranslate?: boolean;
    autoLabel?: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [language, setLanguage] = useState(installation.defaultLanguage);
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-neutral-700 bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          {installation.accountType === "Organization" ? (
            <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">{installation.accountLogin}</span>
          <Badge variant="outline" className="text-[10px]">
            {installation.accountType}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Close" : "Settings"}</span>
      </button>

      {open && (
        <div className="divide-y divide-neutral-700 border-t border-neutral-700 px-4">
          <div className="flex items-center justify-between py-3">
            <Label
              htmlFor={`lang-${installation.id}`}
              className="text-xs font-normal text-muted-foreground"
            >
              Default language
            </Label>
            <Select
              value={language}
              onValueChange={(val) => {
                if (!val) return;
                setLanguage(val);
                onUpdate({ defaultLanguage: val });
              }}
            >
              <SelectTrigger id={`lang-${installation.id}`} className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label
                htmlFor={`auto-translate-${installation.id}`}
                className="text-xs font-normal"
              >
                Auto-translate
              </Label>
              <p className="text-[10px] text-muted-foreground">
                New issues and comments translated automatically
              </p>
            </div>
            <Switch
              id={`auto-translate-${installation.id}`}
              checked={installation.autoTranslate}
              onCheckedChange={(checked) => onUpdate({ autoTranslate: !!checked })}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label
                htmlFor={`auto-label-${installation.id}`}
                className="text-xs font-normal"
              >
                Auto-label
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Detect language and add labels to new issues
              </p>
            </div>
            <Switch
              id={`auto-label-${installation.id}`}
              checked={installation.autoLabel}
              onCheckedChange={(checked) => onUpdate({ autoLabel: !!checked })}
              disabled={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
