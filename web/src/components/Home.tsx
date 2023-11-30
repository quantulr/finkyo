import FileList from "@/components/FileList.tsx";
import BreadcrumbNavigation from "@/components/BreadcrumbNavigation.tsx";
import {Card, CardBody} from "@chakra-ui/react";

const Home = () => {
    return (
        <div
            // style={{
            //   minHeight: "-webkit-fill-available",
            // }}
            className={"bg-gray-50 md:min-h-screen pb-2 md:pb-12"}
        >
            <div
                className={
                    "flex h-16 w-full flex-col justify-center bg-white px-2 shadow md:px-24"
                }
            >
                <span className={"text-xs text-gray-500"}>FOLD PATH</span>
                <BreadcrumbNavigation/>
            </div>
            <Card className={"mx-2 mt-2 md:mx-24 md:mt-12"}>
                <CardBody>
                    <FileList/>
                </CardBody>
            </Card>
        </div>
    );
};

export default Home;
