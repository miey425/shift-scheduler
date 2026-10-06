# shift-app

## 日ごとの営業時間

シフト期間の詳細画面で、各日を「自動」「定休日」「21時まで」「22時まで」から設定できます。自動では火曜日を定休日にします。それ以外の日は**翌日**が土曜日・日曜日・日本の祝日なら22:00、それ以外なら21:00まで営業します。火曜日も手動で21:00または22:00までの営業に変更できます。祝日の判定には `@holiday-jp/holiday_jp` を使い、判定処理が失敗した場合も曜日に基づいて動作します。祝日ライブラリのデータは更新が必要なため、将来年のシフトを作る際はライブラリを更新してください。

手動設定は `business_day_overrides` に保存します。「自動」に戻すと手動設定を削除し、その日のルールで再計算します。定休日には固定シフトを生成できず、勤務希望もその日の入力欄を表示しません。固定シフトの終了時刻が閉店時刻を超える場合は、生成時に閉店時刻まで短縮します。既存シフトが新しい設定と矛盾する場合、設定変更は拒否されます。先に対象のシフトを削除してください。

DB変更を反映するには `npm run db:migrate` を実行してください。既存のシフトや希望はマイグレーションでは削除されません。

シフト管理アプリのフェーズ1からフェーズ4までの実装です。

フェーズ1では、Next.js、TypeScript、Tailwind CSS、Neon PostgreSQL、Drizzle ORMの土台を用意しました。フェーズ2では、Auth.jsによる管理者ログインと保護された管理画面を追加しました。フェーズ3では、従業員、シフト期間、固定シフト、希望提出、手動割当、Excel出力を実装しました。フェーズ4では、提出された希望をもとに、未割当の固定シフトを自動で補完できるようにしました。

## フェーズ

- フェーズ1: DB接続、Drizzleスキーマ、マイグレーション、シード、READMEを整備します。
- フェーズ2: 管理者ログイン、管理画面保護、管理者ダッシュボードを追加します。
- フェーズ3: 従業員管理、シフト期間管理、固定シフト作成、共通の希望提出URL、手動割当、Excel出力を追加します。
- フェーズ4: 希望提出内容を使った自動割当を追加します。従業員の勤務条件や重複勤務を確認しながら空き枠を埋めます。
- フェーズ5: 自動割当の調整機能を強化します。公平性、連勤制限、店舗独自ルール、警告表示などを追加する想定です。
- フェーズ6: 公開・運用機能を整えます。確定シフトの公開、従業員向け確認画面、通知、バックアップ、権限分けなどを追加する想定です。

## 技術構成

- Next.js App Router
- TypeScript
- Tailwind CSS
- Neon PostgreSQL
- Drizzle ORM
- Drizzle Kit
- Auth.js / NextAuth.js

## セットアップ

依存関係をインストールします。

```bash
npm install
```

環境変数ファイルを作成します。

```bash
cp .env.example .env.local
```

