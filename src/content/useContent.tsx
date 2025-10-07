import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { client } from "../contentful";

export type BlockData = {
  section: string;
  text: string;
  url?: string;
  bgColor: string;
  expandedText?: string;
  expandedImage?: string;
  imageUrl?: string;
  imageAlt?: string;
  classes?: string[];
  order?: number;
};

type NameEntry = { title: string };

type ContentCtx = {
  loading: boolean;
  title: string;
  blocks: BlockData[];
  error?: string;
};

const Ctx = createContext<ContentCtx | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContentCtx>({ loading: true, title: "", blocks: [] });

  useEffect(() => {
    (async () => {
      try {
        const [nameRes, blockRes] = await Promise.all([
          client.getEntries<NameEntry>({ content_type: "name", limit: 1 }),
          client.getEntries({ content_type: "block", limit: 100 }),
        ]);

        const title = nameRes.items[0]?.fields.title ?? "—";
        const blocks: BlockData[] = blockRes.items.map((item: any) => {
          const f = item.fields as any;

          const iconRaw: string | undefined = f.image?.fields?.file?.url;
          const imageUrl = iconRaw?.startsWith("//") ? `https:${iconRaw}` : iconRaw;

          const expandedRaw: string | undefined = f.expandedImage?.fields?.file?.url;
          const expandedImage = expandedRaw?.startsWith("//") ? `https:${expandedRaw}` : expandedRaw;

          let classes: string[] = [];
          if (Array.isArray(f.classes)) classes = f.classes;
          else if (typeof f.classes === "string")
            classes = f.classes.split(/[,\s]+/).map((s: string) => s.trim()).filter(Boolean);
          else if (Array.isArray(f.classTokens)) classes = f.classTokens;

          return {
            section: f.section,
            text: f.text,
            url: f.url,
            bgColor: (f.color || "#eee").trim(),
            expandedText: f.expandedText || f.description,
            expandedImage,
            imageUrl,
            imageAlt: f.image?.fields?.title || f.text,
            classes,
            order: typeof f.order === "number" ? f.order : 9999,
          };
        });

        setState({ loading: false, title, blocks });
      } catch (e: any) {
        setState({ loading: false, title: "Error", blocks: [], error: e?.message || "Load failed" });
      }
    })();
  }, []);

  const value = useMemo(() => state, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContent() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useContent must be used inside <ContentProvider />");
  return v;
}
