import {createContext, useContext, useEffect, useState} from "react";
import {readLanguage, saveLanguage, translate} from "./services/i18n.js";
const LanguageContext = createContext({language:"en", setLanguage:()=>{}, t:text=>text});
export function LanguageProvider({children}) {
 const [language, setValue] = useState(()=>{try{return readLanguage(window.localStorage);}catch{return "en";}});
 useEffect(()=>{ document.documentElement.lang=language; },[language]);
 const setLanguage=value=>{let storage;try{storage=window.localStorage;}catch{storage=null;}setValue(saveLanguage(storage,value));};
 return <LanguageContext.Provider value={{language,setLanguage,t:text=>translate(text,language)}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguagePicker() {
 const {language,setLanguage}=useLanguage();
 return <label className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs text-slate-900"><span className="sr-only">Interface language / भाषा</span><select aria-label="Interface language / भाषा" value={language} onChange={e=>setLanguage(e.target.value)} className="min-h-11 max-w-28 bg-transparent"><option value="en">English</option><option value="hi">हिन्दी</option></select></label>;
}
