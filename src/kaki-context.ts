import { createContext, useContext } from "react";
export type Route = { name: string; id?: string; params?: Record<string, string> };
export type KakiContextValue = {
  data: any;
  user: any;
  desktop: boolean;
  refresh: () => Promise<void>;
  route: Route;
  setRouteParams: (patch: Record<string, string | undefined>) => void;
  go: (name: string, id?: string, params?: Record<string, string>) => void;
  back: () => void;
  toast: (text: string) => void;
  api: (path: string, method?: string, body?: any) => Promise<any>;
};
export const KakiContext = createContext<KakiContextValue | null>(null);
export function useKaki() {
  const value = useContext(KakiContext);
  if (!value) throw new Error("Kaki provider missing");
  return value;
}
export async function api(path: string, method = "GET", body?: any) {
  if (body === undefined && !["GET", "HEAD"].includes(method)) body = {};
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers:
      body === undefined
        ? { Accept: "application/json" }
        : { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response
    .json()
    .catch(() => ({
      error: "The server could not be reached. Please try again.",
    }));
  if (!response.ok) {
    const err = new Error(
      result.error ||
        result.message ||
        "Something went wrong. Please try again.",
    );
    Object.assign(err, { status: response.status });
    throw err;
  }
  return result;
}
export const networkNames: Record<string, string> = {
  secondary: "SECONDARY COMMUNITY",
  jc_mi: "JC / MI COMMUNITY",
  polytechnic: "POLY COMMUNITY",
  university: "UNI COMMUNITY",
};
