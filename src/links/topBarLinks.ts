import React from "react";
import { TbLine } from "react-icons/tb";
import { BsBoundingBoxCircles, BsFillPencilFill } from "react-icons/bs";

interface ITopBarLink {
  icon: React.ReactElement;
  label: string;
}
const topBarLinks: Array<ITopBarLink> = [
  { icon: React.createElement(TbLine), label: "Line" },
  { icon: React.createElement(BsBoundingBoxCircles), label: "Box" },
  { icon: React.createElement(BsFillPencilFill), label: "Pen" },
];

export default topBarLinks;
