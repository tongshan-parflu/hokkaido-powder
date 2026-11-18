# 把《北海道粉雪》送到 App Store（没有 Mac 也能做）

云端构建从一份干净的克隆开始，不需要你本机先装好依赖：

```bash
git clone <这个仓库>
cd <仓库目录>
npm ci
npm run build
npx cap sync ios
```

这三步在 Codemagic 和 GitHub Actions 里也会原样执行。`npm ci` 必须成功，所以依赖都锁在 `package-lock.json` 里。



你不需要自己的 Mac。打包、签名、上传 TestFlight 都在云端完成。你需要的是一个 Apple 开发者账号，和下面这份密钥。

应用信息（已写在工程里，以后想改就改 `capacitor.config.json`）：

- 名称：北海道粉雪（英文名 Hokkaido Powder）
- Bundle ID：`com.tongshan.hokkaidoski`
- 方向：只能横屏
- 隐私：不收集数据。商店隐私标签选 Data Not Collected。政策页是包内的 `privacy.html`。

商店文案在 `store/listing.md`。年龄说明在 `store/age-rating.md`。截图在 `store/screenshots/`。

## 1. 注册 Apple Developer

1. 打开 https://developer.apple.com/programs/enroll/ ，用你的 Apple ID 登录。
2. 选个人注册。付年费（目前是 99 美元）。
3. 等审核通过。个人账号通常当天到两天。通过之前，后面的步骤做不了。

## 2. 在 App Store Connect 里建立 App

1. 打开 https://appstoreconnect.apple.com/apps ，点加号，选「新建 App」。
2. 平台选 iOS。名称填 `北海道粉雪`。主要语言选简体中文。
3. 套装 ID 选 `com.tongshan.hokkaidoski`。如果列表里没有，先到 https://developer.apple.com/account/resources/identifiers/list 新建一个 App ID，Bundle ID 就填这个，然后回到这里刷新。
4. SKU 可以填 `hokkaido-powder`。用户看不到。
5. 建好先不要提交审核。等 TestFlight 里有包了再填商店资料。

## 3. 做一把 App Store Connect API 密钥

这把钥匙让云端电脑替你签名，你不用把 Apple ID 密码交给任何人。

1. 打开 https://appstoreconnect.apple.com/access/integrations/api 。
2. 如果还没有团队密钥权限，先接受协议。
3. 点「生成 API 密钥」。名字写 `Codemagic`。访问权限选 **App 管理**（Admin）。
4. 下载只会出现一次的 `.p8` 文件。同时抄下两行字：
   - Issuer ID（页面上方一长串）
   - Key ID（密钥那一行的 10 位字符）
5. `.p8` 丢了不能再下，只能作废重做。把它存进密码管理器。

## 4. 用 Codemagic 打包并送到 TestFlight（推荐）

仓库里的 `codemagic.yaml` 已经写好这条流水线：安装依赖、构建网页、同步 iOS 工程、用这把 API 密钥自动签名、打出 IPA、上传 TestFlight。

1. 打开 https://codemagic.io ，用 GitHub 登录，把这个仓库加进去。
2. 左边选 Team settings → Integrations → App Store Connect，点 Add key。
3. 填 Issuer ID、Key ID，上传 `.p8`。集成的名字必须叫 **HokkaidoPowder**，和 `codemagic.yaml` 里写的一样。
4. 回到应用，选工作流 `ios-testflight`，点 Start new build。
5. 第一次构建会在 Apple 那边申请分发证书和描述文件，大约 15 到 40 分钟。
6. 成功后，到 App Store Connect → TestFlight。处理完（几分钟到一小时）就能邀请自己安装。
7. iPhone 上安装 TestFlight，登录同一个 Apple ID，安装《北海道粉雪》。横屏打开就能滑。

构建失败时，先看 Codemagic 日志最后几十行。常见原因：Bundle ID 和 App Store Connect 里的不一致、API 密钥权限不是 Admin、协议没点同意。

## 5. 也可以用 GitHub Actions

`.github/workflows/ios-testflight.yml` 做同样的事，跑在 GitHub 的 macOS 机器上，用 fastlane，不使用 match。

在仓库 Settings → Secrets and variables → Actions 里添加：

| 名字 | 内容 |
| --- | --- |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | 把 `.p8` 做 base64 之后的一整行。没有 Mac 时，用 https://www.base64encode.org 把文件内容编码，不要换行。 |
| `ASC_TEAM_ID` | 开发者网站「会员资格」页上的 Team ID，10 位字母数字。 |

然后到 Actions 页，选 iOS TestFlight，点 Run workflow。

## 6. 提交审核

1. TestFlight 里这个版本状态变成「可以提交」之后，回到 App 的「App Store」页。
2. 版本号填 `1.0`。把 `store/listing.md` 里的中文名称、副标题、关键词、描述、推广文本贴进去。英文另做一套本地化。
3. 截图：6.9 英寸用 `store/screenshots/6.9/`，6.5 英寸用 `store/screenshots/6.5/`。都是横屏。
4. 隐私政策网址填你已经发布的网页，路径加上 `privacy.html`。隐私问卷全部答「不收集数据」。
5. 年龄分级按 `store/age-rating.md` 选 4+。分类选游戏，子类体育或竞速。
6. 构建版本选刚才 TestFlight 的那个包。出口合规选「否」（没有自写加密，只用系统 HTTPS）。
7. 点提交审核。第一次常见被问的是截图和描述是否相符。改完再提交即可。

## 你做不到、也不需要做的事

- 不需要买 Mac，不需要安装 Xcode。
- 不需要在这台电脑上签名。这里的 `ios/` 工程只是给云端打开的。
- 密钥不要写进仓库，不要发给聊天机器人。
