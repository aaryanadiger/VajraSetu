import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const appJson = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8'));
const dependencies = packageJson.dependencies ?? {};
const plugins = appJson.expo?.plugins ?? [];
const pluginNames = plugins.map(plugin => Array.isArray(plugin) ? plugin[0] : plugin);
const androidPermissions = appJson.expo?.android?.permissions ?? [];

const checks = [
  ['native OpenCV dependency', Boolean(dependencies['react-native-fast-opencv'])],
  ['Expo development client', Boolean(dependencies['expo-dev-client']) && pluginNames.includes('expo-dev-client')],
  ['camera dependency and config plugin', Boolean(dependencies['expo-camera']) && pluginNames.includes('expo-camera')],
  ['iOS camera permission text', pluginNames.includes('expo-camera')],
  ['Android camera permission', androidPermissions.includes('android.permission.CAMERA')],
  ['Android microphone permission is absent', !androidPermissions.includes('android.permission.RECORD_AUDIO')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
  failed ||= !passed;
}

if (failed) process.exitCode = 1;
