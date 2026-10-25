export function loginDestination(from, staff = false) {
  const fallback = staff ? "/authority/dashboard" : "/my-complaints";
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return fallback;
  const path = from.split(/[?#]/)[0];
  const staffRoute = path === "/admin" || path === "/authority-dashboard" || path.startsWith("/authority/");
  if (["/login", "/signup", "/authority/login", "/forgot-password"].includes(path) || staffRoute !== staff) return fallback;
  return from;
}
