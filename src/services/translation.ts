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
    'Wristband manual': 'कलाईबैंड निर्देश', 'Safety guidelines': 'सुरक्षा दिशा-निर्देश', 'Close': 'बंद करें', 'OSHA ceiling': 'OSHA सीमा',
    'Keep the patch clean, dry, and visible.': 'पैच को साफ, सूखा और दिखाई देने योग्य रखें।',
    'Place the full patch inside the camera frame after your shift.': 'शिफ्ट के बाद पूरे पैच को कैमरा फ्रेम के अंदर रखें।',
    'Use even light and hold the phone steady.': 'समान रोशनी का उपयोग करें और फोन स्थिर रखें।',
    'If the band is invalid, replace it and tell your supervisor.': 'यदि बैंड अमान्य है, तो उसे बदलें और अपने सुपरवाइज़र को बताएं।',
    'OSHA H₂S safety guidelines': 'OSHA H₂S सुरक्षा दिशा-निर्देश',
    'Never rely on the smell of H₂S; it can disable your sense of smell.': 'H₂S की गंध पर कभी भरोसा न करें; इससे आपकी सूंघने की क्षमता खत्म हो सकती है।',
    'If an alarm or warning appears, leave the area and alert your supervisor.': 'अलार्म या चेतावनी दिखे तो इलाका छोड़ें और सुपरवाइज़र को सूचित करें।',
    'Move crosswind or upwind toward fresh air. Do not attempt an untrained rescue.': 'ताज़ी हवा की ओर हवा के पार या हवा के विपरीत जाएं। बिना प्रशिक्षण बचाव का प्रयास न करें।',
    'OSHA general-industry reference: 20 ppm ceiling; 50 ppm peak is a limited 10-minute exception.': 'OSHA सामान्य उद्योग संदर्भ: 20 ppm सीमा; 50 ppm पीक केवल सीमित 10 मिनट का अपवाद है।',
    'VALID': 'मान्य', 'HIGH': 'उच्च', 'ELEVATED': 'बढ़ा हुआ', 'RESCAN': 'फिर स्कैन करें',
  },
  'bho-IN': {
    'Shift duration': 'शिफ्ट के समय', '8 hours': '8 घंटा', 'Wristband status': 'कलाईबैंड के स्थिति', 'Not scanned': 'स्कैन नइखे भइल',
    'Wristband manual': 'कलाईबैंड निर्देश', 'Safety guidelines': 'सुरक्षा निर्देश', 'Close': 'बंद करीं', 'OSHA ceiling': 'OSHA सीमा',
    'Keep the patch clean, dry, and visible.': 'पैच के साफ, सूखा आ साफ दिखाई देत राखीं।', 'Place the full patch inside the camera frame after your shift.': 'शिफ्ट के बाद पूरा पैच कैमरा फ्रेम में रखीं।',
    'Use even light and hold the phone steady.': 'बराबर रोशनी में फोन स्थिर राखीं।', 'If the band is invalid, replace it and tell your supervisor.': 'बैंड अमान्य होखे त बदलीं आ सुपरवाइजर के बताईं।',
    'OSHA H₂S safety guidelines': 'OSHA H₂S सुरक्षा निर्देश', 'Never rely on the smell of H₂S; it can disable your sense of smell.': 'H₂S के गंध पर भरोसा मत करीं; ई सूंघे के ताकत खत्म कर सकेला।',
    'If an alarm or warning appears, leave the area and alert your supervisor.': 'अलार्म भा चेतावनी मिले त इलाका छोड़ीं आ सुपरवाइजर के बताईं।', 'Move crosswind or upwind toward fresh air. Do not attempt an untrained rescue.': 'ताजा हवा दिसा जाईं। बिना ट्रेनिंग बचाव के कोशिश मत करीं।',
    'OSHA general-industry reference: 20 ppm ceiling; 50 ppm peak is a limited 10-minute exception.': 'OSHA संदर्भ: 20 ppm सीमा; 50 ppm पीक सीमित 10 मिनट के अपवाद बा।', 'VALID': 'मान्य', 'HIGH': 'ज्यादा', 'ELEVATED': 'बढ़ल', 'RESCAN': 'फेरु स्कैन',
  },
  'mr-IN': {
    'Shift duration': 'शिफ्टचा कालावधी', '8 hours': '8 तास', 'Wristband status': 'रिस्टबँड स्थिती', 'Not scanned': 'स्कॅन केलेले नाही', 'Wristband manual': 'रिस्टबँड मार्गदर्शक', 'Safety guidelines': 'सुरक्षा मार्गदर्शक', 'Close': 'बंद करा', 'OSHA ceiling': 'OSHA कमाल मर्यादा',
    'Keep the patch clean, dry, and visible.': 'पॅच स्वच्छ, कोरडा आणि दिसेल असा ठेवा।', 'Place the full patch inside the camera frame after your shift.': 'शिफ्टनंतर पूर्ण पॅच कॅमेरा फ्रेममध्ये ठेवा।', 'Use even light and hold the phone steady.': 'समान प्रकाशात फोन स्थिर ठेवा।', 'If the band is invalid, replace it and tell your supervisor.': 'बँड अमान्य असल्यास बदला आणि पर्यवेक्षकाला सांगा।',
    'OSHA H₂S safety guidelines': 'OSHA H₂S सुरक्षा मार्गदर्शक', 'Never rely on the smell of H₂S; it can disable your sense of smell.': 'H₂S च्या वासावर कधीही अवलंबून राहू नका; वास घेण्याची क्षमता कमी होऊ शकते।', 'If an alarm or warning appears, leave the area and alert your supervisor.': 'अलार्म किंवा इशारा आल्यास जागा सोडा आणि पर्यवेक्षकाला सांगा।', 'Move crosswind or upwind toward fresh air. Do not attempt an untrained rescue.': 'ताजी हवा असलेल्या दिशेने जा. प्रशिक्षणाशिवाय बचाव करू नका।', 'OSHA general-industry reference: 20 ppm ceiling; 50 ppm peak is a limited 10-minute exception.': 'OSHA संदर्भ: 20 ppm कमाल; 50 ppm पीक हा मर्यादित 10-मिनिटांचा अपवाद आहे।', 'VALID': 'वैध', 'HIGH': 'उच्च', 'ELEVATED': 'वाढलेले', 'RESCAN': 'पुन्हा स्कॅन',
  },
  'kn-IN': {
    'Shift duration': 'ಶಿಫ್ಟ್ ಅವಧಿ', '8 hours': '8 ಗಂಟೆಗಳು', 'Wristband status': 'ಕೈಪಟ್ಟಿ ಸ್ಥಿತಿ', 'Not scanned': 'ಸ್ಕ್ಯಾನ್ ಮಾಡಿಲ್ಲ', 'Wristband manual': 'ಕೈಪಟ್ಟಿ ಮಾರ್ಗದರ್ಶಿ', 'Safety guidelines': 'ಸುರಕ್ಷತಾ ಮಾರ್ಗಸೂಚಿಗಳು', 'Close': 'ಮುಚ್ಚಿ', 'OSHA ceiling': 'OSHA ಮಿತಿ',
    'Keep the patch clean, dry, and visible.': 'ಪ್ಯಾಚ್ ಅನ್ನು ಸ್ವಚ್ಛವಾಗಿ, ಒಣಗಿಸಿ ಮತ್ತು ಕಾಣುವಂತೆ ಇರಿಸಿ.', 'Place the full patch inside the camera frame after your shift.': 'ಶಿಫ್ಟ್ ನಂತರ ಸಂಪೂರ್ಣ ಪ್ಯಾಚ್ ಅನ್ನು ಕ್ಯಾಮೆರಾ ಫ್ರೇಮ್‌ನಲ್ಲಿ ಇರಿಸಿ.', 'Use even light and hold the phone steady.': 'ಸಮ ಬೆಳಕಿನಲ್ಲಿ ಫೋನ್ ಅನ್ನು ಸ್ಥಿರವಾಗಿ ಹಿಡಿಯಿರಿ.', 'If the band is invalid, replace it and tell your supervisor.': 'ಬ್ಯಾಂಡ್ ಅಮಾನ್ಯವಾದರೆ ಬದಲಿಸಿ ಮತ್ತು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.',
    'OSHA H₂S safety guidelines': 'OSHA H₂S ಸುರಕ್ಷತಾ ಮಾರ್ಗಸೂಚಿಗಳು', 'Never rely on the smell of H₂S; it can disable your sense of smell.': 'H₂S ವಾಸನೆಯನ್ನು ಎಂದಿಗೂ ನಂಬಬೇಡಿ; ಅದು ವಾಸನೆ ಗ್ರಹಿಕೆಯನ್ನು ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಬಹುದು.', 'If an alarm or warning appears, leave the area and alert your supervisor.': 'ಅಲಾರಂ ಅಥವಾ ಎಚ್ಚರಿಕೆ ಬಂದರೆ ಸ್ಥಳವನ್ನು ಬಿಟ್ಟು ಮೇಲ್ವಿಚಾರಕರಿಗೆ ತಿಳಿಸಿ.', 'Move crosswind or upwind toward fresh air. Do not attempt an untrained rescue.': 'ತಾಜಾ ಗಾಳಿಯ ಕಡೆಗೆ ಹೋಗಿ. ತರಬೇತಿಯಿಲ್ಲದೆ ರಕ್ಷಣೆಗೆ ಪ್ರಯತ್ನಿಸಬೇಡಿ.', 'OSHA general-industry reference: 20 ppm ceiling; 50 ppm peak is a limited 10-minute exception.': 'OSHA ಉಲ್ಲೇಖ: 20 ppm ಮಿತಿ; 50 ppm ಗರಿಷ್ಠವು ಸೀಮಿತ 10 ನಿಮಿಷದ ವಿನಾಯಿತಿ.', 'VALID': 'ಮಾನ್ಯ', 'HIGH': 'ಹೆಚ್ಚು', 'ELEVATED': 'ಹೆಚ್ಚಿದ', 'RESCAN': 'ಮತ್ತೆ ಸ್ಕ್ಯಾನ್',
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
