import type { Metadata } from "next";
export const metadata: Metadata = {title:"AquaSite · Living landscape",description:"Explore a 3D community landscape and see how data centre planning affects water, heat, wildlife and neighbours."};
export default function CommunitiesPage(){return <iframe title="AquaSite interactive 3D community landscape" src="/aquasite-world.html" style={{display:"block",width:"100%",height:"100dvh",border:0}} allow="fullscreen"/>;}
