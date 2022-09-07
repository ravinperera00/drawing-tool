import {
  FocusEventHandler,
  MouseEvent,
  MouseEventHandler,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import getStroke from "perfect-freehand";
import { TopBar } from "./components";
import rough from "roughjs/bundled/rough.esm";
import { RoughGenerator } from "roughjs/bin/generator";
import { Point } from "roughjs/bin/geometry";
import {
  ISelectedElement,
  IDistanceArg,
  IElement,
  TAction,
} from "./interfaces";
import { useHistory } from "./hooks/useHistory";
import { Drawable } from "roughjs/bin/core";

const generator: RoughGenerator = rough.generator();

const createElement = (
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: string,
  path: Array<Point>,
  text: string
) => {
  let elementComponent;
  switch (type) {
    case "Line":
      elementComponent = generator.line(x1, y1, x2, y2);
      break;
    case "Box":
      elementComponent = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
      break;
    case "Pencil":
      elementComponent = generator.linearPath(path, { strokeWidth: 2 });
      break;
    case "Pen":
      const stroke = getStroke(path);
      const pathData = getSvgPathFromStroke(stroke);
      elementComponent = new Path2D(pathData);
      break;
    case "Text":
      const canvas = document.getElementById("canvas") as HTMLCanvasElement;

      x2 = (canvas.getContext("2d")?.measureText(text).width as number) + x1;
      y2 = y1 + 24;
      elementComponent = {} as Drawable;
      break;
    default:
      throw new Error(`Type not recognized: ${type}`);
  }

  return { id, x1, y1, x2, y2, elementComponent, path, type, text };
};

const distance = (a: IDistanceArg, b: IDistanceArg) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const nearPoint = (
  x: number,
  y: number,
  x1: number,
  y1: number,
  name: string
) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

const positionWithinElement = (x: number, y: number, element: IElement) => {
  if (element.type === "Box" || element.type === "Text") {
    const { x1, x2, y1, y2 } = element;
    const tl = nearPoint(x, y, x1, y1, "tl");
    const bl = nearPoint(x, y, x1, y2, "bl");
    const tr = nearPoint(x, y, x2, y1, "tr");
    const br = nearPoint(x, y, x2, y2, "br");
    let inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    if (element.type === "Text") {
      const tlPos = { x: x1, y: y1 };
      const blPos = { x: x1, y: y2 };
      const trPos = { x: x2, y: y1 };
      const brPos = { x: x2, y: y2 };
      const cPos = { x, y };
      const offset1 =
        distance(tlPos, trPos) -
        (distance(tlPos, cPos) + distance(trPos, cPos));
      const offset2 =
        distance(tlPos, blPos) -
        (distance(tlPos, cPos) + distance(blPos, cPos));
      const offset3 =
        distance(brPos, trPos) -
        (distance(brPos, cPos) + distance(trPos, cPos));
      const offset4 =
        distance(blPos, brPos) -
        (distance(blPos, cPos) + distance(brPos, cPos));
      const outline =
        Math.abs(offset1) < 1 ||
        Math.abs(offset2) < 1 ||
        Math.abs(offset3) < 1 ||
        Math.abs(offset4) < 1
          ? "inside"
          : null;
      inside = inside ? "edit" : null;
      return outline || inside;
    }
    return tl || bl || tr || br || inside;
  } else if (element.type === "Pencil" || element.type === "Pen") {
    let inside = null;
    for (let i = 0; i < element.path.length - 1; i++) {
      const point1 = element.path[i];
      const point2 = element.path[i + 1];
      const a = { x: point1[0], y: point1[1] };
      const b = { x: point2[0], y: point2[1] };
      const c = { x, y };
      const offset = distance(a, b) - (distance(a, c) + distance(b, c));
      if (Math.abs(offset) < 2) {
        inside = "inside";
      }
    }
    return inside;
  } else if (element.type === "Line") {
    const { x1, x2, y1, y2 } = element;
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    const start = nearPoint(x, y, x1, y1, "start");
    const end = nearPoint(x, y, x2, y2, "end");
    const inside = Math.abs(offset) < 2 ? "inside" : null;
    return inside || start || end;
  } else return null;
};

const cursorAtPosition = (position: string) => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";

    case "tr":
    case "bl":
      return "nesw-resize";
    case "edit":
      return "text";
    default:
      return "move";
  }
};

const getSvgPathFromStroke = (stroke: any) => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc: any, [x0, y0]: any, i: any, arr: any) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};

