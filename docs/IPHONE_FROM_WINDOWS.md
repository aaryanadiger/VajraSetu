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
sudo apt-get install -y usbmuxd libimobiledevice-utils curl ca-certificates libfuse2 unzip zip
sudo service usbmuxd start
idevicepair pair
ideviceinfo -k DeviceName
```

Tap **Trust** on the phone and enter its passcode when prompted; rerun pairing
if needed. Some Ubuntu versions call the FUSE package `libfuse2t64`; use that
name if `libfuse2` is unavailable. If USB pairing fails, consult xtool's
documented Windows/iTunes relay workaround linked in its installation guide.

Keep an Ubuntu terminal open during attachment and installation. WSL can shut
down when no interactive command remains, dropping the USB attachment even
when a Linux service was running.

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

## Verified installation on this Windows PC — 31 October 2026

The cloud-built IPA was successfully signed, installed, and verified by
xtool 1.24.0 on the connected iPhone, which reported iOS 27.2. Ubuntu 26.04
and the native tools were installed through WSL. Apple login was completed
interactively in a Windows Terminal using the Ubuntu `root` account.
Physical app launch and scanner operation still require confirmation on the
phone; an installation success does not establish those results.

Direct USBIPD attachment paired successfully but stalled at `[Connecting]`.
Linux usbmuxd logged a device message exceeding its maximum packet size.
The working route uses Apple's **Windows** Mobile Device Service instead:

1. Keep the phone connected to Windows, with USBIPD detached.
2. Run Apple Mobile Device Service. Its standalone, Apple-signed
   `AppleMobileDeviceSupport64.msi` was extracted from Apple's iTunes
   installer and installed separately because the initial iTunes install
   did not install that component.
3. Relay TCP port 27015 from the Windows WSL interface to
   `127.0.0.1:27015`. The firewall rule `VajraSetu-WSL-AppleUSB` permits only
   the WSL interface/subnet. At setup time the gateway was `172.20.0.1`
   and the subnet was `172.20.0.0/20`.
4. In **Windows PowerShell**, use the same Ubuntu account and relay for
   subsequent signing refreshes:

   ```powershell
   wsl -d Ubuntu -u root --exec env USBMUXD_SOCKET_ADDRESS=172.20.0.1:27015 xtool install --usb /mnt/c/Users/Aarya/Documents/ChatGPT/vajrasetu/build/VajraSetu-unsigned.ipa
   ```

WSL's gateway can change after a restart. Check it with
`wsl -d Ubuntu -u root --exec ip route show default` before reusing this
command; if changed, update the Windows relay and its scoped firewall rule
as well. Do not attach the phone to USBIPD while using the Windows relay.
The relay follows [xtool's documented Windows workaround](https://github.com/xtool-org/xtool/issues/19#issuecomment-2898986718).
