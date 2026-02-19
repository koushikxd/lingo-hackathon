"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { LANGUAGES } from "@/lib/constants";
import { UI_MESSAGES_EN, type UiMessageKey } from "@/lib/ui-messages";
import {
  formatUiMessage,
  resolveUiMessage,
  type UiMessageVars,
  type UiMessages,
} from "@/lib/ui-i18n";
import { trpc } from "@/utils/trpc";

type UiI18nContextValue = {
  locale: string;
  t: (key: UiMessageKey, vars?: UiMessageVars) => string;
  ready: boolean;
};

const UiI18nContext = createContext<UiI18nContextValue>({
  locale: "en",
  t: (key, vars) => formatUiMessage(UI_MESSAGES_EN[key], vars),
  ready: true,
});

function TranslationIndicator({ locale }: { locale: string }) {
  const [visible, setVisible] = useState(true);
  const label = LANGUAGES.find((l) => l.code === locale)?.label ?? locale;

  useEffect(() => {
    setVisible(true);
  }, [locale]);

  if (!visible) return null;

  return (
    <div className="fixed top-3 right-3 z-9999 flex items-center gap-2 border border-neutral-700 bg-neutral-900/95 px-3 py-1.5 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <Loader2 className="size-3 animate-spin text-primary" />
      <span className="text-[11px] text-muted-foreground">
        Translating to{" "}
        <span className="font-medium text-foreground">{label}</span>…
      </span>
    </div>
  );
}

function TranslationDone({
  locale,
  onDone,
}: {
  locale: string;
  onDone: () => void;
}) {
  const label = LANGUAGES.find((l) => l.code === locale)?.label ?? locale;

  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed top-3 right-3 z-9999 flex items-center gap-2 border border-neutral-700 bg-neutral-900/95 px-3 py-1.5 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <Globe className="size-3 text-primary" />
      <span className="text-[11px] text-muted-foreground">
        Switched to <span className="font-medium text-foreground">{label}</span>
      </span>
    </div>
  );
}

export function UiI18nProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user?.id);

  const { data: prefs } = useQuery({
    ...trpc.user.getPreferences.queryOptions(),
    enabled: isAuthenticated,
  });

  const locale = prefs?.preferredLanguage ?? "en";

  const { data: translatedMessages, isFetching } = useQuery<
    Partial<UiMessages>
  >({
    queryKey: ["ui-messages", locale],
    enabled: isAuthenticated && locale !== "en",
    queryFn: async () => {
      const response = await fetch("/api/ui/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetLocale: locale }),
      });
      const data = (await response.json()) as {
        messages?: Partial<UiMessages>;
      };
      if (!response.ok || !data.messages) {
        throw new Error("Failed to load localized UI messages");
      }
      return data.messages;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isTranslating = locale !== "en" && isFetching;
  const justFinished = locale !== "en" && !isFetching && !!translatedMessages;
  const [showDone, setShowDone] = useState(false);
  const [doneLocale, setDoneLocale] = useState("");

  useEffect(() => {
    if (justFinished && locale !== "en") {
      setShowDone(true);
      setDoneLocale(locale);
    }
  }, [justFinished, locale]);

  const messages =
    locale === "en"
      ? UI_MESSAGES_EN
      : { ...UI_MESSAGES_EN, ...translatedMessages };

  const value = useMemo<UiI18nContextValue>(
    () => ({
      locale,
      ready: locale === "en" || !isFetching,
      t: (key, vars) => {
        const message = resolveUiMessage(messages, key);
        return formatUiMessage(message, vars);
      },
    }),
    [isFetching, locale, messages],
  );

  return (
    <UiI18nContext.Provider value={value}>
      {children}
      {isTranslating && <TranslationIndicator locale={locale} />}
      {!isTranslating && showDone && (
        <TranslationDone
          locale={doneLocale}
          onDone={() => setShowDone(false)}
        />
      )}
    </UiI18nContext.Provider>
  );
}

export function useUiI18n() {
  return useContext(UiI18nContext);
}
