export type AppLanguage = 'bho-IN' | 'hi-IN' | 'mr-IN' | 'kn-IN';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  sarvamSupported: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'bho-IN', label: 'Bhojpuri', nativeLabel: 'भोजपुरी', sarvamSupported: false },
  { code: 'hi-IN', label: 'Hindi', nativeLabel: 'हिन्दी', sarvamSupported: true },
  { code: 'mr-IN', label: 'Marathi', nativeLabel: 'मराठी', sarvamSupported: true },
  { code: 'kn-IN', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', sarvamSupported: true },
];

type TranslationKey =
  | 'safetyCheck' | 'scanAfterShift' | 'scanWristband' | 'takesTenSeconds' | 'evenLight'
  | 'latestCheck' | 'normalTitle' | 'normalBody' | 'elevatedTitle' | 'elevatedBody'
  | 'highTitle' | 'highBody' | 'invalidTitle' | 'invalidBody' | 'checkedAt'
  | 'noCheck' | 'resultAfterScan' | 'latestExposure' | 'referenceLimit' | 'todayChecks'
  | 'viewAll' | 'rescan' | 'ifUnwell' | 'ifUnwellTitle' | 'leaveArea' | 'done' | 'scanComplete'
  | 'placeBand' | 'keepSteady' | 'cameraNeeded' | 'cameraReason' | 'allowCamera'
  | 'shiftLength' | 'tapToScan' | 'startingCamera' | 'checkingBand' | 'staysOnPhone'
  | 'alignImage' | 'readPatches' | 'checkBand' | 'calculateExposure' | 'prepareResult'
  | 'replaceBand' | 'replaceBandBody' | 'whatToDo' | 'newBand' | 'tellSupervisor'
  | 'chooseLanguage' | 'languageOffline' | 'sarvamReady' | 'account';

