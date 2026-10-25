import {useState} from "react";
import {useSearchParams} from "react-router-dom";
import {ComplaintDetail} from "./AuthorityComplaintDetail";
export default function TrackComplaint(){
 const [searchParams,setSearchParams]=useSearchParams();
 const selected=/^[1-9]\d*$/.test(searchParams.get("id") || "")?searchParams.get("id"):"";
 const [id,setId]=useState(selected);
 return <><main className="mx-auto max-w-5xl p-6"><h1 className="text-3xl font-bold">Track Complaint</h1><p className="my-3 text-sm">Enter the numeric ID of a complaint you reported.</p><form onSubmit={e=>{e.preventDefault();setSearchParams({id});}}><input required type="text" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={20} value={id} onChange={e=>setId(e.target.value)} className="field" aria-label="Complaint ID"/><button className="mt-3 rounded bg-orange-600 px-4 py-2 text-white">Track complaint</button></form></main>{selected && <ComplaintDetail key={selected} citizen complaintId={selected}/>}</>;
}
