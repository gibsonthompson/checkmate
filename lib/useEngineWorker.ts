"use client";

import { useEffect, useRef, useCallback } from "react";
import { Difficulty, GameState, Move } from "@/lib/types";
import type { MoveReport, Hint } from "@/lib/analysis";

// Lazy main-thread fallbacks (only loaded/used if the Worker can't start).
import { chooseMove as chooseMoveMain } from "@/lib/ai";
import {
  gradeMove as gradeMoveMain,
  getHint as getHintMain,
  describeMove as describeMoveMain,
} from "@/lib/analysis";

interface Pending {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export function useEngineWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef<Map<number, Pending>>(new Map());
  const counter = useRef(0);
  const usable = useRef(false);

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("../lib/engine.worker.ts", import.meta.url)
      );
      worker.onmessage = (e: MessageEvent) => {
        const { id, type, error, ...rest } = e.data;
        const p = pending.current.get(id);
        if (!p) return;
        pending.current.delete(id);
        if (type === "error") p.reject(new Error(error));
        else p.resolve(rest);
      };
      worker.onerror = () => {
        usable.current = false;
      };
      workerRef.current = worker;
      usable.current = true;
    } catch {
      usable.current = false;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const call = useCallback(<T,>(payload: any): Promise<T> => {
    const id = ++counter.current;
    if (workerRef.current && usable.current) {
      return new Promise<T>((resolve, reject) => {
        pending.current.set(id, { resolve, reject });
        workerRef.current!.postMessage({ id, ...payload });
      });
    }
    // Fallback: run on the main thread (yielding once so the UI can paint).
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        if (payload.type === "ai-move") {
          const move = chooseMoveMain(payload.state, payload.difficulty);
          const narration = move ? describeMoveMain(payload.state, move) : "";
          resolve({ move, narration } as T);
        } else if (payload.type === "grade") {
          resolve({ report: gradeMoveMain(payload.state, payload.move) } as T);
        } else if (payload.type === "hint") {
          resolve({ hint: getHintMain(payload.state) } as T);
        } else if (payload.type === "describe") {
          resolve({ narration: describeMoveMain(payload.state, payload.move) } as T);
        }
      }, 10);
    });
  }, []);

  const aiMove = useCallback(
    (state: GameState, difficulty: Difficulty) =>
      call<{ move: Move | null; narration: string }>({
        type: "ai-move",
        state,
        difficulty,
      }),
    [call]
  );
  const gradePlayerMove = useCallback(
    (state: GameState, move: Move) =>
      call<{ report: MoveReport }>({ type: "grade", state, move }),
    [call]
  );
  const requestHint = useCallback(
    (state: GameState) => call<{ hint: Hint }>({ type: "hint", state }),
    [call]
  );

  return { aiMove, gradePlayerMove, requestHint };
}
