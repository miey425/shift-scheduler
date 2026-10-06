# UI Design Guidelines

UIを、実際のプロダクトとして長期間使用できる、シンプルで洗練されたデザインにしてください。

「AIが生成した典型的なモダンUI」に見えるデザインを避けてください。

## Design Philosophy

装飾ではなく、情報設計・タイポグラフィ・余白・整列によって完成度を高めてください。

優先順位：

1. Usability
2. Readability
3. Information hierarchy
4. Consistency
5. Visual aesthetics

「見栄えを良くするために要素を追加する」のではなく、「不要な要素を減らして整える」という考え方でデザインしてください。

---

## Colors

ニュートラルカラーを中心に構成してください。

白、グレー、黒に近いテキストカラーを基本とし、Primary Colorは1色を中心に使用してください。

色は以下の目的で使用します。

- 操作可能な要素
- 選択状態
- ステータス
- 警告
- エラー
- 強調

装飾目的で色を増やさないでください。

グラデーションは原則使用しないでください。

特に紫・青・ピンクなどを組み合わせた「AI/SaaS風グラデーション」は避けてください。

---

## Borders

要素の区切りには、shadowよりborderを優先してください。

境界線は薄く、ニュートラルな色を使用してください。

強い境界線でコンポーネントを囲みすぎないでください。

必要な場所だけを自然に区切ってください。

---

## Border Radius

border-radiusは控えめにしてください。

基本：

4px〜8px

程度を使用します。

rounded-xl、rounded-2xl、rounded-3xlのような大きな角丸をUI全体で多用しないでください。

すべての要素を丸くする必要はありません。

---

## Shadows

shadowは原則使用しない、または非常に弱くしてください。

以下のような強いshadowは避けてください。

- shadow-lg
- shadow-xl
- shadow-2xl
- colored shadow
- glow

階層表現には、

- border
- background color
- spacing
- typography

を優先してください。

---

## Cards

「何でもカードにする」デザインを避けてください。

関連する情報をまとめる必要がある場合のみカードを使用してください。

ページ内にカードを大量配置しないでください。

Card inside Cardのような過剰なネストも避けてください。

情報の整理には、

- section
- table
- list
- divider
- whitespace

を積極的に使用してください。

---

## Spacing

余白は十分確保しつつ、広すぎないようにしてください。

「高級感」や「モダンさ」を出すためだけに巨大なpaddingやmarginを使用しないでください。

関連する情報同士は近づけ、異なる情報グループの間には適切な余白を設けてください。

余白そのものを情報階層として使用してください。

---

## Typography

タイポグラフィによって情報階層を作ってください。

巨大な見出しは避けてください。

フォントサイズ・太さ・色の違いを使って、

- Page title
- Section title
- Body
- Secondary text
- Metadata

を自然に区別してください。

フォントウェイトを必要以上に増やさないでください。

Regular / Medium / Semiboldを中心に使用してください。

---

## Buttons

Primary Buttonは、本当に重要な操作だけに使用してください。

すべてのボタンをPrimary Colorにしないでください。

操作の重要度に応じて、

- Primary
- Secondary
- Ghost
- Destructive

を使い分けてください。

ピル型ボタンを多用しないでください。

ボタンのborder-radiusも他のUIと統一してください。

---

## Icons

アイコンは意味がある場合のみ使用してください。

「見た目が寂しい」という理由でアイコンを追加しないでください。

すべての見出しやボタンにアイコンを付ける必要はありません。

アイコン単体では意味が伝わりにくい操作には、テキストラベルを使用してください。

アイコンのサイズ・stroke width・スタイルを統一してください。

---

## Layout

レイアウトは明確なグリッドと整列を意識してください。

要素の左端、右端、baselineを可能な限り揃えてください。

装飾によって視線を誘導するのではなく、

- Position
- Size
- Spacing
- Typography
- Contrast

によって自然な視線誘導を作ってください。

---

## Information Density

情報密度を不必要に下げないでください。

実際のユーザーが日常的に使用するプロダクトとして、必要な情報を効率よく確認できる密度を維持してください。

大量の余白と巨大なカードによって、少ない情報しか表示できないUIを避けてください。

---

## Avoid Typical AI-Generated UI

以下のパターンを原則避けてください。

- 紫・青・ピンク系グラデーション
- Glow
- Glassmorphism
- Backdrop blurの乱用
- 大きな角丸
- 強いshadow
- カードの大量配置
- Card inside Card
- KPIカードの乱用
- 3列・4列のアイコン付きFeature Card
- 不必要なLucide Icon
- 巨大なHero Typography
- ピル型ボタンの乱用
- 不必要に広い余白
- 装飾目的の背景図形
- Floating card
- Gradient border
- Gradient text
- 「未来感」を出すためだけの装飾

---

## Visual Direction

目指す印象：

- Clean
- Neutral
- Calm
- Functional
- Precise
- Dense but readable
- Professional
- Timeless

避ける印象：

- Flashy
- Futuristic
- Over-designed
- Template-like
- Dribbble-like
- AI-generated SaaS
- Marketing landing page

---

## Final Rule

新しいUI要素を追加する前に、

「この要素はユーザーの理解または操作に必要か？」

を判断してください。

必要でなければ追加しないでください。

完成度を上げるために装飾を追加するのではなく、

- Alignment
- Typography
- Spacing
- Contrast
- Information hierarchy
- Consistency

を改善してください。

最終的に、

「AIが生成した綺麗なデモUI」

ではなく、

「デザイナーが情報設計を行い、実際に運用されている成熟したプロダクト」

に見えるUIを目指してください。