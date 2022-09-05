import { useState } from "react";
import { IElement } from "../interfaces";
export const useHistory = (initialState: Array<IElement>) => {
  const [index, setIndex] = useState<number>(0);
  const [history, setHistory] = useState<Array<Array<IElement>>>([
    initialState,
  ] as Array<Array<IElement>>);

  const setState = (
    action: Array<IElement> | ((prev: Array<IElement>) => Array<IElement>),
    overwrite: boolean = false
  ) => {
    const newState =
      typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updateState = [...history].slice(0, index + 1);
      setHistory([...updateState, newState]);
      setIndex((prev) => prev + 1);
    }
  };

  const undo = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const redo = () => {
    setIndex((prev) => (prev < history.length - 1 ? prev + 1 : prev));
  };

  const clearHistory = () => {
    setIndex(0);
    setHistory([initialState]);
  };

  return [history[index], setState, undo, redo, clearHistory] as const;
};
