import { API_BASE_URL } from "../config";

export async function loadAdminSchools<T>(): Promise<T[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/Admin/School-by-superadmin`,
    {
      cache: "no-store",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );
  if (response.status === 401)
    throw new Error(
      "Your session has expired. Please log in again to load your schools.",
    );
  if (response.status === 403)
    throw new Error(
      "Your account does not have permission to load these schools.",
    );
  if (!response.ok)
    throw new Error(
      `Unable to load schools (HTTP ${response.status}). Please retry.`,
    );
  const result = await response.json();
  if (!result.success || !Array.isArray(result.data))
    throw new Error(
      result.message || "The server returned an invalid school list.",
    );
  return result.data;
}
