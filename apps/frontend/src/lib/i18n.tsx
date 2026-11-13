"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Lang = "ko" | "en";

const messages: Record<Lang, Record<string, string>> = {
  ko: {
    dashboard: "대시보드",
    feed: "피드",
    tasks: "작업",
    calendar: "캘린더",
    gantt: "간트",
    knowledge: "지식 베이스",
    team: "팀",
    settings: "설정",
    search: "검색",
    newTask: "새 작업",
    online: "온라인",
  },
  en: {
    dashboard: "Dashboard",
    feed: "Feed",
    tasks: "Tasks",
    calendar: "Calendar",
    gantt: "Gantt",
    knowledge: "Knowledge Base",
    team: "Team",
    settings: "Settings",
    search: "Search",
    newTask: "New Task",
    online: "Online",
  },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "ko",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ko");
  useEffect(() => {
    const saved = localStorage.getItem("flowhub_lang") as Lang | null;
    if (saved === "ko" || saved === "en") setLangState(saved);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("flowhub_lang", l);
    document.documentElement.lang = l;
  };
  const t = (key: string) => messages[lang][key] || key;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
