"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  CircleDot,
  Code,
  GitPullRequest,
  Loader2,
  Sparkles,
  SquarePen,
} from "lucide-react";

import { PROSE_CLASSES } from "@/lib/constants";
import { useUiI18n } from "@/components/ui-i18n-provider";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const SUGGESTED_PROMPTS = [
  { key: "chat.prompt.showOpenIssues", icon: CircleDot },
  { key: "chat.prompt.recommendEasyIssue", icon: Sparkles },
  { key: "chat.prompt.listOpenPrs", icon: GitPullRequest },
  { key: "chat.prompt.searchEntryPoint", icon: Code },
] as const;

const TOOL_LABEL_KEYS: Record<
  string,
  | "chat.tool.fetchIssues"
  | "chat.tool.loadingIssueDetails"
  | "chat.tool.fetchingPrs"
  | "chat.tool.loadingPrDetails"
  | "chat.tool.searchingCodebase"
> = {
  listIssues: "chat.tool.fetchIssues",
  getIssue: "chat.tool.loadingIssueDetails",
  listPullRequests: "chat.tool.fetchingPrs",
  getPullRequest: "chat.tool.loadingPrDetails",
  searchCodebase: "chat.tool.searchingCodebase",
};

const TOOL_ICONS: Record<string, typeof CircleDot> = {
  listIssues: CircleDot,
  getIssue: CircleDot,
  listPullRequests: GitPullRequest,
  getPullRequest: GitPullRequest,
  searchCodebase: Code,
};

function getToolResultSummary(
  toolName: string,
  output: unknown,
): string | null {
  if (!output) return null;
  if (Array.isArray(output)) {
    const count = output.length;
    switch (toolName) {
      case "listIssues":
        return `${count} issue${count === 1 ? "" : "s"}`;
      case "listPullRequests":
        return `${count} PR${count === 1 ? "" : "s"}`;
      case "searchCodebase":
        return `${count} match${count === 1 ? "" : "es"}`;
      default:
        return `${count} result${count === 1 ? "" : "s"}`;
    }
  }
  if (typeof output === "object" && output !== null) {
    const r = output as Record<string, unknown>;
    if (toolName === "getIssue" && r.title) return `#${r.number} ${r.title}`;
    if (toolName === "getPullRequest" && r.title)
      return `#${r.number} ${r.title}`;
  }
  return null;
}

type ToolPart = {
  type: `tool-${string}`;
  state: string;
  toolCallId: string;
  input?: unknown;
  output?: unknown;
};

function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-") && "toolCallId" in part;
}