const resizedCoordinates = (
  clientX: number,
  clientY: number,
  position: string,
  path: Array<Array<number>>,
  coordinates: { x1: number; y1: number; x2: number; y2: number }
) => {
  const { x1, x2, y1, y2 } = coordinates;
  switch (position) {
    case "tl":
    case "start":
      return { x1: clientX, y1: clientY, x2, y2 };
    case "tr":
      return { x1, x2: clientX, y1: clientY, y2 };
    case "bl":
      return { x1: clientX, y1, x2, y2: clientY };
    case "br":
    case "end":
      return { x1, y1, x2: clientX, y2: clientY };
    default:
      return { x1, x2, y1, y2 };
  }
};

const getElementAtPosition = (
  x: number,
  y: number,
  elements: Array<IElement>
) => {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null);
};

const drawElement = (
  element: IElement,
  roughCanvas: any,
  context: CanvasRenderingContext2D
) => {
  switch (element.type) {
    case "Pen":
      const stroke = getStroke(element.path);
      const pathData = getSvgPathFromStroke(stroke);
      const myPath = new Path2D(pathData);
      context.fill(myPath);
      break;
    case "Text":
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      roughCanvas.draw(element.elementComponent);
  }
};

const App = () => {
  const [elements, setElements, undo, redo, clearHistory] = useHistory(
    [] as Array<IElement>
  );
  const [action, setAction] = useState<TAction>("none");
  const [selectedTool, setSelectedTool] = useState<string>("Pen");
  const [selectedElement, setSelectedElement] = useState<
    (IElement & ISelectedElement) | null
  >();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const topBarClickHandler = (type: string) => {
    setSelectedTool(type);
  };

  const updateElement = (
    id: number,
    x1: number,
    y1: number,
    clientX: number,
    clientY: number,
    type: string,
    path: Array<Point>,
    options: { text: string } | null = null
  ) => {
    const updatedElement = createElement(
      id,
      x1,
      y1,
      clientX,
      clientY,
      type,
      path,
      options ? options.text : ""
    );
    const copyElements = [...elements];
    copyElements[id] = { ...updatedElement, path };
    setElements(copyElements, true);
  };

  const adjustElementCoordinates = (element: IElement) => {
    const { x1, x2, y1, y2 } = element;
    if (element.type === "Box") {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return { x1: minX, y1: minY, x2: maxX, y2: maxY, path: element.path };
    } else if (element.type === "Line") {
      if (x1 < x2 || (x1 === x2 && y2 <= y1))
        return { x1, x2, y1, y2, path: element.path };
      else {
        return { x1: x2, x2: x1, y1: y2, y2: y1, path: element.path };
      }
    } else if (element.type === "Pencil" || element.type === "Pen") {
      if (x1 < x2 || (x1 === x2 && y2 <= y1))
        return { x1, x2, y1, y2, path: element.path };
      else {
        const temp = [...element.path];
        return { x1: x2, x2: x1, y1: y2, y2: y1, path: temp.reverse() };
      }
    }
    return { x1, x2, y1, y2, path: element.path };
  };

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.textBaseline = "top";
    context.font = "24px sans-serif";
    context?.clearRect(0, 0, canvas.width, canvas.height);
    const roughCanvas = rough.canvas(canvas);
    elements.forEach((element) => {
      if (action === "writing" && selectedElement?.id === element.id) return;
      drawElement(element, roughCanvas, context!);
    });
  }, [elements, action, selectedElement]);

  useEffect(() => {
    const undoRedoFuncton = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener("keydown", undoRedoFuncton);
    return () => {
      document.removeEventListener("keydown", undoRedoFuncton);
    };
  }, [redo, undo]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (action === "writing") {
      setTimeout(() => {
        if (textArea) {
          textArea?.focus();
          textArea.value = selectedElement?.text || "";
        }
      }, 50);
    }
  }, [selectedElement, action]);

  const eraseItemOnCursor = (clientX: number, clientY: number) => {
    const element = getElementAtPosition(clientX, clientY, elements);
    if (element)
      setElements((prev) => prev.filter((item) => element?.id !== item.id));
    return;
  };

  const handleMouseDown: MouseEventHandler = (event: MouseEvent) => {
    if (action === "writing") return;
    const { clientX, clientY } = event;
    if (selectedTool === "Eraser") {
      eraseItemOnCursor(clientX, clientY);
      setAction("erasing");
    }
    if (selectedTool === "Selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        let pathOffset = [];
        if (element.type === "Pencil" || element.type === "Pen") {
          const path = element.path;
          for (let i = 0; i < element.path.length; i++) {
            pathOffset.push([clientX - path[i][0], clientY - path[i][1]]);
          }
        }
        setSelectedElement({
          ...element,
          offsetX: clientX - element.x1,
          offsetY: clientY - element.y1,
          pathOffset,
        });
        setElements((prev) => prev);

        if (element.position === "inside") setAction("moving");
        else setAction("resizing");
      }
    } else {
      const path: Point[] = [[clientX, clientY]];
      const id = elements.length;
      const element = createElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        selectedTool,
        path,
        ""
      );
      setElements((prev: Array<IElement>) => [...prev, element]);

      setSelectedElement({
        ...element,
        offsetX: -1,
        offsetY: -1,
        pathOffset: [[-1, -1]],
        position: null,
      });

      if (selectedTool === "Text") {
        setAction("writing");
      } else {
        setAction("drawing");
      }
    }
  };

  const handleMouseMove: MouseEventHandler = (event: MouseEvent) => {
    if (action === "writing") return;
    const { clientX, clientY } = event;

    if (selectedTool === "Eraser" && action === "erasing") {
      eraseItemOnCursor(clientX, clientY);
    }

    if (selectedTool === "Selection") {
      const eventElement = event.target as HTMLCanvasElement;

      const element = getElementAtPosition(clientX, clientY, elements);
      eventElement.style.cursor =
        element && element.position
          ? cursorAtPosition(element.position)
          : "default";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1, path, id, type } = elements[index];
      path.push([clientX, clientY]);
      updateElement(id, x1, y1, clientX, clientY, type, path);
    } else if (action === "moving") {
      if (!selectedElement) return;
      const {
        id,
        x1,
        x2,
        y1,
        y2,
        type,
        path,
        offsetX,
        offsetY,
        pathOffset,
        text,
      } = selectedElement;

      const newX = clientX - offsetX;
      const newY = clientY - offsetY;
      const width = x2 - x1;
      const height = y2 - y1;
      let newPoints: Point[] = [];
      if (type === "Pencil" || type === "Pen") {
        newPoints = path.map((point, i) => {
          return [
            clientX - pathOffset[i][0],
            clientY - pathOffset[i][1],
          ] as Point;
        });
      }
      updateElement(
        id,
        newX,
        newY,
        newX + width,
        newY + height,
        type,
        newPoints,
        { text }
      );
    } else if (action === "resizing") {
      if (!selectedElement) return;
      const { id, position, type, path, ...coordinates } = selectedElement;
      if (!position) return;
      const { x1, x2, y1, y2 } = resizedCoordinates(
        clientX,
        clientY,
        position,
        path,
        coordinates
      );

      updateElement(id, x1, y1, x2, y2, type, path);
    }
  };

  const handleMouseUp: MouseEventHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event;
    if (!selectedElement) return;
    if (
      selectedElement.type === "Text" &&
      clientX - selectedElement.offsetX === selectedElement.x1 &&
      clientY - selectedElement.offsetY === selectedElement.y1
    ) {
      setAction("writing");
      return;
    }
    if (action === "drawing" || action === "resizing") {
      if (selectedElement.type !== "Pen" && selectedElement.type !== "Pencil") {
        const { id, type } = elements[selectedElement.id];
        const { x1, y1, x2, y2, path } = adjustElementCoordinates(
          elements[selectedElement.id]
        );
        updateElement(id, x1, y1, x2, y2, type, path);
      }
    }
    if (action === "writing") return;
    setAction("none");
    setSelectedElement(null);
  };

  const handleBlur: FocusEventHandler = (
    event: React.FocusEvent<HTMLInputElement, Element>
  ) => {
    const { x1, y1, type, id, x2, y2, path } = selectedElement!;
    setAction("none");
    setSelectedElement(null);
    updateElement(id, x1, y1, x2, y2, type, path, { text: event.target.value });
  };

  return (
    <>
      <div className=" w-screen h-screen">
        <TopBar
          selected={selectedTool}
          btnHandler={topBarClickHandler}
          clearHandler={clearHistory}
          undoHandler={undo}
          redoHandler={redo}
        />

        {action === "writing" && (
          <>
            <textarea
              ref={textAreaRef}
              onBlur={handleBlur}
              style={{
                position: "fixed",
                left: `${selectedElement?.x1}px`,
                top: `${selectedElement?.y1! - 3}px`,
                font: "24px sans-serif",
                margin: "0",
                padding: "0",
                border: "0",
                outline: "0",
                overflow: "hidden",
                resize: "horizontal",
                whiteSpace: "pre",
                background: "transparent",
              }}
              className="active:border-gray-400 focus:border-1 focus:border-solid border-1"
            ></textarea>
          </>
        )}

        <canvas
          id="canvas"
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        ></canvas>
      </div>
    </>
  );
};

export default App;
