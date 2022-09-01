import topBarLinks from "../links/topBarLinks";
import { TopBarButton } from "./TopBarButton";
import { MdClear } from "react-icons/md";

interface IProps {
  selected: string;
  btnHandler: (type: string) => void;
  clearHandler: () => void;
}

export const TopBar: React.FC<IProps> = ({
  selected,
  btnHandler,
  clearHandler,
}) => {
  return (
    <div className="h-[6%]  fixed left-[50%] translate-x-[-50%] top-0 flex items-center justify-center">
      <div className="rounded-md shadow-md flex items-center mt-4 px-4 gap-2 w-full h-full border-solid border-black border-2">
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
        className=" hover:bg-gray-200 bg-white shadow-md hover:text-red-400 text-black flex items-center justify-center text-3xl h-[80%] px-2 mx-2 mt-4 rounded-full "
        onClick={clearHandler}
      >
        <MdClear />
      </div>
    </div>
  );
};
