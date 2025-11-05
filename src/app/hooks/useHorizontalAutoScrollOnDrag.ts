import { useEffect } from "react";
import type { RefObject } from "react";
import { useDragLayer } from "react-dnd";

type AutoScrollOptions = {
  edgePx?: number;
  maxSpeedPxPerFrame?: number;
};

// Dragging exercises over the container edges, auto scroll the container to keep the dragging exercise in view
export function useHorizontalAutoScrollOnDrag<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: AutoScrollOptions = {}
) {
  const { edgePx = 40, maxSpeedPxPerFrame = 20 } = options;

  const { isDragging, clientOffset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  useEffect(() => {
    if (!isDragging) return;
    const el = containerRef.current;
    if (!el) return;

    let rafId = 0;

    const step = () => {
      const rect = el.getBoundingClientRect();
      const pointer = clientOffset || { x: rect.left + rect.width / 2, y: 0 };

      const leftEdge = rect.left + edgePx;
      const rightEdge = rect.right - edgePx;

      let dx = 0;
      if (pointer.x < leftEdge) {
        dx = -Math.min(
          maxSpeedPxPerFrame,
          Math.ceil((leftEdge - pointer.x) / 4)
        );
      } else if (pointer.x > rightEdge) {
        dx = Math.min(
          maxSpeedPxPerFrame,
          Math.ceil((pointer.x - rightEdge) / 4)
        );
      }

      if (dx !== 0) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const next = Math.max(0, Math.min(maxScroll, el.scrollLeft + dx));
        el.scrollLeft = next;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, clientOffset, containerRef, edgePx, maxSpeedPxPerFrame]);
}
