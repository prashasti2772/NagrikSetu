import {useLanguage} from "../../language";
import {protectedDestination} from "../../services/navigation";
export default function SignInReason({state}) {
 const {t}=useLanguage();
 if(!state?.authRequired)return null;
 return <aside role="status" className="my-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-slate-900"><h2 className="font-bold">{t("Sign in required")}</h2><p>{state.reason==="expired"?t("Your session expired. Sign in again to continue."):t("Sign in to continue to")+" "+t(protectedDestination(state.from||""))+"."}</p><p>{t("Your destination is saved. After login or account creation, you will return here.")}</p></aside>;
}
