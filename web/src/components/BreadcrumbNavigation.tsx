import { useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
} from "@chakra-ui/react";
import { FaChevronRight } from "react-icons/fa6";
import { useMemo } from "react";
import { HiOutlineHome } from "react-icons/hi2";

const BreadcrumbNavigation = () => {
  const params = useParams();
  const links = useMemo(
    () => params["*"]?.split("/").filter((item) => !!item) ?? [],
    [params],
  );
  return (
    <Breadcrumb
      className={"overflow-x-auto"}
      separator={<Icon as={FaChevronRight} boxSize={2} />}
    >
      <BreadcrumbItem isCurrentPage={links.length === 0}>
        <BreadcrumbLink
          className={`rounded p-1 leading-none ${
            links.length === 0 ? "" : "hover:bg-gray-200"
          }`}
          href={"/browse"}
        >
          <Icon as={HiOutlineHome} />
        </BreadcrumbLink>
      </BreadcrumbItem>
      {links.map((item, index) => (
        <BreadcrumbItem key={index} isCurrentPage={index === links.length - 1}>
          <BreadcrumbLink
            className={`${
              index === links.length - 1 ? "" : "hover:bg-gray-200"
            } rounded p-1 leading-none`}
            href={links
              .slice(0, index + 1)
              .reduce((acc, cur) => `${acc}/${cur}`, "/browse")}
          >
            {item}
          </BreadcrumbLink>
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
};

export default BreadcrumbNavigation;
