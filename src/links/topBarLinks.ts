import React from "react";
import { TbLine } from "react-icons/tb";
import {
  BsBoundingBoxCircles,
  BsPencil,
  BsPen,
  BsArrowsMove,
  BsEraser,
} from "react-icons/bs";

import { MdOutlineTextFields } from "react-icons/md";

interface ITopBarLink {
  icon: React.ReactElement;
  label: string;
}
const topBarLinks: Array<ITopBarLink> = [
  { icon: React.createElement(TbLine), label: "Line" },
  { icon: React.createElement(BsBoundingBoxCircles), label: "Box" },
  { icon: React.createElement(BsPencil), label: "Pencil" },
  { icon: React.createElement(BsPen), label: "Pen" },
  { icon: React.createElement(MdOutlineTextFields), label: "Text" },
  { icon: React.createElement(BsArrowsMove), label: "Selection" },
  { icon: React.createElement(BsEraser), label: "Eraser" },
];

export default topBarLinks;
