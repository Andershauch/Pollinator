"use client";

import ReactWordCloud from "react-d3-cloud";
import { useMemo } from "react";

type WordEntry = { word: string; count: number };
type CloudWord = { text: string; value: number };

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

export default function WordCloudCanvas({
  words,
  width,
  height,
}: {
  words: WordEntry[];
  width: number;
  height: number;
}) {
  const maxCount = Math.max(1, ...words.map((w) => w.count));
  const data: CloudWord[] = words.map(({ word, count }) => ({ text: word, value: count }));

  const seed = useMemo(() => {
    const key = words.map((w) => w.word).sort().join(",");
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xfffffff;
    return h;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.map((w) => w.word).sort().join(",")]);

  return (
    <ReactWordCloud
      data={data}
      width={width}
      height={height}
      font="Bahnschrift, Oswald, sans-serif"
      fontWeight="bold"
      fontSize={(w: CloudWord) => {
        const min = 22, max = 112;
        const ratio = Math.sqrt(w.value) / Math.sqrt(maxCount);
        return Math.round(min + ratio * (max - min));
      }}
      rotate={0}
      padding={10}
      spiral="archimedean"
      random={makeRandom(seed)}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fill={(w: any) => cloudColor(w.text ?? "")}
    />
  );
}
