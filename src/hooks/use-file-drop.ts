import { useCallback, useRef, useState } from "react";

/** ドラッグ中のものにファイルが含まれているか。 */
function hasFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

/**
 * 要素へのファイルのドロップ。ドラッグ中かどうか(`dragging`)と、要素に付けるイベントを返す。
 * 子要素を出入りするたびに `dragenter` / `dragleave` が来るので、深さを数えて判定する。
 * `disabled` の間は、ドロップを受けない。
 */
export function useFileDrop(
  onFiles: (files: File[]) => void,
  disabled = false,
) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const onDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    [disabled],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled || !hasFiles(event)) return;
      // これを止めないと、ブラウザがファイルを開いてしまう
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback((event: React.DragEvent) => {
    if (!hasFiles(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (disabled) return;
      onFiles(Array.from(event.dataTransfer.files));
    },
    [disabled, onFiles],
  );

  return {
    dragging: dragging && !disabled,
    handlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
