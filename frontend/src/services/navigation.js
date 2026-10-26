export function loginDestination(from, staff = false) {
  const fallback = staff ? "/authority/dashboard" : "/my-complaints";
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return fallback;
  const path = from.split(/[?#]/)[0];
  const staffRoute = path === "/admin" || path === "/authority-dashboard" || path.startsWith("/authority/");
  if (["/login", "/signup", "/authority/login", "/forgot-password"].includes(path) || staffRoute !== staff) return fallback;
  return from;
}

export function protectedDestination(path) {
  if (path.startsWith("/report-issue")) return "Report Issue";
  if (path.startsWith("/track-complaint")) return "Track Complaint";
  if (path.startsWith("/notifications")) return "Notifications";
  if (path.startsWith("/authority/") || path.startsWith("/admin")) return "Authority Dashboard";
  return "My Complaints";
}
export function authRedirect(location, roles, expired = false) {
  const staff = roles?.some(role=>["authority","admin"].includes(role));
  return {to:staff?"/authority/login":"/login",state:{from:location.pathname+(location.search||"")+(location.hash||""),authRequired:true,reason:expired?"expired":"login_required"}};
}
