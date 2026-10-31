# Install VajraSetu on your iPhone from Windows

## Build and signing design

VajraSetu uses Expo SDK 57 / React Native 0.86, CocoaPods, native OpenCV,
Expo Camera, and SQLite. `xtool dev` builds SwiftPM projects; it does not build
this React Native workspace. Preserve the existing app and use:

1. GitHub Actions on macOS with Xcode to compile a **Release device IPA**.
2. `xtool install` in Windows Subsystem for Linux (WSL) to sign the IPA with
   your free Apple account and install it over USB.

The build includes JavaScript and assets. After installation, Metro and your
computer are unnecessary for normal app use. The optional translation proxy
still needs connectivity; bundled translations work offline.

No Apple account credentials or signing certificates are needed on GitHub.
The IPA artifact is unsigned and cannot be installed by opening it in Safari.
The existing EAS preview/TestFlight routes require paid Apple membership;
they are not the free-account route documented here.

## 1. Build or download the IPA

Open the repository's **Actions → Build iPhone IPA** workflow. Select the
branch containing this workflow, then **Run workflow**. The setup branch
`codex/iphone-cloud-build` also builds when pushed.

Until the workflow has been merged into the default branch, GitHub may hide
the manual run button. Open the existing push-triggered run and use **Re-run
all jobs**, or push an update to the setup branch. Merging the workflow into
`main` makes the manual button available for future builds.

When the run succeeds, download the `VajraSetu-iPhone-<commit>` artifact and
extract it on Windows. It contains:

- `VajraSetu-unsigned.ipa`
- `build-info.txt`, including minimum iOS version, toolchain, and SHA-256

Check that your iPhone meets the minimum iOS version in `build-info.txt`.
The separate build-log artifact helps diagnose compilation failures. Build
success is not proof of camera/OpenCV behavior on a physical iPhone.

## 2. Set up WSL and USB access once

This computer did not have WSL installed when this workflow was prepared.
In **Administrator PowerShell**, run:

```powershell
wsl --install -d Ubuntu
winget install --interactive --exact dorssel.usbipd-win
```

Restart Windows if prompted. Open Ubuntu to finish creating its local user.
Keep Ubuntu running during USB attachment.

Connect and unlock the iPhone with a data-capable cable. In Administrator
PowerShell, find its actual BUSID and bind it:

```powershell
usbipd list
usbipd bind --busid <IPHONE-BUSID>
```

Then, in ordinary PowerShell:

```powershell
usbipd attach --wsl --busid <IPHONE-BUSID>
```

Replace the angle-bracket placeholder with the iPhone BUSID from `usbipd list`.
Binding needs administrator rights; attachment generally does not. While
attached to WSL, the USB device is unavailable to Windows apps. After a cable
reconnect you may need to repeat `attach`.

In **Ubuntu**:

```bash
sudo apt-get update
sudo apt-get install -y usbmuxd libimobiledevice-utils curl ca-certificates libfuse2
sudo service usbmuxd start
idevicepair pair
ideviceinfo -k DeviceName
```

Tap **Trust** on the phone and enter its passcode when prompted; rerun pairing
if needed. Some Ubuntu versions call the FUSE package `libfuse2t64`; use that
name if `libfuse2` is unavailable. If USB pairing fails, consult xtool's
documented Windows/iTunes relay workaround linked in its installation guide.

## 3. Install xtool and authenticate locally

In Ubuntu, download the official Linux AppImage for your WSL architecture:

```bash
mkdir -p ~/.local/bin
curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o ~/.local/bin/xtool
chmod +x ~/.local/bin/xtool
export PATH="$HOME/.local/bin:$PATH"
xtool --help
xtool auth --help
xtool auth login --help
xtool auth login --mode password
```

Choose **Password** authentication for a free account and complete Apple's
2FA locally. Do not paste passwords, 2FA codes, or account tokens into the chat
or GitHub. xtool documents that password login uses private Apple APIs, so
Apple-side changes can affect it.
If xtool reports that no development team exists, sign into the Apple
Developer website with that account and accept its developer agreement first.

This route uses `xtool install`, not `xtool dev`. The Swift compiler and
Xcode.xip SDK extraction are needed for xtool's Swift compilation workflow;
this project's compilation already ran on GitHub. If an xtool release changes
the CLI, follow its `auth --help` and `install --help` output.

## 4. Sign and install the downloaded build

Assuming the extracted IPA is in `C:\Users\Aarya\Downloads`, run in Ubuntu:

```bash
xtool devices
xtool install /mnt/c/Users/Aarya/Downloads/VajraSetu-unsigned.ipa
```

Adjust the path if you extracted the artifact into a subfolder. xtool registers
the phone, provisions/signs the app for the selected Apple team, and installs
it. Review any prompt about revoking an existing development certificate,
since that can affect other apps signed with it.

On the iPhone:

1. Enable **Settings → Privacy & Security → Developer Mode**, restart, and
   confirm if requested.
2. If iOS reports an untrusted developer, open **Settings → General → VPN &
   Device Management → your developer account → Trust**.
3. Open VajraSetu and allow camera access.
4. Create your local worker profile. Check scanning, history, and CSV sharing.
5. Turn on airplane mode, reopen the app, and verify local operation.

You do not need to start Expo/Metro for this Release build. Do not use Expo Go
to test the native scanner. Follow the physical-device checklist in
[DEVELOPMENT.md](DEVELOPMENT.md) before relying on scanner behavior.

## 5. Refresh the free-account signing

Apple Personal Team provisioning profiles expire after **7 days**. Keep the
IPA and rerun `xtool install` with the same account before/after expiry. A new
cloud build is needed only for code/native dependency changes. Keep the same
signing identity/team and avoid uninstalling the app to preserve device-local
records; export CSV before changing signing or reinstalling. Free accounts also
have App ID/device limits. TestFlight/App Store distribution requires paid
membership.

After installation, release USB back to Windows with:

```powershell
usbipd detach --busid <IPHONE-BUSID>
```

## Official references

- [xtool Linux/Windows installation](https://github.com/xtool-org/xtool/blob/main/Documentation/xtool.docc/Installation-Linux.md)
- [xtool IPA install command](https://github.com/xtool-org/xtool/blob/main/Sources/XToolSupport/InstallCommand.swift)
- [xtool integrated signing/installation](https://github.com/xtool-org/xtool/blob/main/Sources/XKit/Integration/IntegratedInstaller.swift)
- [Microsoft WSL USB setup](https://learn.microsoft.com/en-us/windows/wsl/connect-usb)
- [Apple Personal Team limits](https://developer.apple.com/support/compare-memberships/)
