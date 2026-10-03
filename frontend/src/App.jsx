import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
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

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthorityRoute = pathname === "/admin" || pathname === "/authority-dashboard" || pathname.startsWith("/authority/");

  return (
    <div className="min-h-screen bg-slate-50">

      {!isAuthorityRoute && <Navbar />}

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/report-issue"
          element={<ReportIssue />}
        />

        <Route
          path="/track-complaint"
          element={
            <TrackComplaint />  
          }
        />

        <Route
          path="/categories"
          element={<Categories />}
        />
        
        <Route
          path="/my-complaints"
          element={<MyComplaints />}
        />

        <Route
          path="/my-complaints/:complaintId"
          element={<MyComplaintDetails />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/profile-settings"
          element={<ProfileSettings />}
        />

        <Route
          path="/resources"
          element={
            <div className="p-10">
              Resources
            </div>
          }
        />

        <Route
          path="/about"
          element={
            <div className="p-10">
              About
            </div>
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

        <Route
          path="/signup"
          element={<SignUp/>}
        />

        <Route
          path="/authority-dashboard"
          element={
          <AuthorityDashboard/>
        }
        />

        <Route
          path="/authority/complaints"
          element={<AuthorityComplaints />}
        />

        <Route path="/authority/assignments" element={<AuthorityOperationsPage page="assignments" />} />
        <Route path="/authority/verification" element={<AuthorityOperationsPage page="verification" />} />
        <Route path="/authority/analytics" element={<AuthorityOperationsPage page="analytics" />} />
        <Route path="/authority/officers" element={<AuthorityOperationsPage page="officers" />} />
        <Route path="/authority/departments" element={<AuthorityOperationsPage page="departments" />} />
        <Route path="/authority/notifications" element={<AuthorityOperationsPage page="notifications" />} />
        <Route path="/authority/settings" element={<AuthorityOperationsPage page="settings" />} />

      </Routes>

      {!isAuthorityRoute && <Footer />}

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;