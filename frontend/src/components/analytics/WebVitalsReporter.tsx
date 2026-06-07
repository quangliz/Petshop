"use client";
import { useReportWebVitals } from "next/web-vitals";
import api from "@/lib/api";

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Check cookie consent before sending analytics metrics
    if (typeof window !== "undefined") {
      const consentStr = localStorage.getItem("pawsome-consent");
      if (consentStr) {
        try {
          const consent = JSON.parse(consentStr);
          if (!consent.analytics) return;
        } catch {
          // Default to allowing if parse fails or is unset
        }
      }
    }

    // Fire-and-forget metrics upload
    api.post("/metrics/web-vitals", {
      name: metric.name,
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      rating: metric.rating,
    }).catch(() => {
      // Fail silently to not degrade client performance
    });
  });

  return null;
}
