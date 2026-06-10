import { useState, useCallback } from 'react';

export function useHistory(initial = []) {
  const [history, setHistory] = useState([initial]);
  const [index, setIndex] = useState(0);

  const current = history[index];

  const push = useCallback((nextState) => {
    setHistory((h) => [...h.slice(0, index + 1), nextState]);
    setIndex((i) => i + 1);
  }, [index]);

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const reset = useCallback((state = []) => {
    setHistory([state]);
    setIndex(0);
  }, []);

  return {
    shapes: current,
    push,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    reset,
  };
}
