import {useEffect,useState,useCallback,useRef} from "react";
export function useResource(loader, dependencies=[]) {
 const loaderRef=useRef(loader);
 const [data,setData]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);
 useEffect(()=>{loaderRef.current=loader;});
 useEffect(()=>{
  const controller=new AbortController();
  Promise.resolve().then(()=>{
   if(controller.signal.aborted)return;
   setLoading(true);setError("");setData(null);
   return loaderRef.current(controller.signal);
  }).then(value=>{if(!controller.signal.aborted)setData(value);})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 // Loaders close over only the values explicitly listed by their callers.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[...dependencies,version]);
 const reload=useCallback(()=>setVersion(v=>v+1),[]);
 return {data,error,loading,reload,setData};
}
export function ResourceState({resource}) {
 if(resource.loading)return <p role="status" className="p-5">Loading...</p>;
 if(resource.error)return <div role="alert" className="p-5 text-red-700">{resource.error}<button onClick={resource.reload} className="ml-3 underline">Retry</button></div>;
 return null;
}
