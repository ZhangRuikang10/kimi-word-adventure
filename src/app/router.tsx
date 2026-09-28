import { createBrowserRouter, createHashRouter } from "react-router-dom";
import { App } from "./App";
import { BadgesPage, FinishPage, HomePage, MistakeBookPage, MyWordsPage, StudyPage } from "../pages/Pages";
import { SimpleTeacherPage } from "../pages/TeacherPage";
const routes=[{element:<App/>,children:[{path:"/",element:<HomePage/>},{path:"/study",element:<StudyPage/>},{path:"/finish",element:<FinishPage/>},{path:"/words",element:<MyWordsPage/>},{path:"/mistakes",element:<MistakeBookPage/>},{path:"/badges",element:<BadgesPage/>},{path:"/teacher",element:<SimpleTeacherPage/>}]}];
export const router=import.meta.env.BASE_URL === "/" ? createBrowserRouter(routes) : createHashRouter(routes);
