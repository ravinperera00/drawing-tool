import {
  MouseEvent,
  MouseEventHandler,
  useEffect,
  useLayoutEffect,
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

const generator: RoughGenerator = rough.generator();

const createElement = (
  id: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: string,
  path: Array<Point>
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
    default:
      throw new Error(`Type not recognized: ${type}`);
  }

  return { id, x1, y1, x2, y2, elementComponent, path, type };
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
  if (element.type === "Box") {
    const { x1, x2, y1, y2 } = element;
    const tl = nearPoint(x, y, x1, y1, "tl");
    const bl = nearPoint(x, y, x1, y2, "bl");
    const tr = nearPoint(x, y, x2, y1, "tr");
    const br = nearPoint(x, y, x2, y2, "br");
    const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
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
    path: Array<Point>
  ) => {
    const updatedElement = createElement(
      id,
      x1,
      y1,
      clientX,
      clientY,
      type,
      path
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
    context?.clearRect(0, 0, canvas.width, canvas.height);
    const roughCanvas = rough.canvas(canvas);
    elements.forEach((element) => {
      drawElement(element, roughCanvas, context!);
    });
  }, [elements]);

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

  const handleMouseDown: MouseEventHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event;
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
        path
      );
      setElements((prev: Array<IElement>) => [...prev, element]);
      setSelectedElement({
        ...element,
        offsetX: -1,
        offsetY: -1,
        pathOffset: [[-1, -1]],
        position: null,
      });
      setAction("drawing");
    }
  };

  const handleMouseMove: MouseEventHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event;
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
      const { id, x1, x2, y1, y2, type, path, offsetX, offsetY, pathOffset } =
        selectedElement;

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
        newPoints
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
    if (action === "drawing" || action === "resizing") {
      if (!selectedElement) return;
      if (selectedElement.type !== "Pen" && selectedElement.type !== "Pencil") {
        const { id, type } = elements[selectedElement.id];
        const { x1, y1, x2, y2, path } = adjustElementCoordinates(
          elements[selectedElement.id]
        );
        updateElement(id, x1, y1, x2, y2, type, path);
      }
    }
    setAction("none");
    setSelectedElement(null);
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
