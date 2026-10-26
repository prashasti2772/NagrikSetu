export function chatRequest(message, language) {
 return {message,requested_language:language==="hi"?"hi":"en"};
}
export function replyLanguages(result, requested) {
 return {detectedLanguage:result.detected_language||"und",responseLanguage:result.response_language||"en",effectiveResponseLanguage:result.response_language||"en",requestedLanguage:requested};
}
