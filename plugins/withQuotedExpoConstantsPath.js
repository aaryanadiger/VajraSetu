const { withPodfile, withXcodeProject } = require('@expo/config-plugins');

const MARKER = '# Vajra Setu: quote Expo Constants script path';
const EXPO_CONSTANTS_PHASE = '[CP-User] Generate app.config for prebuilt Constants.manifest';

/**
 * Expo Constants generates a `bash -c` phase for its app-config script. When
 * the repository path contains a space, the inner command loses its quoting
 * and Xcode tries to execute `/Users/.../Engineering` as the script. Keep the
 * generated phase quoted after every CocoaPods install.
 */
function withQuotedExpoConstantsPath(config) {
  config = withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;
    if (contents.includes(MARKER)) return podfileConfig;

    const postInstallEnd = '\n  end\nend';
    const insertionPoint = contents.lastIndexOf(postInstallEnd);
    if (insertionPoint === -1) {
      throw new Error('Could not find the iOS post_install block for the Expo Constants path fix.');
    }

    const fix = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'EXConstants'

      target.shell_script_build_phases.each do |phase|
        next unless phase.name == '${EXPO_CONSTANTS_PHASE}'

        phase.shell_script = 'bash -l -c "\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\""'
      end
    end
`;

    podfileConfig.modResults.contents = `${contents.slice(0, insertionPoint)}${fix}${contents.slice(insertionPoint)}`;
    return podfileConfig;
  });

  return withXcodeProject(config, (xcodeConfig) => {
    const phases = xcodeConfig.modResults.hash.project.objects.PBXShellScriptBuildPhase;
    const bundlePhase = Object.values(phases).find(
      (phase) => phase && phase.name === '"Bundle React Native code and images"'
    );
    if (!bundlePhase) {
      throw new Error('Could not find the React Native bundle phase for the iOS path fix.');
    }

    const command = "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'";
    const unsafeInvocation = `\`\\"$NODE_BINARY\\" --print \\"${command}\\"\``;
    const safeInvocation = `RN_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"${command}\\")\\"\\n\\"$RN_XCODE_SCRIPT\\"`;
    if (bundlePhase.shellScript.includes(unsafeInvocation)) {
      bundlePhase.shellScript = bundlePhase.shellScript.replace(unsafeInvocation, safeInvocation);
    }

    return xcodeConfig;
  });
}

module.exports = withQuotedExpoConstantsPath;
