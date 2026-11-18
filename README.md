# 北海道粉雪 / Hokkaido Powder

二世谷风格的浏览器滑雪游戏：挂雪的冷杉、压过的雪道，以及山谷对面的羊蹄山。Vite + Three.js。默认是低角度的桃色日落，按 N 切到夜间滑行。

A browser ski game on a Niseko-style mountain: snow-loaded firs, a corduroy piste, and Mt. Yotei across the valley. Vite and Three.js. The default light is a low peach sunset; N switches to night skiing.

## 本地运行 / Run locally

需要 Node.js 20 或更新版本。

Node.js 20 or newer.

```bash
npm ci
npm run dev
```

打开 [http://127.0.0.1:4731](http://127.0.0.1:4731)。手机请横屏。倾斜机身转弯，或点左右雪面；下方三个键是俯身、刹车、跳跃。

Open [http://127.0.0.1:4731](http://127.0.0.1:4731). Hold the phone in landscape. Tilt to turn, or tap the snow on either side. The three buttons are tuck, brake, and jump.

| 键 / Key | 动作 / Action |
| --- | --- |
| A / ← | 左转 / Carve left |
| D / → | 右转 / Carve right |
| W / ↑ | 俯身 / Tuck |
| S / ↓ | 刹车 / Brake |
| Space | 跳跃 / Jump |
| N | 日间 / 夜间 / Day or night |
| M | 下雪开关 / Toggle snowfall |
| Enter | 开始，或再滑一次 / Start, or ski again |

穿过红白旗门，收集雪花和北狐，躲开树和石头。雪道大约两公里。画质可在设置里切「极致 / 细腻 / 流畅」。

Pass the red-and-white gates, collect snowflakes and Ezo foxes, and stay off the trees and rocks. The course is about two kilometers. Quality in settings is 极致 / 细腻 / 流畅 (high / medium / low).

静态站点：

Static site:

```bash
npm run build
npm run preview
```

`dist/` 必须通过 HTTP 打开。直接用 `file://` 打开 `index.html` 不行。

`dist/` has to be served over HTTP. Opening `index.html` as a `file://` URL will not work.

物理检查（不打开浏览器）：`npm run sim`。

Headless physics check: `npm run sim`.

## iOS 云端打包 / Cloud build for iOS

没有 Mac 也可以打包。仓库里有两条流水线，都从干净克隆执行同一组命令：

You do not need a Mac. Two pipelines are in the repo. Both start from a clean clone and run the same commands:

```bash
npm ci
npm run build
npx cap sync ios
```

- **Codemagic（推荐 / recommended）。** 用 GitHub 登录 [codemagic.io](https://codemagic.io)，加入这个仓库。在 Team settings → Integrations → App Store Connect 添加 API 密钥，集成名字必须是 `HokkaidoPowder`。然后跑工作流 `ios-testflight`。配置在 `codemagic.yaml`。
- **GitHub Actions。** `.github/workflows/ios-testflight.yml` 在 `macos-15` 上用 fastlane 签名并上传 TestFlight，不用 match。在仓库 Secrets 里放 `ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_KEY_P8_BASE64`、`ASC_TEAM_ID`。

`.p8` 密钥、证书和描述文件不要提交。`.gitignore` 已排除 `*.p8`、`*.p12`、`*.mobileprovision`、`.env`，以及 `node_modules`、`dist`、`ios/App/Pods`。

Do not commit the `.p8` key, certificates, or provisioning profiles. `.gitignore` excludes `*.p8`, `*.p12`, `*.mobileprovision`, `.env`, plus `node_modules`, `dist`, and `ios/App/Pods`.

Bundle ID 是 `com.tongshan.hokkaidoski`，只支持横屏。完整的中文步骤（注册开发者、建 App、做 API 密钥、看 TestFlight）在 `docs/IOS_RELEASE_中文.md`。

The bundle id is `com.tongshan.hokkaidoski`, landscape only. The full Chinese walkthrough (developer account, App Store Connect app, API key, TestFlight) is `docs/IOS_RELEASE_中文.md`.

## 素材 / Assets

除非另注，均为 CC0。不要求署名的也写在这里。

CC0 unless noted. Credit is included even where the license does not require it.

- Quaternius, Stylized Nature MegaKit — pines. [quaternius.com](https://quaternius.com)
- Kenney, Holiday Kit — snow trees and cabin pieces. [kenney.nl](https://kenney.nl)
- Kay Lousberg, KayKit Adventurers — rigged skier. [kaylousberg.com](https://kaylousberg.com)
- Fox model by PixelMannen (CC0). Rigging and glTF conversion by tomkranis (CC-BY 4.0), via the Khronos glTF sample models.
- Poly Haven — `qwantani_sunset` HDRI (Greg Zaal, CC0). [polyhaven.com](https://polyhaven.com)
