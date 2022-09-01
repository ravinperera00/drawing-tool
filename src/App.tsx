import React, {
  MouseEvent,
  MouseEventHandler,
  useLayoutEffect,
  useState,
} from "react";
import { TopBar } from "./components";
import rough from "roughjs/bundled/rough.esm";
import { Drawable } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import { Point } from "roughjs/bin/geometry";

type TAction = "drawing" | "moving" | "none" | "resizing";

interface IElement {
  id: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  roughElement: Drawable;
  path: Array<Point>;
  type: string;
}

interface IDistanceArg {
  x: number;
  y: number;
}

interface ISelectedElement {
  position: string | null;
  offsetX: number;
  offsetY: number;
  pathOffset: Array<Array<number>>;
}

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
  let roughElement;
  switch (type) {
    case "Line":
      roughElement = generator.line(x1, y1, x2, y2);
      break;
    case "Box":
      roughElement = generator.rectangle(x1, y1, x2 - x1, y2 - y1);
      break;
    case "Pen":
      roughElement = generator.linearPath(path, { strokeWidth: 2 });
      break;
    default:
      roughElement = generator.line(x1, y1, x2, y2);
  }

  return { id, x1, y1, x2, y2, roughElement, path, type };
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
  } else if (element.type === "Pen") {
    const { x1, x2, y1, y2 } = element;
    let inside = null;
    for (let i = 0; i < element.path.length - 1; i++) {
      const point1 = element.path[i];
      const point2 = element.path[i + 1];
      const a = { x: point1[0], y: point1[1] };
      const b = { x: point2[0], y: point2[1] };
      const c = { x, y };
      const offset = distance(a, b) - (distance(a, c) + distance(b, c));
      if (Math.abs(offset) < 2) {
        inside = "found";
      }
    }

    const start = nearPoint(x, y, x1, y1, "start");
    const end = nearPoint(x, y, x2, y2, "end");
    return inside || start || end;
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

const App = () => {
  const [elements, setElements] = useState<IElement[]>([]);
  const [action, setAction] = useState<TAction>("none");
  const [selectedTool, setSelectedTool] = useState<string>("Line");
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
    copyElements[id] = updatedElement;
    setElements(copyElements);
  };

  const adjustElementCoordinates = (element: IElement) => {
    const { x1, x2, y1, y2 } = element;
    if (element.type === "Box") {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return { x1: minX, y1: minY, x2: maxX, y2: maxY };
    } else if (element.type === "Line") {
      if (x1 < x2 || (x1 === x2 && y2 <= y1)) return { x1, x2, y1, y2 };
      else {
        return { x1: x2, x2: x1, y1: y2, y2: y1 };
      }
    }
    return { x1, x2, y1, y2 };
  };

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context?.clearRect(0, 0, canvas.width, canvas.height);
    const roughCanvas = rough.canvas(canvas);
    elements.forEach(({ roughElement }) => {
      roughCanvas.draw(roughElement);
    });
  }, [elements]);

  const handleMouseDown: MouseEventHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event;
    if (selectedTool === "Selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element) {
        let pathOffset = [];
        if (element.type === "Pen") {
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
      if (type === "Pen") {
        for (let i = 0; i < path.length; i++) {
          path[i][0] = clientX - pathOffset[i][0];
          path[i][1] = clientY - pathOffset[i][1];
        }
      }

      updateElement(id, newX, newY, newX + width, newY + height, type, path);
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
      const { id, type, path } = elements[selectedElement.id];
      const { x1, y1, x2, y2 } = adjustElementCoordinates(
        elements[selectedElement.id]
      );
      updateElement(id, x1, y1, x2, y2, type, path);
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
          clearHandler={() => setElements([])}
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
