import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import ProfileSettings from "./ProfileSettings";
import {useAuth} from "../auth";
import {api} from "../services/api";
import {useResource,ResourceState} from "../services/useResource";
export default function AuthorityProfile(){const {user}=useAuth();const r=useResource(signal=>api("/departments",{signal}),[]);return <AuthorityWorkspaceLayout activeSection="settings" title="Staff Profile"><section className="mx-6 mt-5 rounded-xl border bg-white p-5"><h1 className="text-xl font-bold">Staff Profile</h1><ResourceState resource={r}/><p className="mt-3 text-sm">Role: {user.role} ? Department: {r.data?.find(d=>d.id===user.department_id)?.name || "Unassigned"} ? Employee ID: {user.employee_id || "Not available"} ? Designation: {user.designation || "Not available"}</p></section><ProfileSettings/></AuthorityWorkspaceLayout>;}