function ToolCallCard({
  parts,
  t,
}: {
  parts: ToolPart[];
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 border border-neutral-700/60 bg-neutral-900/40 motion-safe:animate-in motion-safe:fade-in duration-200">
      <div className="space-y-0">
        {parts.map((part) => {
          const toolName = part.type.replace("tool-", "");
          const isActive =
            part.state === "input-streaming" ||
            part.state === "input-available";
          const isDone = part.state === "output-available";
          const isError = part.state === "output-error";
          const Icon = TOOL_ICONS[toolName] ?? Code;
          const labelKey = TOOL_LABEL_KEYS[toolName];
          const label = labelKey ? t(labelKey) : toolName;
          const summary = isDone
            ? getToolResultSummary(toolName, part.output)
            : null;

          return (
            <div
              key={part.toolCallId}
              className="flex items-center gap-2 px-3 py-1.5 text-xs"
            >
              {isActive ? (
                <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
              ) : isDone ? (
                <Check className="size-3 shrink-0 text-emerald-500" />
              ) : isError ? (
                <span className="size-3 shrink-0 bg-destructive/60" />
              ) : (
                <span className="size-1.5 shrink-0 animate-pulse bg-muted-foreground/50" />
              )}
              <Icon className="size-3 shrink-0 text-muted-foreground/70" />
              <span
                className={`${isDone || isError ? "text-muted-foreground/60" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {summary && (
                <span className="text-muted-foreground/40">· {summary}</span>
              )}
            </div>
          );
        })}
      </div>

      {parts.some(
        (p) =>
          p.state === "output-available" &&
          Array.isArray(p.output) &&
          (p.output as unknown[]).length > 0,
      ) && (
        <div className="border-t border-neutral-700/40">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] text-muted-foreground/50 transition-colors duration-150 hover:text-muted-foreground cursor-pointer"
          >
            <ChevronDown
              className={`size-2.5 transition-transform duration-150 ${expanded ? "rotate-0" : "-rotate-90"}`}
            />
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded && (
            <div className="max-h-48 overflow-y-auto border-t border-neutral-700/30 px-3 py-2 motion-safe:animate-in motion-safe:fade-in duration-150">
              {parts
                .filter(
                  (p) =>
                    p.state === "output-available" && Array.isArray(p.output),
                )
                .map((p) => {
                  const toolName = p.type.replace("tool-", "");
                  const items = p.output as Record<string, unknown>[];
                  return items.slice(0, 10).map((item, idx) => (
                    <div
                      key={`${p.toolCallId}-${idx}`}
                      className="flex items-center gap-2 py-0.5 text-[10px] text-muted-foreground/70"
                    >
                      {(toolName === "listIssues" ||
                        toolName === "getIssue") && (
                        <>
                          <CircleDot className="size-2.5 shrink-0" />
                          <span className="font-mono">
                            #{String(item.number)}
                          </span>
                          <span className="truncate">
                            {String(item.title ?? "")}
                          </span>
                        </>
                      )}
                      {(toolName === "listPullRequests" ||
                        toolName === "getPullRequest") && (
                        <>
                          <GitPullRequest className="size-2.5 shrink-0" />
                          <span className="font-mono">
                            #{String(item.number)}
                          </span>
                          <span className="truncate">
                            {String(item.title ?? "")}
                          </span>
                        </>
                      )}
                      {toolName === "searchCodebase" && (
                        <>
                          <Code className="size-2.5 shrink-0" />
                          <span className="truncate font-mono">
                            {String(item.filePath ?? "")}
                          </span>
                        </>
                      )}
                    </div>
                  ));
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2 motion-safe:animate-in motion-safe:fade-in duration-200">
      <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:300ms]" />
    </div>
  );
}

export default function RepoChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const { t } = useUiI18n();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { repositoryId: id },
      }),
    [id],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
    inputRef.current?.focus();
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  return (
    <div className="-mx-3 flex h-[calc(100vh-3rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 pb-16 motion-safe:animate-in motion-safe:fade-in duration-300">
            <div className="text-center">
              <p className="text-sm font-medium">{t("chat.emptyTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("chat.emptySubtitle")}
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-1.5 stagger-fade-in">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.key}
                  type="button"
                  onClick={() => handlePromptClick(t(prompt.key))}
                  disabled={isLoading}
                  className="flex items-center gap-2 border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-left text-xs transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.97] disabled:opacity-40 cursor-pointer motion-safe:transition-[background-color,transform]"
                >
                  <prompt.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{t(prompt.key)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
            {messages.map((message) => {
              if (message.role === "user") {
                return (
                  <div
                    key={message.id}
                    className="flex justify-end motion-safe:animate-in motion-safe:fade-in duration-200"
                  >
                    <div className="max-w-[72%]">
                      {message.parts.map((part, i) =>
                        part.type === "text" ? (
                          <div
                            key={i}
                            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm leading-relaxed"
                          >
                            {part.text}
                          </div>
                        ) : null,
                      )}
                    </div>
                  </div>
                );
              }

              const toolParts = message.parts.filter((p) =>
                isToolPart(p),
              ) as ToolPart[];
              const textParts = message.parts.filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              );
              const hasText = textParts.some((p) => p.text.trim().length > 0);
              const isLastMessage = message === messages[messages.length - 1];
              const showThinking = isLastMessage && isLoading && !hasText;

              return (
                <div
                  key={message.id}
                  className="flex gap-2.5 motion-safe:animate-in motion-safe:fade-in duration-200"
                >
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900">
                    <Bot className="size-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {toolParts.length > 0 && (
                      <ToolCallCard
                        parts={toolParts}
                        t={t as (key: string) => string}
                      />
                    )}
                    {textParts.map((part, i) => (
                      <div key={i} className={PROSE_CLASSES}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    ))}
                    {showThinking && <ThinkingDots />}
                  </div>
                </div>
              );
            })}

            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2.5">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900">
                    <Bot className="size-3 text-muted-foreground" />
                  </div>
                  <ThinkingDots />
                </div>
              )}
          </div>
        )}
      </div>
      <div className="shrink-0 px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-3"
        >
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setInput("");
              inputRef.current?.focus();
            }}
            disabled={messages.length === 0}
            title={t("chat.newChatTitle")}
            className="flex size-7 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50 hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <SquarePen className="size-3.5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.inputPlaceholder")}
            className="flex-1 border-b border-neutral-700 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-foreground/30 transition-colors duration-150"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex size-7 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50 hover:text-foreground disabled:opacity-30 cursor-pointer"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
