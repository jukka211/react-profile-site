// src/content/useContent.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { client } from "../contentful";

export type BlockData = {
  section: string;
  text: string;
  url?: string;

  // PDF asset from Contentful (field: pdfDokument)
  pdfUrl?: string;
  pdfFileName?: string;

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

// ✅ Event-Posting model (5 optional custom text fields -> mapped into customFields[])
export type EventPosting = {
  id: string;
  order?: number;
  url?: string;

  imageUrl?: string;
  imageAlt?: string;

  title?: string;

  // ✅ NEW
  description?: string;

  customFields: string[];
};

type NameEntry = { title: string };

type ContentCtx = {
  loading: boolean;
  title: string;
  blocks: BlockData[];
  infoCards: InfoCard[];
  eventPostings: EventPosting[];
  error?: string;
};

const Ctx = createContext<ContentCtx | null>(null);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContentCtx>({
    loading: true,
    title: "",
    blocks: [],
    infoCards: [],
    eventPostings: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [nameRes, blockRes, infoRes, eventRes] = await Promise.all([
          client.getEntries<NameEntry>({
            content_type: "name",
            limit: 1,
            select: ["fields.title"],
          }),
          client.getEntries({
            content_type: "block",
            limit: 100,
            include: 2, // resolve linked assets (image, expandedImage, pdfDokument)
          }),
          client.getEntries({
            content_type: "infoCard",
            limit: 3,
            order: "fields.order",
            select: ["fields.title", "fields.body", "fields.order"],
          }),
          // ✅ Event-Postings (ensure API ID is exactly "eventPosting")
          client.getEntries({
            content_type: "eventPosting",
            limit: 200,
            include: 2, // resolve image asset
          }),
        ]);

        const title = nameRes.items[0]?.fields.title ?? "—";

        const blocks: BlockData[] = blockRes.items.map((item: any) => {
          const f = item.fields as any;

          const iconRaw: string | undefined = f.image?.fields?.file?.url;
          const imageUrl = iconRaw?.startsWith("//") ? `https:${iconRaw}` : iconRaw;

          const expandedRaw: string | undefined = f.expandedImage?.fields?.file?.url;
          const expandedImage = expandedRaw?.startsWith("//")
            ? `https:${expandedRaw}`
            : expandedRaw;

          const pdfRaw: string | undefined = f.pdfDokument?.fields?.file?.url;
          const pdfUrl = pdfRaw ? (pdfRaw.startsWith("//") ? `https:${pdfRaw}` : pdfRaw) : undefined;
          const pdfFileName: string | undefined = f.pdfDokument?.fields?.file?.fileName;

          let classes: string[] = [];
          if (Array.isArray(f.classes)) classes = f.classes;
          else if (typeof f.classes === "string")
            classes = f.classes
              .split(/[,\s]+/)
              .map((s: string) => s.trim())
              .filter(Boolean);
          else if (Array.isArray(f.classTokens)) classes = f.classTokens;

          return {
            section: f.section,
            text: f.text,
            url: f.url,

            pdfUrl,
            pdfFileName,

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

        const eventPostings: EventPosting[] = (eventRes.items || [])
          .map((it: any) => {
            const f = it.fields as any;

            const imgRaw: string | undefined = f.image?.fields?.file?.url;
            const imageUrl = imgRaw ? (imgRaw.startsWith("//") ? `https:${imgRaw}` : imgRaw) : undefined;

            const imageAlt: string | undefined =
              f.imageAlt || f.image?.fields?.title || f.title || "Event image";

            // ✅ 5 custom text fields (empties removed automatically)
            const customFields: string[] = [f.field1, f.field2, f.field3, f.field4, f.field5]
              .filter((x: any) => typeof x === "string" && x.trim().length > 0)
              .map((x: string) => x.trim())
              .slice(0, 5);

              return {
                id: it.sys.id as string,
                order: typeof f.order === "number" ? f.order : 9999,
                url: f.url as string | undefined,
                imageUrl,
                imageAlt,
                title: typeof f.title === "string" ? f.title : undefined,
              
                // ✅ NEW
                description: typeof f.description === "string" ? f.description : undefined,
              
                customFields,
              };
          })
          .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

        setState({ loading: false, title, blocks, infoCards, eventPostings });
      } catch (e: any) {
        setState({
          loading: false,
          title: "Error",
          blocks: [],
          infoCards: [],
          eventPostings: [],
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
