"use client";
import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

const ALLOWED = new Set(["/", "/shop", "/profile"]);

export default function ConditionalChatWidget() {
  const pathname = usePathname();
  if (!ALLOWED.has(pathname) && !pathname.startsWith("/products/")) return null;
  return <ChatWidget />;
}
