"use client";

import { useEffect, useRef } from "react";
import cloud from "d3-cloud";

type WordEntry = { word: string; count: number };
type LayoutWord = cloud.Word & { count: number; size: number };

const COLORS = [
  "oklch(0.82 0.155 78)",
  "oklch(0.79 0.15 158)",
  "oklch(0.73 0.15 248)",
  "oklch(0.72 0.165 330)",
];

function cloudColor(word: string) {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) & 0xfffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

function makeRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function getSeed(words: WordEntry[]) {
  const key = words.map((w) => w.word).sort().join(",");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xfffffff;
  return h;
}

function calcSize(count: number, maxCount: number): number {
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return Math.round(22 + ratio * (112 - 22));
}

const SVG_STYLE = `
  @keyframes wIn {
    from { opacity: 0; transform: scale(0.15); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes wFloat0 { 0%,100% { transform: translateY(0px)  } 50% { transform: translateY(-7px) } }
  @keyframes wFloat1 { 0%,100% { transform: translateY(-3px) } 50% { transform: translateY( 5px) } }
  @keyframes wFloat2 { 0%,100% { transform: translateY(0px)  } 50% { transform: translateY(-9px) } }
  @keyframes wFloat3 { 0%,100% { transform: translateY(-4px) } 50% { transform: translateY( 4px) } }
`;

const FLOAT_DURATIONS = [3.4, 3.9, 4.2, 2.9];

export default function WordCloudCanvas({
  words,
  width,
  height,
}: {
  words: WordEntry[];
  width: number;
  height: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const prevNamesRef = useRef<Set<string>>(new Set());
  const textMapRef = useRef<Map<string, SVGTextElement>>(new Map());
  const prevSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || words.length === 0) return;

    const maxCount = Math.max(1, ...words.map((w) => w.count));
    const currentNames = new Set(words.map((w) => w.word));
    const prevNames = prevNamesRef.current;
    const sameSize = width === prevSizeRef.current.w && height === prevSizeRef.current.h;
    const sameWords =
      sameSize &&
      textMapRef.current.size > 0 &&
      currentNames.size === prevNames.size &&
      words.every((w) => prevNames.has(w.word));

    // Count-only update: update font sizes in-place so float animations keep running
    if (sameWords) {
      words.forEach((w) => {
        const el = textMapRef.current.get(w.word);
        if (el) el.setAttribute("font-size", `${calcSize(w.count, maxCount)}px`);
      });
      return;
    }

    const seed = getSeed(words);
    const isFirstRender = prevNames.size === 0;

    cloud<LayoutWord>()
      .size([width, height])
      .words(
        words.map(({ word, count }) => ({
          text: word,
          count,
          size: calcSize(count, maxCount),
        }))
      )
      .padding(10)
      .rotate(0)
      .font("Bahnschrift, Oswald, sans-serif")
      .fontSize((d) => d.size)
      .random(makeRandom(seed))
      .on("end", (placed) => {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        textMapRef.current.clear();

        const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
        styleEl.textContent = SVG_STYLE;
        svg.appendChild(styleEl);

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${width / 2},${height / 2})`);

        placed.forEach((w, i) => {
          const wordStr = w.text ?? "";
          const isNew = !prevNames.has(wordStr);
          const fi = i % 4;
          const dur = FLOAT_DURATIONS[fi];
          // golden-angle spread so neighbouring words are out of phase
          const floatDelay = ((i * 137) % 3000) / 1000;

          const wg = document.createElementNS("http://www.w3.org/2000/svg", "g");
          wg.setAttribute(
            "transform",
            `translate(${w.x ?? 0},${w.y ?? 0})rotate(${w.rotate ?? 0})`
          );

          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("font-size", `${w.size}px`);
          text.setAttribute("font-family", "Bahnschrift, Oswald, sans-serif");
          text.setAttribute("font-weight", "bold");
          text.setAttribute("fill", cloudColor(wordStr));
          text.style.transformBox = "fill-box";
          text.style.transformOrigin = "center center";

          if (isNew) {
            // Stagger entry on first render; immediate for later additions
            const entryDelay = isFirstRender ? i * 0.06 : 0;
            const floatStart = entryDelay + 0.45 + floatDelay * 0.25;
            text.style.animation =
              `wIn 0.45s ease-out ${entryDelay}s both, ` +
              `wFloat${fi} ${dur}s ease-in-out ${floatStart}s infinite`;
          } else {
            text.style.animation = `wFloat${fi} ${dur}s ease-in-out ${floatDelay}s infinite`;
          }

          text.textContent = wordStr;
          textMapRef.current.set(wordStr, text as SVGTextElement);
          wg.appendChild(text);
          g.appendChild(wg);
        });

        svg.appendChild(g);
        prevNamesRef.current = currentNames;
        prevSizeRef.current = { w: width, h: height };
      })
      .start();
  }, [words, width, height]);

  return (
    <svg ref={svgRef} width={width} height={height} style={{ overflow: "visible" }} />
  );
}
