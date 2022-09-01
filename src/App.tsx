import {
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

const isWithinElement = (x: number, y: number, element: IElement) => {
  if (element.type === "Box") {
    const { x1, x2, y1, y2 } = element;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  } else if (element.type === "Pen") {
    let found = false;
    for (let i = 0; i < element.path.length - 1; i++) {
      const point1 = element.path[i];
      const point2 = element.path[i + 1];
      const a = { x: point1[0], y: point1[1] };
      const b = { x: point2[0], y: point2[1] };
      const c = { x, y };
      const offset = distance(a, b) - (distance(a, c) + distance(b, c));
      if (Math.abs(offset) < 1) {
        found = true;
      }
    }
    return found;
  } else if (element.type === "Line") {
    const { x1, x2, y1, y2 } = element;
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < 1;
  }
};

const getElementAtPosition = (
  x: number,
  y: number,
  elements: Array<IElement>
) => {
  return elements.find((element) => isWithinElement(x, y, element));
};

const App = () => {
  const [elements, setElements] = useState<IElement[]>([]);
  const [action, setAction] = useState<"drawing" | "moving" | "none">("none");
  const [selectedTool, setSelectedTool] = useState<string>("Line");
  const [selectedElement, setSelectedElement] = useState<
    IElement & {
      offsetX: number;
      offsetY: number;
      pathOffset: Array<Array<number>>;
    }
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
        setAction("moving");
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
      setAction("drawing");
    }
  };

  const handleMouseMove: MouseEventHandler = (event: MouseEvent) => {
    const { clientX, clientY } = event;
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
    }
  };

  const handleMouseUp: MouseEventHandler = (event: MouseEvent) => {
    setAction("none");
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
