import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth";
import { api, label, date } from "../services/api";
import { useResource, ResourceState } from "../services/useResource";
import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import LocationPicker from "../components/common/LocationPicker";

export function ComplaintDetail({citizen=false, complaintId:providedId}) {
 const params=useParams(),id=providedId || params.complaintId || params.id;
 const {user}=useAuth(); const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const resource=useResource(async signal=>{
 const [complaint,timeline,evidence,departments,officers,incident]=await Promise.all([
 api(`${citizen?"":"/authority"}/complaints/${id}`,{signal}),api(`/complaints/${id}/timeline`,{signal}),api(`/complaints/${id}/evidence`,{signal}),api("/departments",{signal}),citizen?Promise.resolve([]):api("/authority/officers",{signal}),api(`/complaints/${id}/incident`,{signal}).catch(e=>{if(e.status===404)return null;throw e;})]);
 return {complaint,timeline,evidence,departments,officers,incident};},[id,citizen]);
 const action=async(path,body,method="POST")=>{setBusy(true);setMessage("");try{await api(path,{method,body});setMessage("Saved successfully.");resource.reload();}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 const c=resource.data?.complaint;
 const submit=(event,kind)=>{event.preventDefault();const f=new FormData(event.currentTarget);
 if(kind==="assign")action(`/authority/complaints/${id}/assign`,{assigned_department_id:Number(f.get("department")) || null,assigned_officer_id:Number(f.get("officer")) || null,priority:f.get("priority")},"PATCH");
 if(kind==="status")action(`/authority/complaints/${id}/status`,{status:f.get("status")},"PATCH");
 if(kind==="remarks")action(`/authority/complaints/${id}/remarks`,{text:f.get("text")});
 if(kind==="resolve")action(`/authority/complaints/${id}/resolve`,{resolution_notes:f.get("text")});
 if(kind==="reopen-request")action(`/complaints/${id}/reopen-request`,{reason:f.get("text")});
 if(kind==="verify")action(`/complaints/${id}/verify`,{resolved:f.get("decision")==="yes",feedback:f.get("text") || null});
 };
 return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-7">
 <Link to={citizen?"/my-complaints":"/authority/complaints"} className="text-sm font-semibold text-orange-700">Back to complaints</Link>
 <ResourceState resource={resource}/>
 {message && <p role="status" className="my-4 rounded bg-amber-50 p-3 text-sm">{message}</p>}
 {c && <>
 <button type="button" onClick={()=>window.print()} className="mt-4 rounded border border-slate-300 px-3 py-2 text-sm print:hidden">Print Summary</button>
 <header className="mt-4 rounded-xl bg-[#102943] px-6 py-7 text-white"><p className="text-xs text-orange-300">Complaint #{c.id} ? {label(c.status)}</p><h1 className="mt-2 text-3xl font-bold">{c.title}</h1><p className="mt-2 text-sm">{c.address || "No address supplied"}</p></header>
 <section className="mt-4 rounded-xl border bg-white p-6"><h2 className="font-bold">Complaint Details</h2><p className="my-4 whitespace-pre-wrap text-sm">{c.description}</p><dl className="grid gap-3 sm:grid-cols-2">{[["Category",c.category],["Priority",label(c.priority)],["Severity",label(c.severity)],["Reported",date(c.created_at)],["Department",resource.data.departments.find(d=>d.id===c.assigned_department_id)?.name || "Unassigned"],["Officer",resource.data.officers.find(o=>o.id===c.assigned_officer_id)?.full_name || (c.assigned_officer_id?`Officer #${c.assigned_officer_id}`:"Unassigned")],["Verification",label(c.verification_status)],["Resolution notes",c.resolution_notes || "None"]].map(([key,value])=><div className="rounded bg-slate-50 p-3" key={key}><dt className="text-xs text-slate-500">{key}</dt><dd className="text-sm font-semibold">{value}</dd></div>)}</dl></section>
 {(c.latitude!=null || c.address) && <section className="mt-4 rounded-xl border bg-white p-5"><LocationPicker readOnly value={{latitude:c.latitude,longitude:c.longitude,address:c.address}}/></section>}
 {resource.data.incident && <section className="mt-4 rounded-xl border bg-white p-5"><h2 className="font-bold">Shared incident</h2><dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(resource.data.incident).filter(([k,v])=>v!==null && typeof v!=="object").map(([k,v])=><div key={k} className="text-sm"><span className="text-slate-500">{label(k)}: </span>{String(v)}</div>)}</dl></section>}
 <section className="mt-4 rounded-xl border bg-white p-5"><h2 className="font-bold">Evidence</h2>{!resource.data.evidence.length && <p className="mt-2 text-sm">No evidence attached.</p>}{resource.data.evidence.map(e=><Evidence key={e.id} evidence={e} complaintId={id}/>)}
 <form className="mt-4" onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);if(!citizen)form.set("evidence_type","resolution");await action(`/complaints/${id}/evidence/upload`,form);}}><label className="text-sm">{citizen?"Add complaint evidence":"Add resolution evidence"}<input required type="file" name="file" accept="image/jpeg,image/png,image/webp" className="block my-2"/></label><button disabled={busy} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Upload evidence</button></form></section>
 <section className="mt-4 rounded-xl border bg-white p-5"><h2 className="font-bold">Actions</h2><fieldset disabled={busy} className="mt-4 space-y-4 disabled:opacity-60">
 {!citizen && <>
 <AssignmentForm c={c} departments={resource.data.departments} officers={resource.data.officers} admin={user.role==="admin"} onSubmit={e=>submit(e,"assign")}/>
 <form onSubmit={e=>submit(e,"status")}><label className="text-sm">Workflow status<select name="status" className="field" defaultValue={c.status}>{["submitted","under_review","assigned","in_progress"].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><Save>Update status</Save></form>
 <form onSubmit={e=>submit(e,"remarks")}><textarea required name="text" maxLength={10000} className="field" placeholder="Add an audit remark"/><Save>Add remark</Save></form>
 {["under_review","assigned","in_progress","reopened"].includes(c.status) && <form onSubmit={e=>submit(e,"resolve")}><textarea required name="text" maxLength={10000} className="field" placeholder="Resolution notes"/><Save>Submit resolution for citizen verification</Save></form>}
 {["resolved","verification_pending"].includes(c.status) && <button onClick={()=>action(`/authority/complaints/${id}/reopen`)} className="rounded border px-3 py-2 text-sm">Reopen complaint</button>}
 {resource.data.incident && ["resolved","verification_pending"].includes(resource.data.incident.status) && <form onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);action(`/authority/incidents/${resource.data.incident.id}/finalize-verification`,{reason:f.get("reason")});}}><p className="text-sm">After the verification deadline, staff may review existing resolution evidence and record a closure reason. The server checks the deadline and evidence.</p><textarea required name="reason" maxLength={1000} className="field" placeholder="Reason for staff review closure"/><Save>Finalize expired verification</Save></form>}

 </>}
 {citizen && <>
 {["verification_pending","resolved"].includes(c.status) && <form onSubmit={e=>submit(e,"verify")}><p className="text-sm">Confirm whether the issue was resolved. The server checks your response eligibility and the verification deadline.</p><select name="decision" className="field"><option value="yes">Issue resolved</option><option value="no">Issue remains unresolved</option></select><textarea name="text" className="field" placeholder="Feedback (optional)"/><Save>Send verification</Save></form>}
 <form onSubmit={e=>submit(e,"reopen-request")}><textarea required name="text" maxLength={1000} className="field" placeholder="Reason to request reopening (server checks eligibility)"/><Save>Request reopening</Save></form>
 </>}
 </fieldset></section>
 <section className="mt-4 rounded-xl border bg-white p-5"><h2 className="font-bold">Status timeline</h2>{resource.data.timeline.map(h=><article key={h.id} className="border-b py-3 text-sm"><strong>{label(h.new_status)}</strong><p>{h.remarks}</p><p className="text-xs text-slate-500">{date(h.created_at)} ? {label(h.action)}</p></article>)}</section>
 </>}
 </main>;
}
function Save({children}){return <button className="mt-2 rounded bg-orange-600 px-4 py-2 text-sm font-bold text-white">{children}</button>;}
function AssignmentForm({c,departments,officers,admin,onSubmit}) {
 const [department,setDepartment]=useState(String(c.assigned_department_id || ""));
 const [officer,setOfficer]=useState(String(c.assigned_officer_id || ""));
 return <form onSubmit={onSubmit}><label className="text-sm">Department<select name="department" value={department} onChange={e=>{setDepartment(e.target.value);setOfficer("");}} className="field">{!department && <option value="">Unassigned</option>}{departments.filter(d=>admin || d.id===c.assigned_department_id).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="text-sm">Officer<select name="officer" value={officer} onChange={e=>setOfficer(e.target.value)} className="field"><option value="">Unassigned</option>{officers.filter(o=>o.department_id===Number(department)).map(o=><option key={o.id} value={o.id}>{o.full_name}</option>)}</select></label><label className="text-sm">Priority<select name="priority" defaultValue={c.priority} className="field">{["low","medium","high","critical"].map(p=><option key={p} value={p}>{label(p)}</option>)}</select></label><Save>Save assignment / priority</Save></form>;
}
function Evidence({evidence,complaintId}) {
 const [url,setUrl]=useState(""),[error,setError]=useState("");
 return <div className="my-3 text-sm"><button className="underline text-orange-700" onClick={async()=>{try{if(evidence.image_url){setUrl(evidence.image_url);return;} const result=await api(`/complaints/${complaintId}/evidence/${evidence.id}/access`);setUrl(result.signed_url);setError("");}catch(e){setError(e.message);}}}>View {label(evidence.evidence_type)} evidence #{evidence.id}</button>{url && <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${evidence.evidence_type} evidence`} className="mt-2 max-h-64 rounded"/></a>}{error && <p role="alert">{error}</p>}</div>;
}
export default function AuthorityComplaintDetail(){return <AuthorityWorkspaceLayout activeSection="complaints" title="Complaint Details"><ComplaintDetail/></AuthorityWorkspaceLayout>;}
