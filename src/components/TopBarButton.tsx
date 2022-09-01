import React from "react";
import { IconType } from "react-icons";

interface IProps {
  icon: React.ReactElement;
  label: string;
  currSelected: string;
  handler: () => void;
}

export const TopBarButton: React.FC<IProps> = ({
  icon,
  label,
  currSelected,
  handler,
}) => {
  const selected = currSelected === label;
  return (
    <div
      className={`rounded-full ${
        selected ? "bg-gray-600 text-white" : "bg-white text-black"
      } ${
        !selected ? "hover:bg-gray-200" : null
      } flex items-center text-2xl justify-center p-2`}
      onClick={handler}
    >
      {icon}
    </div>
  );
};
