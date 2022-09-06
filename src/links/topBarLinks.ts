import React from "react";
import { TbLine } from "react-icons/tb";
import {
  BsBoundingBoxCircles,
  BsPencil,
  BsPen,
  BsArrowsMove,
} from "react-icons/bs";

interface ITopBarLink {
  icon: React.ReactElement;
  label: string;
}
const topBarLinks: Array<ITopBarLink> = [
  { icon: React.createElement(TbLine), label: "Line" },
  { icon: React.createElement(BsBoundingBoxCircles), label: "Box" },
  { icon: React.createElement(BsPencil), label: "Pencil" },
  { icon: React.createElement(BsPen), label: "Pen" },
  { icon: React.createElement(BsArrowsMove), label: "Selection" },
];

export default topBarLinks;
