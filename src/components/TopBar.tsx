import topBarLinks from "../links/topBarLinks";
import { TopBarButton } from "./TopBarButton";
import { MdClear } from "react-icons/md";
import { IoMdRedo, IoMdUndo } from "react-icons/io";

interface IProps {
  selected: string;
  btnHandler: (type: string) => void;
  clearHandler: () => void;
  undoHandler: () => void;
  redoHandler: () => void;
}

export const TopBar: React.FC<IProps> = ({
  selected,
  btnHandler,
  clearHandler,
  undoHandler,
  redoHandler,
}) => {
  return (
    <div className="h-[6%]  fixed w-screen top-0 flex items-center justify-center">
      <div className="rounded-md shadow-md flex items-center mt-4 px-4 mr-4 gap-2 h-full border-solid border-black border-2">
        <TopBarButton
          icon={<IoMdUndo />}
          label="Undo"
          key="Undo"
          currSelected={selected}
          handler={undoHandler}
        />
        <TopBarButton
          icon={<IoMdRedo />}
          label="Redo"
          key="Redo"
          currSelected={selected}
          handler={redoHandler}
        />
      </div>
      <div className="rounded-md shadow-md flex items-center mt-4 px-4 gap-2 h-full border-solid border-black border-2">
        {topBarLinks.map((link, index) => (
          <TopBarButton
            icon={link.icon}
            label={link.label}
            key={index}
            currSelected={selected}
            handler={() => btnHandler(link.label)}
          />
        ))}
      </div>
      <div
        className="absolute right-0 hover:bg-gray-200 bg-white shadow-md hover:text-red-400 text-black flex items-center justify-center text-3xl h-[85%] px-2 mx-2 mt-4 rounded-full border-solid border-black border-2"
        onClick={clearHandler}
      >
        <MdClear />
      </div>
    </div>
  );
};
