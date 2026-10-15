import AuthorityMap from "./pages/AuthorityMap";
import About from "./pages/About";
import Resources from "./pages/Resources";
import { AuthProvider, AuthGuard } from "./auth";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";

import Home from "./pages/Home";
import ReportIssue from "./pages/ReportIssue";
import TrackComplaint from "./pages/TrackComplaint";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import AuthorityComplaints from "./pages/AuthorityComplaints";
import AuthorityOperationsPage from "./pages/AuthorityOperationsPage";
import Categories from "./pages/Categories";
import MyComplaints from "./pages/MyComplaints";
import MyComplaintDetails from "./pages/MyComplaintDetails";
import HelpSupport from "./pages/HelpSupport";
import Notifications from "./pages/Notifications";
import ProfileSettings from "./pages/ProfileSettings";
import VerifyEmail from "./pages/VerifyEmail";
import AuthorityLogin from "./pages/AuthorityLogin";
import AuthorityProfile from "./pages/AuthorityProfile";
import AuthorityComplaintDetail from "./pages/AuthorityComplaintDetail";

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthorityRoute = pathname === "/admin" || pathname === "/authority-dashboard" || pathname.startsWith("/authority/");


  return (
    <div className="min-h-screen bg-slate-50">

      {!isAuthorityRoute && <Navbar />}

      <Routes>
<Route path="/admin" element={<AuthGuard roles={["admin"]}><Navigate to="/authority/dashboard" replace /></AuthGuard>} />
<Route path="*" element={<main className="mx-auto max-w-5xl p-10"><h1 className="text-2xl font-bold">Page not found</h1><a href="/" className="text-orange-700 underline">Return home</a></main>} />
<Route path="/authority/map" element={<AuthGuard roles={["authority", "admin"]}><AuthorityMap /></AuthGuard>} />
<Route path="/authority/dashboard" element={<AuthGuard roles={["authority", "admin"]}><AuthorityDashboard /></AuthGuard>} />
<Route path="/authority/reports" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="analytics" /></AuthGuard>} />
<Route path="/authority/reports/:id" element={<AuthGuard roles={["authority", "admin"]}><AuthorityComplaintDetail /></AuthGuard>} />
<Route path="/authority/login" element={<AuthorityLogin />} />
<Route path="/authority/profile" element={<AuthGuard roles={["authority", "admin"]}><AuthorityProfile /></AuthGuard>} />
<Route path="/authority/incidents" element={<AuthGuard roles={["authority", "admin"]}><Navigate to="/authority/complaints" replace /></AuthGuard>} />
<Route path="/authority/complaints" element={<AuthGuard roles={["authority", "admin"]}><AuthorityComplaints /></AuthGuard>} />
<Route path="/authority/complaints/:complaintId" element={<AuthGuard roles={["authority", "admin"]}><AuthorityComplaintDetail /></AuthGuard>} />
<Route path="/authority/officer-verification" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="officers" /></AuthGuard>} />
<Route path="/profile" element={<AuthGuard><ProfileSettings /></AuthGuard>} />

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/report-issue"
          element={<AuthGuard roles={["citizen"]}><ReportIssue /></AuthGuard>}
        />

        <Route
          path="/track-complaint"
          element={<AuthGuard roles={["citizen"]}>
            <TrackComplaint />  
          </AuthGuard>}
        />

        <Route
          path="/categories"
          element={<Categories />}
        />
        
        <Route
          path="/my-complaints"
          element={<AuthGuard roles={["citizen"]}><MyComplaints /></AuthGuard>}
        />

        <Route
          path="/my-complaints/:complaintId"
          element={<AuthGuard roles={["citizen"]}><MyComplaintDetails /></AuthGuard>}
        />

        <Route
          path="/notifications"
          element={<AuthGuard><Notifications /></AuthGuard>}
        />

        <Route
          path="/profile-settings"
          element={<AuthGuard><ProfileSettings /></AuthGuard>}
        />

        <Route
          path="/resources"
          element={
            <Resources />
          }
        />

        <Route
          path="/about"
          element={
            <About />
          }
        />

        <Route
          path="/help-support"
          element={
            <HelpSupport/>
          }
        />

        <Route
          path="/login"
          element={<Login/>}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route path="/verify-email" element={<AuthGuard><VerifyEmail /></AuthGuard>} />

        <Route
          path="/signup"
          element={<SignUp/>}
        />

        <Route
          path="/authority-dashboard"
          element={<AuthGuard roles={["authority", "admin"]}>
          <Navigate to="/authority/dashboard" replace />
        </AuthGuard>}
        />

        <Route path="/authority/assignments" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="assignments" /></AuthGuard>} />
        <Route path="/authority/verification" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="verification" /></AuthGuard>} />
        <Route path="/authority/analytics" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="analytics" /></AuthGuard>} />
        <Route path="/authority/officers" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="officers" /></AuthGuard>} />
        <Route path="/authority/departments" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="departments" /></AuthGuard>} />
        <Route path="/authority/notifications" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="notifications" /></AuthGuard>} />
        <Route path="/authority/settings" element={<AuthGuard roles={["authority", "admin"]}><AuthorityOperationsPage page="settings" /></AuthGuard>} />

      </Routes>

      {!isAuthorityRoute && <Footer />}

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider><AppLayout /></AuthProvider>
    </BrowserRouter>
  );
}

export default App;