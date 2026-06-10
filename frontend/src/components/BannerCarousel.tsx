"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { Banner } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export default function BannerCarousel() {
  const [current, setCurrent] = useState(0);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await api.get("/banners");
      return res.data?.items ?? [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? banners.length - 1 : c - 1));
  }, [banners.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === banners.length - 1 ? 0 : c + 1));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => next(), 5000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (isLoading || banners.length === 0) {
    return (
      <section className="mx-4 md:mx-8 mt-6 relative overflow-hidden rounded-[28px] bg-neutral-200/50 animate-pulse">
        <div className="relative w-full aspect-[4/3] md:aspect-[19/5]" />
      </section>
    );
  }

  const slide = banners[current];
  const desktopImage = slide.desktop_image_url || slide.image_url || slide.mobile_image_url;
  const mobileImage = slide.mobile_image_url || slide.desktop_image_url || slide.image_url;

  if (!desktopImage && !mobileImage) return null;

  return (
    <section className="mx-4 md:mx-8 mt-6 relative overflow-hidden rounded-[28px]">
      <div className="relative w-full aspect-[4/3] md:aspect-[19/5]">
        {banners.map((banner, i) => {
          const bannerDesktopImage = banner.desktop_image_url || banner.image_url || banner.mobile_image_url;
          const bannerMobileImage = banner.mobile_image_url || banner.desktop_image_url || banner.image_url;
          const active = i === current;

          const content = (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center md:hidden"
                style={{ backgroundImage: `url(${bannerMobileImage})` }}
              />
              <div
                className="absolute inset-0 hidden bg-cover bg-center md:block"
                style={{ backgroundImage: `url(${bannerDesktopImage})` }}
              />
            </>
          );

          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out ${
                active ? "opacity-100 translate-x-0 z-10" : "opacity-0 translate-x-4 z-0"
              }`}
              aria-hidden={!active}
            >
              {banner.link_url ? (
                <Link
                  href={banner.link_url}
                  className="absolute inset-0 block cursor-pointer"
                  tabIndex={active ? 0 : -1}
                >
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-30 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-neutral-800 flex items-center justify-center shadow-lg transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-30 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-neutral-800 flex items-center justify-center shadow-lg transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === current ? "bg-white scale-110" : "bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