const copy: Record<AppLanguage, Partial<Record<TranslationKey, string>>> = {
  'bho-IN': {
    safetyCheck: 'रउरा सुरक्षा जाँच',
    scanAfterShift: 'शिफ्ट के बाद भा सुपरवाइजर कहे त कलाईबैंड स्कैन करीं।',
    scanWristband: 'कलाईबैंड स्कैन करीं',
    takesTenSeconds: 'लगभग 10 सेकंड लागी',
    evenLight: 'समान रोशनी में फोन स्थिर राखीं।',
    latestCheck: 'आखिरी जाँच',
    normalTitle: 'सामान्य सीमा में बा',
    normalBody: 'साइट के सुरक्षा नियम मानत रहीं।',
    elevatedTitle: 'एक्सपोजर बढ़ल बा',
    elevatedBody: 'सुरक्षित जगह रुक के सुपरवाइजर के बताईं।',
    highTitle: 'ज्यादा एक्सपोजर मिलल',
    highBody: 'इलाका छोड़ के तुरते सुपरवाइजर के बताईं।',
    invalidTitle: 'कलाईबैंड बदलीं',
    invalidBody: 'ई कलाईबैंड भरोसेमंद रीडिंग नइखे देत।',
    checkedAt: 'जाँच के समय',
    noCheck: 'आज कवनो जाँच दर्ज नइखे',
    resultAfterScan: 'स्कैन के बाद नतीजा इहाँ देखाई।',
    latestExposure: 'हाल के एक्सपोजर',
    referenceLimit: 'सीमा',
    todayChecks: 'आज के जाँच',
    viewAll: 'सब देखीं',
    rescan: 'फेरु स्कैन करीं',
    ifUnwell: 'तबियत खराब लागे त इलाका छोड़ दीं, दूसरन के चेताईं, आ सुपरवाइजर के बताईं। गंध पर भरोसा मत करीं।',
    ifUnwellTitle: 'तबियत खराब लागे त',
    leaveArea: 'इलाका छोड़ के सुपरवाइजर के बताईं।',
    done: 'ठीक बा',
    scanComplete: 'स्कैन पूरा भइल',
    placeBand: 'कलाईबैंड के फ्रेम में रखीं',
    keepSteady: 'फोन स्थिर राखीं। पैच अन्हार लागे त लाइट जलाईं।',
    cameraNeeded: 'कैमरा के अनुमति चाहीं',
    cameraReason: 'वज्र सेतु कैमरा से कलाईबैंड के रंगीन पैच पढ़ेला।',
    allowCamera: 'कैमरा चालू करीं',
    shiftLength: 'शिफ्ट के समय',
    tapToScan: 'स्कैन करे खातिर दबाईं',
    startingCamera: 'कैमरा शुरू हो रहल बा…',
    checkingBand: 'कलाईबैंड जाँचत बा',
    staysOnPhone: 'ई प्रक्रिया फोन पर ही होला।',
    replaceBand: 'कलाईबैंड बदलीं',
    replaceBandBody: 'Expiry पैच सही नइखे, एह से ई नतीजा इस्तेमाल मत करीं।',
    whatToDo: 'अब का करीं',
    newBand: 'नया कलाईबैंड लगा के फेरु स्कैन करीं।',
    tellSupervisor: 'बार-बार होखे त सुपरवाइजर के बताईं।',
    chooseLanguage: 'भाषा चुनीं',
    languageOffline: 'भाषा फोन में सेव बा, इंटरनेट बिना भी चली।',
    sarvamReady: 'Sarvam AI अनुवाद उपलब्ध बा',
    account: 'खाता',
  },
  'hi-IN': {
    safetyCheck: 'आपकी सुरक्षा जाँच',
    scanAfterShift: 'शिफ्ट के बाद या सुपरवाइज़र के कहने पर कलाईबैंड स्कैन करें।',
    scanWristband: 'कलाईबैंड स्कैन करें',
    takesTenSeconds: 'लगभग 10 सेकंड लगेंगे',
    evenLight: 'समान रोशनी में फोन स्थिर रखें।',
    latestCheck: 'पिछली जाँच',
    normalTitle: 'सामान्य सीमा में',
    normalBody: 'साइट के सुरक्षा नियमों का पालन करते रहें।',
    elevatedTitle: 'एक्सपोज़र बढ़ा हुआ है',
    elevatedBody: 'सुरक्षित जगह रुकें और सुपरवाइज़र को बताएं।',
    highTitle: 'ज़्यादा एक्सपोज़र मिला',
    highBody: 'इलाका छोड़ें और तुरंत सुपरवाइज़र को बताएं।',
    invalidTitle: 'कलाईबैंड बदलें',
    invalidBody: 'यह कलाईबैंड भरोसेमंद रीडिंग नहीं दे रहा है।',
    checkedAt: 'जाँच का समय',
    noCheck: 'आज कोई जाँच दर्ज नहीं है',
    resultAfterScan: 'स्कैन के बाद नतीजा यहाँ दिखाई देगा।',
    latestExposure: 'नवीनतम एक्सपोज़र',
    referenceLimit: 'सीमा',
    todayChecks: 'आज की जाँच',
    viewAll: 'सभी देखें',
    rescan: 'फिर स्कैन करें',
    ifUnwell: 'तबियत खराब लगे तो इलाका छोड़ें, दूसरों को चेताएं और सुपरवाइज़र को बताएं। गंध पर भरोसा न करें।',
    ifUnwellTitle: 'तबियत खराब लगे तो',
    leaveArea: 'इलाका छोड़कर सुपरवाइज़र को बताएं।',
    done: 'ठीक है',
    scanComplete: 'स्कैन पूरा हुआ',
    placeBand: 'कलाईबैंड को फ्रेम में रखें',
    keepSteady: 'फोन स्थिर रखें। पैच अंधेरा लगे तो लाइट जलाएं।',
    cameraNeeded: 'कैमरा अनुमति चाहिए',
    cameraReason: 'वज्र सेतु कैमरे से कलाईबैंड के रंगीन पैच पढ़ता है।',
    allowCamera: 'कैमरा चालू करें',
    shiftLength: 'शिफ्ट का समय',
    tapToScan: 'स्कैन करने के लिए दबाएं',
    startingCamera: 'कैमरा शुरू हो रहा है…',
    checkingBand: 'कलाईबैंड जाँचा जा रहा है',
    staysOnPhone: 'यह प्रक्रिया फोन पर ही होती है।',
    replaceBand: 'कलाईबैंड बदलें',
    replaceBandBody: 'Expiry पैच सही नहीं है, इसलिए इस नतीजे पर भरोसा न करें।',
    whatToDo: 'अब क्या करें',
    newBand: 'नया कलाईबैंड लगाकर फिर स्कैन करें।',
    tellSupervisor: 'बार-बार हो तो सुपरवाइज़र को बताएं।',
    chooseLanguage: 'भाषा चुनें',
    languageOffline: 'भाषा फोन में सेव है और इंटरनेट के बिना भी चलेगी।',
    sarvamReady: 'Sarvam AI अनुवाद उपलब्ध है',
    account: 'खाता',
  },
  'mr-IN': {
    safetyCheck: 'तुमची सुरक्षा तपासणी',
    scanAfterShift: 'शिफ्टनंतर किंवा सुपरवायझरने सांगितल्यावर रिस्टबँड स्कॅन करा.',
    scanWristband: 'रिस्टबँड स्कॅन करा',
    takesTenSeconds: 'सुमारे १० सेकंद लागतील',
    evenLight: 'समान प्रकाशात फोन स्थिर ठेवा.',
    latestCheck: 'शेवटची तपासणी',
    normalTitle: 'सामान्य मर्यादेत',
    normalBody: 'साइटच्या सुरक्षा नियमांचे पालन करत रहा.',
    elevatedTitle: 'एक्सपोजर वाढले आहे',
    elevatedBody: 'सुरक्षित ठिकाणी थांबा आणि सुपरवायझरला सांगा.',
    highTitle: 'जास्त एक्सपोजर आढळले',
    highBody: 'जागा सोडा आणि त्वरित सुपरवायझरला सांगा.',
    invalidTitle: 'रिस्टबँड बदला',
    invalidBody: 'हा रिस्टबँड विश्वासार्ह रीडिंग देत नाही.',
    checkedAt: 'तपासणीची वेळ',
    noCheck: 'आज कोणतीही तपासणी नोंदलेली नाही',
    resultAfterScan: 'स्कॅननंतर निकाल येथे दिसेल.',
    latestExposure: 'अलीकडील एक्सपोजर',
    referenceLimit: 'मर्यादा',
    todayChecks: 'आजच्या तपासण्या',
    viewAll: 'सर्व पहा',
    rescan: 'पुन्हा स्कॅन करा',
    ifUnwell: 'अस्वस्थ वाटल्यास जागा सोडा, इतरांना सावध करा आणि सुपरवायझरला सांगा. वासावर अवलंबून राहू नका.',
    ifUnwellTitle: 'अस्वस्थ वाटल्यास',
    leaveArea: 'जागा सोडून सुपरवायझरला सांगा.',
    done: 'ठीक आहे',
    scanComplete: 'स्कॅन पूर्ण',
    placeBand: 'रिस्टबँड फ्रेममध्ये ठेवा',
    keepSteady: 'फोन स्थिर ठेवा. पॅच गडद दिसल्यास लाईट लावा.',
    cameraNeeded: 'कॅमेरा परवानगी आवश्यक',
    cameraReason: 'वज्र सेतू कॅमेराने रिस्टबँडवरील रंगीत पॅच वाचतो.',
    allowCamera: 'कॅमेरा सुरू करा',
    shiftLength: 'शिफ्टचा कालावधी',
    tapToScan: 'स्कॅन करण्यासाठी दाबा',
    startingCamera: 'कॅमेरा सुरू होत आहे…',
    checkingBand: 'रिस्टबँड तपासत आहे',
    staysOnPhone: 'ही प्रक्रिया फोनवरच होते.',
    replaceBand: 'रिस्टबँड बदला',
    replaceBandBody: 'Expiry पॅच योग्य नाही, त्यामुळे या निकालावर विश्वास ठेवू नका.',
    whatToDo: 'आता काय करावे',
    newBand: 'नवा रिस्टबँड लावून पुन्हा स्कॅन करा.',
    tellSupervisor: 'पुन्हा असे झाल्यास सुपरवायझरला सांगा.',
    chooseLanguage: 'भाषा निवडा',
    languageOffline: 'भाषा फोनमध्ये सेव्ह आहे आणि इंटरनेटशिवायही चालेल.',
    sarvamReady: 'Sarvam AI भाषांतर उपलब्ध',
    account: 'खाते',
  },
  'kn-IN': {
    safetyCheck: 'ನಿಮ್ಮ ಸುರಕ್ಷತಾ ತಪಾಸಣೆ',
    scanAfterShift: 'ಶಿಫ್ಟ್ ನಂತರ ಅಥವಾ ಮೇಲ್ವಿಚಾರಕರು ಹೇಳಿದಾಗ ಕೈಪಟ್ಟಿಯನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
    scanWristband: 'ಕೈಪಟ್ಟಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    takesTenSeconds: 'ಸುಮಾರು 10 ಸೆಕೆಂಡ್ ಬೇಕು',
    evenLight: 'ಸಮ ಬೆಳಕಿನಲ್ಲಿ ಫೋನ್ ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ.',
    latestCheck: 'ಇತ್ತೀಚಿನ ತಪಾಸಣೆ',
    normalTitle: 'ಸಾಮಾನ್ಯ ಮಿತಿಯಲ್ಲಿದೆ',
    normalBody: 'ಸೈಟ್‌ನ ಸುರಕ್ಷತಾ ನಿಯಮಗಳನ್ನು ಮುಂದುವರಿಸಿ.',
    elevatedTitle: 'ಎಕ್ಸ್‌ಪೋಸರ್ ಹೆಚ್ಚಾಗಿದೆ',
    elevatedBody: 'ಸುರಕ್ಷಿತ ಸ್ಥಳದಲ್ಲಿ ನಿಂತು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    highTitle: 'ಹೆಚ್ಚಿನ ಎಕ್ಸ್‌ಪೋಸರ್ ಪತ್ತೆಯಾಗಿದೆ',
    highBody: 'ಸ್ಥಳದಿಂದ ಹೊರಗೆ ಹೋಗಿ ತಕ್ಷಣ ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    invalidTitle: 'ಕೈಪಟ್ಟಿ ಬದಲಿಸಿ',
    invalidBody: 'ಈ ಕೈಪಟ್ಟಿ ವಿಶ್ವಾಸಾರ್ಹ ರೀಡಿಂಗ್ ನೀಡುತ್ತಿಲ್ಲ.',
    checkedAt: 'ತಪಾಸಣೆ ಸಮಯ',
    noCheck: 'ಇಂದು ಯಾವುದೇ ತಪಾಸಣೆ ದಾಖಲಾಗಿಲ್ಲ',
    resultAfterScan: 'ಸ್ಕ್ಯಾನ್ ನಂತರ ಫಲಿತಾಂಶ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.',
    latestExposure: 'ಇತ್ತೀಚಿನ ಎಕ್ಸ್‌ಪೋಸರ್',
    referenceLimit: 'ಮಿತಿ',
    todayChecks: 'ಇಂದಿನ ತಪಾಸಣೆಗಳು',
    viewAll: 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
    rescan: 'ಮತ್ತೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    ifUnwell: 'ಅಸ್ವಸ್ಥವೆನಿಸಿದರೆ ಸ್ಥಳದಿಂದ ಹೊರಗೆ ಹೋಗಿ, ಇತರರನ್ನು ಎಚ್ಚರಿಸಿ ಮತ್ತು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ. ವಾಸನೆಯನ್ನು ನಂಬಬೇಡಿ.',
    ifUnwellTitle: 'ಅಸ್ವಸ್ಥವೆನಿಸಿದರೆ',
    leaveArea: 'ಸ್ಥಳದಿಂದ ಹೊರಗೆ ಹೋಗಿ ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    done: 'ಸರಿ',
    scanComplete: 'ಸ್ಕ್ಯಾನ್ ಪೂರ್ಣಗೊಂಡಿದೆ',
    placeBand: 'ಕೈಪಟ್ಟಿಯನ್ನು ಫ್ರೇಮ್‌ನಲ್ಲಿ ಇರಿಸಿ',
    keepSteady: 'ಫೋನ್ ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ. ಪ್ಯಾಚ್ ಕತ್ತಲಾಗಿ ಕಂಡರೆ ಲೈಟ್ ಆನ್ ಮಾಡಿ.',
    cameraNeeded: 'ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಅಗತ್ಯ',
    cameraReason: 'ವಜ್ರ ಸೇತು ಕ್ಯಾಮೆರಾದಿಂದ ಕೈಪಟ್ಟಿಯ ಬಣ್ಣದ ಪ್ಯಾಚ್‌ಗಳನ್ನು ಓದುತ್ತದೆ.',
    allowCamera: 'ಕ್ಯಾಮೆರಾ ಆನ್ ಮಾಡಿ',
    shiftLength: 'ಶಿಫ್ಟ್ ಅವಧಿ',
    tapToScan: 'ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಒತ್ತಿರಿ',
    startingCamera: 'ಕ್ಯಾಮೆರಾ ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ…',
    checkingBand: 'ಕೈಪಟ್ಟಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ',
    staysOnPhone: 'ಈ ಪ್ರಕ್ರಿಯೆ ಫೋನ್‌ನಲ್ಲೇ ನಡೆಯುತ್ತದೆ.',
    replaceBand: 'ಕೈಪಟ್ಟಿ ಬದಲಿಸಿ',
    replaceBandBody: 'Expiry ಪ್ಯಾಚ್ ಸರಿಯಾಗಿಲ್ಲ, ಆದ್ದರಿಂದ ಈ ಫಲಿತಾಂಶವನ್ನು ನಂಬಬೇಡಿ.',
    whatToDo: 'ಈಗ ಏನು ಮಾಡಬೇಕು',
    newBand: 'ಹೊಸ ಕೈಪಟ್ಟಿ ಹಾಕಿ ಮತ್ತೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ.',
    tellSupervisor: 'ಮತ್ತೆ ಹೀಗಾದರೆ ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    chooseLanguage: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
    languageOffline: 'ಭಾಷೆಯನ್ನು ಫೋನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ; ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದರೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ.',
    sarvamReady: 'Sarvam AI ಅನುವಾದ ಲಭ್ಯವಿದೆ',
    account: 'ಖಾತೆ',
  },
};

export function translateUi(key: TranslationKey, language: AppLanguage, fallback: string): string {
  return copy[language][key] ?? fallback;
}

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SARVAM_API_KEY);
}

export async function translateWithSarvam(input: string, targetLanguage: AppLanguage): Promise<string> {
  if (targetLanguage === 'bho-IN') throw new Error('Sarvam Translate does not currently list Bhojpuri support');
  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY;
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_SARVAM_API_KEY');

  const response = await fetch('https://api.sarvam.ai/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      input,
      source_language_code: 'en-IN',
      target_language_code: targetLanguage,
      model: 'sarvam-translate:v1',
    }),
  });

  if (!response.ok) throw new Error(`Sarvam translation failed: ${response.status}`);
  const payload = await response.json() as { translated_text?: string };
  if (!payload.translated_text) throw new Error('Sarvam returned no translated text');
  return payload.translated_text;
}

export async function translateOrFallback(input: string, targetLanguage: AppLanguage, fallback: string): Promise<string> {
  try {
    return await translateWithSarvam(input, targetLanguage);
  } catch {
    return fallback;
  }
}
