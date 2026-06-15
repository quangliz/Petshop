"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import api from "@/lib/api";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
  id,
  disabled = false,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerIdx, setTriggerIdx] = useState(-1);
  const [loading, setLoading] = useState(false);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/products/?q=${encodeURIComponent(query)}&size=5&page=1&short=true`;
        const res = await api.get(url, { signal: controller.signal });
        setSuggestions(res.data.items || []);
        setActiveIndex(0);
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          console.error("Failed to fetch product suggestions", err);
        }
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [query, showSuggestions]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkCursor = (textarea: HTMLTextAreaElement) => {
    const val = textarea.value;
    const selectionStart = textarea.selectionStart;
    const textBefore = val.slice(0, selectionStart);

    // Find the last index of '@' before the cursor
    const lastAtIdx = textBefore.lastIndexOf("@");
    if (lastAtIdx !== -1) {
      // The character before '@' must be whitespace or start of string
      const charBeforeAt = lastAtIdx > 0 ? textBefore[lastAtIdx - 1] : "";
      if (charBeforeAt === "" || /\s/.test(charBeforeAt)) {
        const queryText = textBefore.slice(lastAtIdx + 1);
        // Ensure no whitespace is in the query text (whitespace terminates search trigger)
        if (!/\s/.test(queryText)) {
          setQuery(queryText);
          setTriggerIdx(lastAtIdx);
          setShowSuggestions(true);
          return;
        }
      }
    }
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    checkCursor(e.target);
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check cursor on movement (e.g. arrow keys)
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      checkCursor(e.currentTarget);
    }
  };

  const selectSuggestion = (product: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const before = value.slice(0, triggerIdx);
    const after = value.slice(textarea.selectionStart);
    const insertText = `<product>${product.slug}</product> `;
    const newValue = before + insertText + after;

    onChange(newValue);
    setShowSuggestions(false);

    // Set cursor position right after the inserted tag
    const newCursor = triggerIdx + insertText.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={(e) => checkCursor(e.currentTarget)}
        placeholder={placeholder}
        rows={rows}
        className={className}
        disabled={disabled}
      />

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bottom-full left-0 mb-2 w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ maxHeight: "280px" }}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-neutral-50 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">Gợi ý sản phẩm</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {loading && suggestions.length === 0 && (
              <div className="p-4 text-xs text-neutral-400 text-center flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang tìm sản phẩm...</span>
              </div>
            )}
            {!loading && suggestions.length === 0 && (
              <div className="p-4 text-xs text-neutral-400 text-center">
                Không tìm thấy sản phẩm nào khớp với "@ {query}"
              </div>
            )}
            {suggestions.map((p, idx) => {
              const active = idx === activeIndex;
              const discount = p.sale_price && p.price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectSuggestion(p)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left border-none outline-none transition-all duration-150 ${
                    active ? "bg-neutral-50 shadow-xs" : "bg-transparent"
                  }`}
                >
                  {p.thumbnail_url ? (
                    <div className="relative w-10 h-10 shrink-0 overflow-hidden rounded-lg bg-neutral-50 border border-neutral-100">
                      <Image
                        src={p.thumbnail_url}
                        alt={p.name}
                        fill
                        sizes="40px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold text-neutral-800 truncate leading-snug">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">{p.brand || "Khác"}</span>
                      {discount > 0 && (
                        <span className="inline-block rounded bg-red-50 px-1 py-0.2 text-[9px] font-bold text-red-600">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-extrabold text-neutral-900">
                      {(p.sale_price ?? p.price).toLocaleString("vi-VN")}đ
                    </div>
                    {p.sale_price && (
                      <div className="text-[10px] text-neutral-400 line-through">
                        {p.price.toLocaleString("vi-VN")}đ
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
