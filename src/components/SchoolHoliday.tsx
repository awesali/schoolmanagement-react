import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import "./SchoolHoliday.css";

type HolidayStatus = { isHoliday: boolean; title?: string; date?: string };

export function useSchoolHoliday(schoolId?: number | null) {
  const [holiday, setHoliday] = useState<HolidayStatus | null>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const controller = new AbortController();
    const query = schoolId ? `?schoolId=${schoolId}` : "";
    setHoliday(null);
    fetch(`${API_BASE_URL}/api/AcademicHolidays/today${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!controller.signal.aborted) setHoliday(result?.data || null); })
      .catch(() => {});
    return () => controller.abort();
  }, [schoolId]);
  return holiday;
}

export function SchoolHolidayBanner({ holiday }: { holiday: HolidayStatus | null }) {
  if (!holiday?.isHoliday) return null;
  return <div className="school-holiday-banner" role="status">
    <strong>School holiday today</strong>
    <span>{holiday.title || "School is closed today."}</span>
  </div>;
}
