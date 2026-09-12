import { getCachedTranslation, saveCachedTranslation } from './db';

export type AppLanguage = 'en-IN' | 'bho-IN' | 'hi-IN' | 'mr-IN' | 'kn-IN';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  sarvamSupported: boolean;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en-IN', label: 'English', nativeLabel: 'English', sarvamSupported: true },
  { code: 'bho-IN', label: 'Bhojpuri', nativeLabel: 'भोजपुरी', sarvamSupported: false },
  { code: 'hi-IN', label: 'Hindi', nativeLabel: 'हिन्दी', sarvamSupported: true },
  { code: 'mr-IN', label: 'Marathi', nativeLabel: 'मराठी', sarvamSupported: true },
  { code: 'kn-IN', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', sarvamSupported: true },
];

export type TranslationKey =
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
  'en-IN': {},
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

// Safety-critical and navigation copy must remain readable even when Sarvam is
// unavailable. These phrases are also used as the immediate first paint while
// the broader Sarvam cache warms in the background.
const offlinePhrases: Partial<Record<AppLanguage, Record<string, string>>> = {
  'hi-IN': {
    'Shift duration': 'शिफ्ट की अवधि', '8 hours': '8 घंटे', 'Wristband status': 'कलाईबैंड की स्थिति', 'Not scanned': 'स्कैन नहीं किया गया',
    'Wristband manual': 'कलाईबैंड निर्देश', 'Safety guidelines': 'सुरक्षा दिशा-निर्देश', 'Close': 'बंद करें', 'India TWA limit': 'भारत TWA सीमा',
    'Keep the patch clean, dry, and visible.': 'पैच को साफ, सूखा और दिखाई देने योग्य रखें।',
    'Place the full patch inside the camera frame after your shift.': 'शिफ्ट के बाद पूरे पैच को कैमरा फ्रेम के अंदर रखें।',
    'Use even light and hold the phone steady.': 'समान रोशनी का उपयोग करें और फोन स्थिर रखें।',
    'If the band is invalid, replace it and tell your supervisor.': 'यदि बैंड अमान्य है, तो उसे बदलें और अपने सुपरवाइज़र को बताएं।',
    'Indian factory H₂S safety guidance': 'भारतीय कारखाना H₂S सुरक्षा मार्गदर्शन',
    'Indian factory H₂S reference': 'भारतीय कारखाना H₂S संदर्भ', '8-hour TWA limit': '8 घंटे की TWA सीमा', '15-minute STEL': '15 मिनट की STEL सीमा', 'Schedule II reference': 'अनुसूची II संदर्भ',
    'This wristband estimates cumulative exposure. It cannot measure instantaneous peaks or establish legal compliance. Follow your site’s H₂S procedure and supervisor instructions.': 'यह कलाईबैंड कुल एक्सपोज़र का अनुमान लगाता है। यह अचानक बढ़े हुए स्तर को नहीं माप सकता और कानूनी अनुपालन तय नहीं करता। अपनी साइट की H₂S प्रक्रिया और सुपरवाइज़र के निर्देश मानें।',
    'Know the H₂S hazards and the safety measures for your work area.': 'अपने कार्य क्षेत्र में H₂S के खतरों और सुरक्षा उपायों को जानें।',
    'Follow your factory’s safe work instructions, training, supervision, ventilation, and PPE requirements.': 'कारखाने के सुरक्षित कार्य निर्देश, प्रशिक्षण, निगरानी, वेंटिलेशन और PPE की आवश्यकताओं का पालन करें।',
    'If an alarm or warning appears, stop work, move to fresh air, and inform your supervisor.': 'अलार्म या चेतावनी दिखे तो काम रोकें, ताज़ी हवा में जाएं और सुपरवाइज़र को बताएं।',
    'Do not enter or attempt rescue in a gas-affected area unless trained, authorised, and using the required protective equipment.': 'गैस प्रभावित क्षेत्र में तब तक प्रवेश या बचाव का प्रयास न करें जब तक आप प्रशिक्षित और अधिकृत न हों और आवश्यक सुरक्षा उपकरण न पहने हों।',
    'Reference: India Factories Act Schedule II lists H₂S at 10 ppm for 8-hour TWA and 15 ppm for 15-minute STEL. Use your site gas detector and emergency plan for immediate hazards.': 'संदर्भ: भारत के कारखाना अधिनियम की अनुसूची II में H₂S के लिए 8 घंटे की TWA सीमा 10 ppm और 15 मिनट की STEL सीमा 15 ppm है। तुरंत खतरे के लिए साइट गैस डिटेक्टर और आपातकालीन योजना का उपयोग करें।',
    'VALID': 'मान्य', 'HIGH': 'उच्च', 'ELEVATED': 'बढ़ा हुआ', 'RESCAN': 'फिर स्कैन करें',
  },
  'bho-IN': {
    'Shift duration': 'शिफ्ट के समय', '8 hours': '8 घंटा', 'Wristband status': 'कलाईबैंड के स्थिति', 'Not scanned': 'स्कैन नइखे भइल',
    'Wristband manual': 'कलाईबैंड निर्देश', 'Safety guidelines': 'सुरक्षा निर्देश', 'Close': 'बंद करीं', 'India TWA limit': 'भारत TWA सीमा',
    'Keep the patch clean, dry, and visible.': 'पैच के साफ, सूखा आ साफ दिखाई देत राखीं।', 'Place the full patch inside the camera frame after your shift.': 'शिफ्ट के बाद पूरा पैच कैमरा फ्रेम में रखीं।',
    'Use even light and hold the phone steady.': 'बराबर रोशनी में फोन स्थिर राखीं।', 'If the band is invalid, replace it and tell your supervisor.': 'बैंड अमान्य होखे त बदलीं आ सुपरवाइजर के बताईं।',
    'Indian factory H₂S safety guidance': 'भारतीय कारखाना H₂S सुरक्षा मार्गदर्शन', 'Indian factory H₂S reference': 'भारतीय कारखाना H₂S संदर्भ', '8-hour TWA limit': '8 घंटा के TWA सीमा', '15-minute STEL': '15 मिनट के STEL सीमा', 'Schedule II reference': 'अनुसूची II संदर्भ',
    'This wristband estimates cumulative exposure. It cannot measure instantaneous peaks or establish legal compliance. Follow your site’s H₂S procedure and supervisor instructions.': 'ई कलाईबैंड कुल एक्सपोजर के अनुमान लगावेला। ई अचानक बढ़ल स्तर ना नाप सकेला आ कानूनी पालन तय ना करे। अपना साइट के H₂S प्रक्रिया आ सुपरवाइजर के निर्देश मानीं।',
    'Know the H₂S hazards and the safety measures for your work area.': 'अपना काम के जगह पर H₂S के खतरा आ सुरक्षा उपाय जान लीं।', 'Follow your factory’s safe work instructions, training, supervision, ventilation, and PPE requirements.': 'कारखाना के सुरक्षित काम के निर्देश, ट्रेनिंग, निगरानी, वेंटिलेशन आ PPE के नियम मानीं।',
    'If an alarm or warning appears, stop work, move to fresh air, and inform your supervisor.': 'अलार्म भा चेतावनी मिले त काम रोक दीं, ताजा हवा में जाईं आ सुपरवाइजर के बताईं।', 'Do not enter or attempt rescue in a gas-affected area unless trained, authorised, and using the required protective equipment.': 'गैस वाला इलाका में तबले मत जाईं आ बचाव मत करीं जबले ट्रेनिंग आ अधिकार ना होखे आ जरूरी सुरक्षा सामान ना पहिरले होखीं।',
    'Reference: India Factories Act Schedule II lists H₂S at 10 ppm for 8-hour TWA and 15 ppm for 15-minute STEL. Use your site gas detector and emergency plan for immediate hazards.': 'संदर्भ: भारत के कारखाना अधिनियम के अनुसूची II में H₂S खातिर 8 घंटा TWA सीमा 10 ppm आ 15 मिनट STEL सीमा 15 ppm बा। तुरंत खतरा में साइट गैस डिटेक्टर आ आपातकालीन योजना इस्तेमाल करीं।', 'VALID': 'मान्य', 'HIGH': 'ज्यादा', 'ELEVATED': 'बढ़ल', 'RESCAN': 'फेरु स्कैन',
  },
  'mr-IN': {
    'Shift duration': 'शिफ्टचा कालावधी', '8 hours': '8 तास', 'Wristband status': 'रिस्टबँड स्थिती', 'Not scanned': 'स्कॅन केलेले नाही', 'Wristband manual': 'रिस्टबँड मार्गदर्शक', 'Safety guidelines': 'सुरक्षा मार्गदर्शक', 'Close': 'बंद करा', 'India TWA limit': 'भारत TWA मर्यादा',
    'Keep the patch clean, dry, and visible.': 'पॅच स्वच्छ, कोरडा आणि दिसेल असा ठेवा।', 'Place the full patch inside the camera frame after your shift.': 'शिफ्टनंतर पूर्ण पॅच कॅमेरा फ्रेममध्ये ठेवा।', 'Use even light and hold the phone steady.': 'समान प्रकाशात फोन स्थिर ठेवा।', 'If the band is invalid, replace it and tell your supervisor.': 'बँड अमान्य असल्यास बदला आणि पर्यवेक्षकाला सांगा।',
    'Indian factory H₂S safety guidance': 'भारतीय कारखाना H₂S सुरक्षा मार्गदर्शक', 'Indian factory H₂S reference': 'भारतीय कारखाना H₂S संदर्भ', '8-hour TWA limit': '८ तासांची TWA मर्यादा', '15-minute STEL': '१५ मिनिटांची STEL मर्यादा', 'Schedule II reference': 'अनुसूची II संदर्भ',
    'This wristband estimates cumulative exposure. It cannot measure instantaneous peaks or establish legal compliance. Follow your site’s H₂S procedure and supervisor instructions.': 'हा रिस्टबँड एकूण एक्सपोजरचा अंदाज देतो. तो अचानक वाढलेले स्तर मोजू शकत नाही किंवा कायदेशीर पालन ठरवू शकत नाही. साइटची H₂S प्रक्रिया आणि सुपरवायझरच्या सूचनांचे पालन करा.',
    'Know the H₂S hazards and the safety measures for your work area.': 'तुमच्या कामाच्या ठिकाणी H₂S चे धोके आणि सुरक्षा उपाय जाणून घ्या.', 'Follow your factory’s safe work instructions, training, supervision, ventilation, and PPE requirements.': 'कारखान्याच्या सुरक्षित कामाच्या सूचना, प्रशिक्षण, देखरेख, वायुवीजन आणि PPE आवश्यकतांचे पालन करा.',
    'If an alarm or warning appears, stop work, move to fresh air, and inform your supervisor.': 'अलार्म किंवा इशारा दिसल्यास काम थांबवा, ताजी हवा असलेल्या ठिकाणी जा आणि सुपरवायझरला सांगा.', 'Do not enter or attempt rescue in a gas-affected area unless trained, authorised, and using the required protective equipment.': 'प्रशिक्षण, अधिकृत परवानगी आणि आवश्यक सुरक्षा उपकरणांशिवाय गॅस प्रभावित क्षेत्रात प्रवेश करू नका किंवा बचावाचा प्रयत्न करू नका.',
    'Reference: India Factories Act Schedule II lists H₂S at 10 ppm for 8-hour TWA and 15 ppm for 15-minute STEL. Use your site gas detector and emergency plan for immediate hazards.': 'संदर्भ: भारताच्या कारखाना अधिनियमाच्या अनुसूची II मध्ये H₂S साठी ८ तासांची TWA मर्यादा १० ppm आणि १५ मिनिटांची STEL मर्यादा १५ ppm आहे. तातडीच्या धोक्यासाठी साइट गॅस डिटेक्टर आणि आपत्कालीन योजना वापरा.', 'VALID': 'वैध', 'HIGH': 'उच्च', 'ELEVATED': 'वाढलेले', 'RESCAN': 'पुन्हा स्कॅन',
  },
  'kn-IN': {
    'Shift duration': 'ಶಿಫ್ಟ್ ಅವಧಿ', '8 hours': '8 ಗಂಟೆಗಳು', 'Wristband status': 'ಕೈಪಟ್ಟಿ ಸ್ಥಿತಿ', 'Not scanned': 'ಸ್ಕ್ಯಾನ್ ಮಾಡಿಲ್ಲ', 'Wristband manual': 'ಕೈಪಟ್ಟಿ ಮಾರ್ಗದರ್ಶಿ', 'Safety guidelines': 'ಸುರಕ್ಷತಾ ಮಾರ್ಗಸೂಚಿಗಳು', 'Close': 'ಮುಚ್ಚಿ', 'India TWA limit': 'ಭಾರತದ TWA ಮಿತಿ',
    'Keep the patch clean, dry, and visible.': 'ಪ್ಯಾಚ್ ಅನ್ನು ಸ್ವಚ್ಛವಾಗಿ, ಒಣಗಿಸಿ ಮತ್ತು ಕಾಣುವಂತೆ ಇರಿಸಿ.', 'Place the full patch inside the camera frame after your shift.': 'ಶಿಫ್ಟ್ ನಂತರ ಸಂಪೂರ್ಣ ಪ್ಯಾಚ್ ಅನ್ನು ಕ್ಯಾಮೆರಾ ಫ್ರೇಮ್‌ನಲ್ಲಿ ಇರಿಸಿ.', 'Use even light and hold the phone steady.': 'ಸಮ ಬೆಳಕಿನಲ್ಲಿ ಫೋನ್ ಅನ್ನು ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ.', 'If the band is invalid, replace it and tell your supervisor.': 'ಬ್ಯಾಂಡ್ ಅಮಾನ್ಯವಾದರೆ ಬದಲಿಸಿ ಮತ್ತು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    'Indian factory H₂S safety guidance': 'ಭಾರತೀಯ ಕಾರ್ಖಾನೆ H₂S ಸುರಕ್ಷತಾ ಮಾರ್ಗದರ್ಶನ', 'Indian factory H₂S reference': 'ಭಾರತೀಯ ಕಾರ್ಖಾನೆ H₂S ಉಲ್ಲೇಖ', '8-hour TWA limit': '8 ಗಂಟೆಗಳ TWA ಮಿತಿ', '15-minute STEL': '15 ನಿಮಿಷಗಳ STEL ಮಿತಿ', 'Schedule II reference': 'ಅನುಸೂಚಿ II ಉಲ್ಲೇಖ',
    'This wristband estimates cumulative exposure. It cannot measure instantaneous peaks or establish legal compliance. Follow your site’s H₂S procedure and supervisor instructions.': 'ಈ ಕೈಪಟ್ಟಿಯು ಒಟ್ಟು ಎಕ್ಸ್‌ಪೋಸರ್ ಅನ್ನು ಅಂದಾಜಿಸುತ್ತದೆ. ಇದು ತಕ್ಷಣದ ಗರಿಷ್ಠ ಮಟ್ಟವನ್ನು ಅಳೆಯಲು ಅಥವಾ ಕಾನೂನು ಪಾಲನೆಯನ್ನು ನಿರ್ಧರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಸೈಟ್‌ನ H₂S ವಿಧಾನ ಮತ್ತು ಮೇಲ್ವಿಚಾರಕರ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ.',
    'Know the H₂S hazards and the safety measures for your work area.': 'ನಿಮ್ಮ ಕೆಲಸದ ಪ್ರದೇಶದಲ್ಲಿನ H₂S ಅಪಾಯಗಳು ಮತ್ತು ಸುರಕ್ಷತಾ ಕ್ರಮಗಳನ್ನು ತಿಳಿದುಕೊಳ್ಳಿ.', 'Follow your factory’s safe work instructions, training, supervision, ventilation, and PPE requirements.': 'ಕಾರ್ಖಾನೆಯ ಸುರಕ್ಷಿತ ಕೆಲಸದ ಸೂಚನೆಗಳು, ತರಬೇತಿ, ಮೇಲ್ವಿಚಾರಣೆ, ಗಾಳಿಯಾಟ ಮತ್ತು PPE ಅಗತ್ಯಗಳನ್ನು ಅನುಸರಿಸಿ.',
    'If an alarm or warning appears, stop work, move to fresh air, and inform your supervisor.': 'ಅಲಾರಂ ಅಥವಾ ಎಚ್ಚರಿಕೆ ಕಂಡುಬಂದರೆ ಕೆಲಸ ನಿಲ್ಲಿಸಿ, ತಾಜಾ ಗಾಳಿಗೆ ಹೋಗಿ ಮತ್ತು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.', 'Do not enter or attempt rescue in a gas-affected area unless trained, authorised, and using the required protective equipment.': 'ತರಬೇತಿ, ಅನುಮತಿ ಮತ್ತು ಅಗತ್ಯ ಸುರಕ್ಷತಾ ಸಾಧನಗಳಿಲ್ಲದೆ ಅನಿಲದಿಂದ ಪ್ರಭಾವಿತ ಪ್ರದೇಶಕ್ಕೆ ಪ್ರವೇಶಿಸಬೇಡಿ ಅಥವಾ ರಕ್ಷಣೆಗೆ ಪ್ರಯತ್ನಿಸಬೇಡಿ.',
    'Reference: India Factories Act Schedule II lists H₂S at 10 ppm for 8-hour TWA and 15 ppm for 15-minute STEL. Use your site gas detector and emergency plan for immediate hazards.': 'ಉಲ್ಲೇಖ: ಭಾರತದ ಕಾರ್ಖಾನೆಗಳ ಕಾಯಿದೆಯ ಅನುಸೂಚಿ II ನಲ್ಲಿ H₂S ಗೆ 8 ಗಂಟೆಗಳ TWA ಮಿತಿ 10 ppm ಮತ್ತು 15 ನಿಮಿಷಗಳ STEL ಮಿತಿ 15 ppm ಎಂದು ನಮೂದಿಸಲಾಗಿದೆ. ತಕ್ಷಣದ ಅಪಾಯಗಳಿಗೆ ಸೈಟ್ ಗ್ಯಾಸ್ ಡಿಟೆಕ್ಟರ್ ಮತ್ತು ತುರ್ತು ಯೋಜನೆಯನ್ನು ಬಳಸಿ.', 'VALID': 'ಮಾನ್ಯ', 'HIGH': 'ಹೆಚ್ಚು', 'ELEVATED': 'ಹೆಚ್ಚಿದ', 'RESCAN': 'ಮತ್ತೆ ಸ್ಕ್ಯಾನ್',
  },
};

const memoryCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();
const CACHE_NAMESPACE = 'sarvam-ui-v1';

function cacheKey(input: string, language: AppLanguage): string {
  return `${CACHE_NAMESPACE}:${language}:${encodeURIComponent(input)}`;
}

function notifyTranslationReady() {
  listeners.forEach(listener => listener());
}

/** Subscribe UI hooks so cached translations immediately repaint the screen. */
export function subscribeToTranslationUpdates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Synchronous read used while React renders. Falls back to the English source. */
export function getCachedUiText(input: string, language: AppLanguage): string {
  if (language === 'en-IN') return input;
  return offlinePhrases[language]?.[input] ?? memoryCache.get(cacheKey(input, language)) ?? input;
}

export function translateUi(key: TranslationKey, language: AppLanguage, fallback: string): string {
  return copy[language][key] ?? fallback;
}

export function isSarvamConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_SARVAM_API_KEY);
}

export async function translateWithSarvam(input: string, targetLanguage: AppLanguage): Promise<string> {
  if (targetLanguage === 'en-IN') return input;
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

/**
 * Fetch one phrase at most once per language. Disk cache is checked first,
 * then Sarvam is used only for a cache miss. Bhojpuri remains local because it
 * is not in Sarvam Translate's listed target languages.
 */
export async function ensureCachedTranslation(input: string, targetLanguage: AppLanguage): Promise<string> {
  if (!input || targetLanguage === 'en-IN') return input;
  const key = cacheKey(input, targetLanguage);
  const memoryValue = memoryCache.get(key);
  if (memoryValue) return memoryValue;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const saved = await getCachedTranslation(key);
    if (saved) {
      memoryCache.set(key, saved);
      notifyTranslationReady();
      return saved;
    }

    // Do not make an API call when a supported offline safety translation is
    // already supplied by the app, or where Sarvam has no language support.
    const offline = offlinePhrases[targetLanguage]?.[input];
    if (offline) return offline;
    if (targetLanguage === 'bho-IN' || !isSarvamConfigured()) return input;

    const translated = await translateWithSarvam(input, targetLanguage);
    memoryCache.set(key, translated);
    await saveCachedTranslation(key, targetLanguage, input, translated);
    notifyTranslationReady();
    return translated;
  })().catch(() => input).finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

/** Warm only common, short UI phrases after a language change. */
export async function warmTranslationCache(language: AppLanguage, phrases: string[]): Promise<void> {
  if (language === 'en-IN' || language === 'bho-IN' || !isSarvamConfigured()) return;
  // Small batches avoid a burst of API calls while still making page changes feel instant.
  for (let index = 0; index < phrases.length; index += 3) {
    await Promise.all(phrases.slice(index, index + 3).map(phrase => ensureCachedTranslation(phrase, language)));
  }
}

export async function translateOrFallback(input: string, targetLanguage: AppLanguage, fallback: string): Promise<string> {
  try {
    return await translateWithSarvam(input, targetLanguage);
  } catch {
    return fallback;
  }
}