`.env.local` の `DATABASE_URL` にNeonのPostgreSQL接続URLを設定してください。

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB_NAME?sslmode=require
AUTH_SECRET=
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=change-me-before-use
```

接続URLやパスワードはソースコードに直接書かず、必ず `.env.local` で管理します。`.env.local` は `.gitignore` に入っているため、Gitには保存されません。

`AUTH_SECRET` はログインセッションを署名するための秘密鍵です。ローカルでは次のように生成できます。

```bash
openssl rand -base64 32
```

## Neonへの接続

DB接続処理は `src/db/index.ts` にまとめています。

`getDb()` は `DATABASE_URL` を使ってNeonへ接続し、DrizzleのDBインスタンスを返します。画面側のクライアントコンポーネントから直接DBへ接続せず、Server Component、Server Action、Route Handlerなどサーバー側から使う前提です。

接続確認は次のどちらかで行います。

```bash
npm run db:check
```

または開発サーバー起動後に、次のURLを開きます。

```text
http://localhost:3000/api/health/db
```

## 管理者ログイン

管理者認証はAuth.jsのCredentials Providerで実装しています。

```text
src/auth.ts
src/app/api/auth/[...nextauth]/route.ts
src/proxy.ts
src/app/login/page.tsx
src/app/admin/dashboard/page.tsx
```

ログイン時は `admins.email` で管理者を検索し、入力されたパスワードと `admins.password_hash` を `bcryptjs.compare()` で照合します。`is_active` が `false` の管理者はログインできません。

セッションはJWT方式です。DBにはAuth.js用のセッションテーブルを追加していません。理由は、今回のMVPでは既存の `admins` テーブルで管理者だけを認証できれば十分だからです。

管理画面は `/admin/*` 配下です。`src/proxy.ts` で未ログインのアクセスを `/login` へ戻し、`src/app/admin/layout.tsx` でも `auth()` を確認しています。

ログインURL:

```text
http://localhost:3000/login
```

シード管理者の初期値は `.env.local` で変更できます。

```env
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=change-me-before-use
```

## 管理画面

ログイン後、以下の管理画面を使えます。

```text
http://localhost:3000/admin/dashboard
http://localhost:3000/admin/employees
http://localhost:3000/admin/shift-periods
```

### 従業員管理

`/admin/employees` では、従業員の追加、編集、有効化、無効化、削除ができます。

従業員にはメールアドレスを保存しません。従業員はログインしない設計なので、希望提出はシフト期間ごとの共通URLから行います。初回は自分の名前を選んで提出します。「この端末では次回から名前の選択を省略する」を選ぶと、同じブラウザでは次回から名前選択を省略できます。

従業員ごとに、対応可能なポジションも登録できます。ポジション選択肢は `シフト時間割.md` をもとにした固定シフトテンプレートから作っています。`シフト時間割.md` で `**` に囲まれているポジションは、対応可能ポジションの選択肢に出さない前提です。オープンは `ホールC` と `フリー` を除外し、ラストは `ホールラスト` と `D洗い場` だけを選択対象にしています。

従業員を削除すると、その従業員に紐づく希望提出、希望詳細、専用URLトークン、シフト割当も外部キー制約により削除されます。一時的に勤務しない従業員は、削除ではなく無効化を使ってください。

### シフト期間管理

`/admin/shift-periods` では、1週間から2週間のシフト期間を作成できます。

受付中のシフト期間は、一覧画面または詳細画面から締切に変更できます。シフト期間を削除すると、その期間に紐づく固定シフト、希望提出、希望詳細、シフト割当も外部キー制約により削除されます。

各期間の詳細画面では、`シフト時間割.md` に沿って、期間内の各日に固定シフトをまとめて作成できます。平日は平日ランチ・平日ディナー、土曜・日曜は土日祝ランチ・土日祝ディナーとして作成します。

テンプレートには以下の情報を持たせています。

- 平日ランチ
- 平日ディナー
- 土日祝ランチ
- 土日祝ディナー
- 開店作業経験が必要か
- 閉店作業経験が必要か
- 休憩時間
- 予備枠か

固定シフト作成後、各固定シフトに従業員を手動で割り当てられます。必要人数に達した固定シフトには追加割当できません。

固定シフト一覧は日付タブで分かれています。1週間から2週間分の固定シフトをまとめて作成しても、管理者は日付を選んで1日分ずつ確認・割当できます。

固定シフト一覧の `罫線つきExcel` から、Excelで開ける `.xlsx` 形式をダウンロードできます。罫線つきExcelは、日別に `氏名 / ポジション / 予定時間 / 出勤 / 退勤 / 8:00〜23:00の時間グリッド` を黒い罫線で囲んだシフト表形式で出力します。時間グリッドでは勤務時間を青、休憩時間を薄い黄色で表示します。

詳細画面の `希望提出URL` には、シフト期間ごとの短い共通URL（`/s/[code]`）が表示されます。このURLは従来の `/availability/periods/[periodId]` に転送されるため、配布済みのURLも利用できます。従業員はログインせずに共通URLを開き、自分の名前を選んで、日付ごとに `ランチ` と `ディナー` の希望を提出できます。選択肢は `入れる`、`入らない` です。提出済みの場合は、管理者画面に提出日時が表示されます。ポジションごとの割当可否は、従業員管理で設定した対応可能ポジションをもとに判断します。未選択のセルは `入らない` として送信されます。

名前選択時にチェックを付けると、従業員IDだけをそのブラウザのCookieに最大1年間保存します。次回アクセスでは、保存されたIDの従業員が現在も有効かサーバー側で確認します。削除・無効化・不正なIDの場合はCookieを消して名前選択に戻します。希望入力画面の「名前を変更」でもCookieを消せます。この保存は入力の手間を減らすためのもので、本人認証ではありません。名前を選ぶと自動で希望入力画面へ進むため、記憶させる場合は先にチェックを付けてください。

割当時は以下を確認します。

- 有効な従業員か
- 開店作業経験が必要な固定シフトに、開店作業可の従業員を選んでいるか
- 閉店作業経験が必要な固定シフトに、閉店作業可の従業員を選んでいるか
- 従業員が希望シフトで `入らない` と提出した固定シフトではないか
- 従業員が対象ポジションに対応可能として登録されているか
- `18歳未満・高校生` の従業員を22時以降にかかる固定シフトへ割り当てていないか
- 必要人数を超えていないか

`自動割当` ボタンを押すと、未割当の固定シフトに従業員を自動で追加します。既に手動で入っている割当は残し、足りない人数だけを補完します。

自動割当では以下を確認します。

- このシフト期間に希望を提出済みで、対象の固定シフトを `入れる` または `希望する` と回答したか
- 対象ポジションに対応可能として登録されているか
- 開店作業経験、閉店作業経験の条件
- 同じ時間帯の重複勤務
- `18歳未満・高校生` の従業員を22時以降にかかる固定シフトへ入れていないか

未提出の従業員や `入らない` と提出した従業員は、自動割当の候補になりません。必要人数が残った場合は、管理者が手動で調整します。

### Server ActionとRepository

画面のフォームはServer Actionへ送信されます。Server Actionでは `auth()` によるログイン確認を行い、Zodで入力値を検証してからRepositoryを呼び出します。

```text
src/app/admin/employees/actions.ts
src/app/admin/shift-periods/actions.ts
src/repositories/employeeRepository.ts
src/repositories/shiftPeriodRepository.ts
src/repositories/shiftSlotRepository.ts
src/repositories/assignmentRepository.ts
src/lib/shifts/shiftTemplates.ts
```

初心者向けに言うと、画面から直接SQLを実行せず、「画面 -> Server Action -> Repository -> Drizzle -> Neon」の順番でDBへ保存しています。この順番にすると、認証確認や入力チェックをサーバー側で確実に実行できます。

## Drizzle ORM

Drizzle ORMは、TypeScriptのコードでテーブル定義やDB操作を書くためのORMです。

このプロジェクトでは `src/db/schema.ts` にテーブルを定義しています。TypeScriptで列名や型を定義することで、実装時に型チェックが効きます。

## スキーマとマイグレーション

スキーマは、アプリ側で管理するテーブル設計図です。

```text
src/db/schema.ts
```

マイグレーションは、実際のPostgreSQLにテーブルやインデックスを作るためのSQL履歴です。

```text
drizzle/
```

テーブルを変更するときは、先に `src/db/schema.ts` を変更し、次にマイグレーションを生成します。

```bash
npm run db:generate
```

生成されたマイグレーションをNeonへ反映します。

```bash
npm run db:migrate
```

## テーブル構成

- `admins`: 管理者。パスワードは `password_hash` にハッシュ化して保存します。
- `employees`: 従業員。メールアドレスは保存しません。
- `shift_periods`: シフト募集期間。
- `business_day_overrides`: シフト期間内の日ごとの手動営業時間設定。行がない日は自動判定します。
- `shift_slots`: 期間内の勤務枠。
- `availability_submissions`: 従業員ごとの希望提出。
- `availabilities`: 各勤務枠に対する希望可否。
- `employee_access_tokens`: 旧個人URL用トークンのハッシュ。現在の主導線はシフト期間ごとの共通URLです。
- `employee_position_skills`: 従業員ごとの対応可能ポジション。
- `shift_assignments`: 確定シフトの割り当て。

主な関係は次の通りです。

- `shift_periods` 1件に対して、複数の `shift_slots` があります。
- `employees` 1件に対して、複数の `availability_submissions` と `employee_access_tokens` があります。
- `employees` 1件に対して、複数の `employee_position_skills` があります。
- `availability_submissions` は、従業員とシフト期間の組み合わせごとに1件です。
- `availabilities` は、提出内容と勤務枠の組み合わせごとに1件です。
- `shift_assignments` は、従業員と勤務枠を結びます。

## シードデータ

マイグレーション後、開発用データを投入できます。

```bash
npm run db:seed
```

シードでは以下を作成します。

- 管理者1件
- 従業員2件
- 従業員ごとの対応可能ポジション
- シフト期間1件
- 勤務枠2件
- 希望提出2件
- 希望詳細4件
- 従業員専用URL用トークン2件

管理者パスワードは `bcryptjs` でハッシュ化して保存します。従業員用URLの生トークンはDBへ保存せず、SHA-256ハッシュだけを保存します。シード実行後に表示される `/availability/...` のURLは開発確認用です。

## よく使うコマンド

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:check
npm run db:studio
```

## 動作確認

1. `.env.local` に `DATABASE_URL` を設定します。
2. `npm run db:migrate` でテーブルを作成します。
3. `npm run db:seed` で開発用データを投入します。
4. `npm run db:check` で接続確認します。
5. `npm run dev` を実行します。
6. `http://localhost:3000/api/health/db` を開き、`ok: true` が返ることを確認します。
7. `http://localhost:3000/login` を開き、シード管理者でログインします。
8. `/admin/dashboard` が表示されることを確認します。
9. `/admin/employees` で従業員を追加します。
10. `/admin/shift-periods` でシフト期間を作成します。
11. 作成したシフト期間の詳細画面で固定シフトを作成します。
12. 詳細画面に表示される共通の希望提出URLを従業員へ共有します。
13. 従業員は共通URLで自分の名前を選び、希望シフトを提出します。
14. `自動割当` で、提出された希望をもとに未割当の固定シフトを補完します。
15. 日付タブを選び、固定シフトごとに従業員を選択して手動調整します。
16. `罫線つきExcel` からシフト期間全体のファイルをダウンロードできます。
17. 受付中のシフト期間は締切に変更できます。不要なシフト期間は削除できます。

既存DBに時間割テンプレート対応前のテーブルがある場合も、次を実行してください。

```bash
npm run db:migrate
```

これにより `shift_slots` に、休憩時間、開店/閉店経験要否、予備枠、テンプレート区分の列が追加されます。また、`employee_position_skills` が作成され、既存従業員には現在の固定シフトテンプレート上の全ポジションが初期登録されます。

## エラー時の確認箇所

- `DATABASE_URL is not set`: `.env.local` に `DATABASE_URL` が設定されているか確認してください。
- `There was a problem with the server configuration`: `.env.local` の `AUTH_SECRET` が設定されているか確認してください。
- `password authentication failed`: Neonのユーザー名、パスワード、接続URLを確認してください。
- `database does not exist`: NeonのDB名が正しいか確認してください。
- `relation does not exist`: `npm run db:migrate` を実行済みか確認してください。
- `duplicate key value`: 既存データとシードデータの一意制約が重複していないか確認してください。
- 接続がタイムアウトする場合: Neonプロジェクトが停止していないか、接続URLに `sslmode=require` があるか確認してください。
- ログインできない場合: `npm run db:seed` を実行したか、`SEED_ADMIN_EMAIL` と `SEED_ADMIN_PASSWORD` が入力値と一致しているか確認してください。
- `MissingSecret` が出る場合: `.env.local` の `AUTH_SECRET` を設定してください。
- 管理画面の保存で失敗する場合: ログイン状態、入力値、`DATABASE_URL`、マイグレーション実行済みかを確認してください。

## バックアップと復元

PostgreSQL標準の `pg_dump` と `pg_restore` を使います。

バックアップ:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup.dump
```

復元:

```bash
pg_restore --dbname "$DATABASE_URL" --clean --if-exists backup.dump
```

SQL形式で保存したい場合:

```bash
pg_dump "$DATABASE_URL" --file=backup.sql
```

別のPostgreSQL環境へ移行する場合は、移行先の `DATABASE_URL` を設定してから `pg_restore` を実行します。アプリ側は `DATABASE_URL` を変更するだけで接続先を切り替えられる構成です。

## 残りの主なフェーズ

- フェーズ5: 自動割当の精度向上。公平性、連勤制限、店舗独自ルール、調整しやすい警告表示を追加します。
- フェーズ6: 運用機能。確定シフトの公開、従業員向け確認画面、通知、権限分け、バックアップ手順を整えます。

フェーズ4時点の自動割当は、提出済みの希望と従業員条件を使って空き枠を埋めるMVPです。完全自動で最適なシフトを作る段階ではなく、管理者が最後に確認・調整する前提です。
