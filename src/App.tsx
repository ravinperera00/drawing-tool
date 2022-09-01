import {
  MouseEvent,
  MouseEventHandler,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TopBar, TopBarButton } from "./components";
import rough from "roughjs/bundled/rough.esm";
import { Drawable } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import { Point } from "roughjs/bin/geometry";

interface IElement {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  roughElement: Drawable;
  path: Array<Point>;
}

const generator: RoughGenerator = rough.generator();

const createElement = (
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

  return { x1, y1, x2, y2, roughElement, path };
};

const App = () => {
  const [elements, setElements] = useState<IElement[]>([]);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>("Line");

  const topBarClickHandler = (type: string) => {
    setSelected(type);
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
    setDrawing(true);
    const { clientX, clientY } = event;
    const path: Point[] = [[clientX, clientY]];
    const element = createElement(
      clientX,
      clientY,
      clientX,
      clientY,
      selected,
      path
    );
    setElements((prev: Array<IElement>) => [...prev, element]);
  };

  const handleMouseMove: MouseEventHandler = (event: MouseEvent) => {
    if (!drawing) return;
    const index = elements.length - 1;
    const { x1, y1, path } = elements[index];
    const { clientX, clientY } = event;
    path.push([clientX, clientY]);
    const updatedElement = createElement(
      x1,
      y1,
      clientX,
      clientY,
      selected,
      path
    );
    const copyElements = [...elements];
    copyElements[index] = updatedElement;
    setElements(copyElements);
  };

  const handleMouseUp: MouseEventHandler = (event: MouseEvent) => {
    setDrawing(false);
  };

  return (
    <>
      <div className=" w-screen h-screen">
        <TopBar
          selected={selected}
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
