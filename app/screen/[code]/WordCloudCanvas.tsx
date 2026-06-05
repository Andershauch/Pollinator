"use client";

import { useEffect, useRef } from "react";
import cloud from "d3-cloud";

type WordEntry = { word: string; count: number };

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

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || words.length === 0) return;

    const maxCount = Math.max(1, ...words.map((w) => w.count));
    const seed = getSeed(words);

    type LayoutWord = cloud.Word & { count: number; size: number };

    cloud<LayoutWord>()
      .size([width, height])
      .words(
        words.map(({ word, count }) => {
          const min = 22, max = 112;
          const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
          return { text: word, count, size: Math.round(min + ratio * (max - min)) };
        })
      )
      .padding(10)
      .rotate(0)
      .font("Bahnschrift, Oswald, sans-serif")
      .fontSize((d) => d.size)
      .random(makeRandom(seed))
      .on("end", (placed) => {
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("transform", `translate(${width / 2},${height / 2})`);

        placed.forEach((w) => {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("font-size", `${w.size}px`);
          text.setAttribute("font-family", "Bahnschrift, Oswald, sans-serif");
          text.setAttribute("font-weight", "bold");
          text.setAttribute("fill", cloudColor(w.text ?? ""));
          text.setAttribute(
            "transform",
            `translate(${w.x ?? 0},${w.y ?? 0})rotate(${w.rotate ?? 0})`
          );
          text.textContent = w.text ?? "";
          g.appendChild(text);
        });

        svg.appendChild(g);
      })
      .start();
  }, [words, width, height]);

  return <svg ref={svgRef} width={width} height={height} style={{ overflow: "visible" }} />;
}
