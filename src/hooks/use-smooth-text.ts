import { useEffect, useRef, useState } from "react";
import {
  alignToCharBoundary,
  REVEAL_LAG_MS,
  revealableLength,
  stepVisibleLength,
} from "@/lib/smooth-reveal";

interface SmoothText {
  /** いま画面に出す文字列(受け取った本文の先頭部分)。 */
  text: string;
  /** まだ出し切っていない、または受信中か。`false` になったら全文を出している。 */
  revealing: boolean;
}

/**
 * ストリーミングの本文を、少し遅らせて、少しずつ出す。
 * - 届いてから `REVEAL_LAG_MS` 置くので、タグなどが崩れた状態で見えにくい。書きかけのタグは閉じるまで出さない。
 * - 受信が終わったら、残りを少し速く出し切る。
 * - 最初から `streaming` でなかった本文(保存済みの会話)は、すぐ全文を出す。
 */
export function useSmoothText(text: string, streaming: boolean): SmoothText {
  const [visible, setVisible] = useState(streaming ? 0 : text.length);

  const textRef = useRef(text);
  const streamingRef = useRef(streaming);
  const visibleRef = useRef(visible);
  // 届いた時刻と、そのときの長さ。`REVEAL_LAG_MS` 以上前のものまでを出してよい
  const arrivals = useRef<{ at: number; length: number }[]>([]);
  const agedLength = useRef(0);

  // 受信した本文の増減を記録する(描画のたびではなく、本文が変わったときだけ)
  useEffect(() => {
    textRef.current = text;
    streamingRef.current = streaming;
    if (text.length < visibleRef.current) {
      // 本文が短くなった(作り直し)ときは、出しすぎた分を戻す
      visibleRef.current = text.length;
      setVisible(text.length);
    }
    if (text.length < agedLength.current) {
      agedLength.current = text.length;
      arrivals.current = [];
    }
    const last = arrivals.current.at(-1)?.length ?? agedLength.current;
    if (text.length > last) {
      arrivals.current.push({ at: performance.now(), length: text.length });
    }
  }, [text, streaming]);

  const active = streaming || visible < text.length;
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const tick = () => {
      const full = textRef.current;
      const finishing = !streamingRef.current;
      let target: number;
      if (finishing) {
        target = full.length;
      } else {
        const threshold = performance.now() - REVEAL_LAG_MS;
        while (arrivals.current[0] && arrivals.current[0].at <= threshold) {
          agedLength.current = arrivals.current.shift()?.length ?? 0;
        }
        target = revealableLength(full, agedLength.current);
      }
      const current = visibleRef.current;
      if (current < target) {
        const next = alignToCharBoundary(
          full,
          Math.min(stepVisibleLength(current, target, finishing), target),
        );
        // 境界をそろえた結果が目標を超えるのは、目標が全文より手前のときだけ(次の文字は届いている)
        const length = Math.min(next, full.length);
        visibleRef.current = length;
        setVisible(length);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const shown = Math.min(visible, text.length);
  return { text: text.slice(0, shown), revealing: active };
}
