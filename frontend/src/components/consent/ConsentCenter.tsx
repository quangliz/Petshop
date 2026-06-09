"use client";
import React, { useState, useEffect } from "react";
import { Shield, Cookie, Settings } from "lucide-react";

export default function ConsentCenter() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    personalization: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("pawsome-consent");
    if (!consent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setPreferences(parsed);
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (choices: typeof preferences) => {
    localStorage.setItem("pawsome-consent", JSON.stringify(choices));
    setPreferences(choices);
    setShowBanner(false);

    // Dispatch custom event so analytics scripts can listen
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pawsome-consent-updated", { detail: choices }));
    }
  };

  const handleAcceptAll = () => {
    const all = { necessary: true, analytics: true, personalization: true };
    saveConsent(all);
  };

  const handleRejectAll = () => {
    const none = { necessary: true, analytics: false, personalization: false };
    saveConsent(none);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gray-900/95 border border-gray-800 backdrop-blur-md text-white rounded-2xl shadow-2xl p-5 md:p-6 overflow-hidden">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />

        <div className="flex gap-4">
          <div className="bg-orange-500/10 p-2.5 rounded-xl self-start">
            <Shield className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              Bảo vệ quyền riêng tư của bạn <Cookie className="w-4 h-4 text-amber-400" />
            </h3>
            <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">
              Chúng tôi sử dụng cookie để tối ưu hóa trải nghiệm mua sắm và hỗ trợ trợ lý AI tư vấn chính xác hơn. Bạn có quyền tùy chỉnh tùy chọn cookie của mình.
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="mt-5 space-y-3.5 border-t border-gray-800 pt-4 animate-in fade-in duration-200">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  Thiết yếu <span className="text-[10px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded font-normal">Bắt buộc</span>
                </label>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Cần thiết để duy trì đăng nhập, giỏ hàng và bảo mật giao dịch.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="w-4 h-4 accent-orange-500 cursor-not-allowed opacity-50 mt-1"
              />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-200 cursor-pointer" htmlFor="consent-analytics">
                  Thống kê & Hiệu năng
                </label>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Thu thập thông tin ẩn danh để giám sát hiệu suất và cải thiện tốc độ tải trang.
                </p>
              </div>
              <input
                type="checkbox"
                id="consent-analytics"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Personalization */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-200 cursor-pointer" htmlFor="consent-personalization">
                  Cá nhân hóa AI
                </label>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Cho phép Trợ lý AI xem hồ sơ thú cưng và lịch sử đơn hàng để đưa ra lời khuyên phù hợp nhất.
                </p>
              </div>
              <input
                type="checkbox"
                id="consent-personalization"
                checked={preferences.personalization}
                onChange={(e) => setPreferences({ ...preferences, personalization: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer mt-1"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-5">
          {showDetails ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium py-2 rounded-xl border border-gray-700 transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleSavePreferences}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium py-2 rounded-xl transition-all shadow-md shadow-orange-950/20"
              >
                Lưu cài đặt
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium py-2 rounded-xl border border-gray-700 transition-colors"
                >
                  Từ chối
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium py-2 rounded-xl transition-all shadow-md shadow-orange-950/20"
                >
                  Đồng ý tất cả
                </button>
              </div>
              <button
                onClick={() => setShowDetails(true)}
                className="text-gray-400 hover:text-white text-xs flex items-center justify-center gap-1.5 mt-1 transition-colors py-1"
              >
                <Settings className="w-3.5 h-3.5" /> Tùy chỉnh chi tiết
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
