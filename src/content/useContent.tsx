// src/content/useContent.tsx
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

export type InfoCard = {
  title: string;
  body?: string;
  order?: number;
};

type NameEntry = { title: string };

type ContentCtx = {
  loading: boolean;
  title: string;
  blocks: BlockData[];
  infoCards: InfoCard[];     // 👈 expose new model here
  error?: string;
};

const Ctx = createContext<ContentCtx | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContentCtx>({
    loading: true,
    title: "",
    blocks: [],
    infoCards: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [nameRes, blockRes, infoRes] = await Promise.all([
          client.getEntries<NameEntry>({
            content_type: "name",
            limit: 1,
            select: ["fields.title"],            // minimal payload
          }),
          client.getEntries({
            content_type: "block",
            limit: 100,
          }),
          client.getEntries({
            content_type: "infoCard",            // 👈 your new model
            limit: 3,
            order: "fields.order",               // ascending by order
            select: ["fields.title", "fields.body", "fields.order"],
          }),
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

        const infoCards: InfoCard[] = infoRes.items
          .map((it: any) => ({
            title: it.fields.title as string,
            body: it.fields.body as string | undefined,
            order: typeof it.fields.order === "number" ? it.fields.order : 9999,
          }))
          .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
          .slice(0, 3);

        setState({ loading: false, title, blocks, infoCards });
      } catch (e: any) {
        setState({
          loading: false,
          title: "Error",
          blocks: [],
          infoCards: [],
          error: e?.message || "Load failed",
        });
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
