import React, { Suspense } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ConditionalChatWidget from "@/components/chat/ConditionalChatWidget";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col relative">
      <Suspense fallback={<div className="h-[64px] bg-white border-b border-neutral-100" />}>
        <Header />
      </Suspense>
      <main className="flex-1 pt-[65px] md:pt-[107px]">{children}</main>
      <ConditionalChatWidget />
      <Footer />
    </div>
  );
}