/**
 * 料金設定ファイル
 * ------------------------------------------------
 * 金額や上限を変更したいときは、このファイルだけを編集してください。
 * HTML/JSのロジックには触れる必要はありません。
 * ------------------------------------------------
 */

const CONFIG = {

  // GAS(Google Apps Script)のWebアプリURL
  // ⑦の実装後にここへ貼り付けます(現時点では空でOK)
  GAS_ENDPOINT: "",

  // 描画範囲ごとの基本料金
  basePrice: {
    shoulder: { label: "肩上", price: 4000 },
    waist:    { label: "腰",   price: 7000 },
    knee:     { label: "膝上", price: 9000 },
    full:     { label: "全身", price: 12000 },
  },

  // プラン設定
  plan: {
    A: {
      label: "Aプラン（基本）",
      deadline: "〜3ヶ月",
      payment: "銀行振込のみ",
      revisions: "全体で3回のみ",
      discountRate: 0, // 割引なし
    },
    B: {
      label: "Bプラン（簡易）",
      deadline: "〜1ヶ月",
      payment: "銀行振込／ギフトカード",
      revisions: "全体で1回のみ",
      discountRate: 0.25, // 最終合計から25%オフ
    },
  },

  // 人数追加(基本料金のみに対して加算。上限は追加人数の上限)
  people: {
    extraRate: 0.6,   // 基本料金 × 0.6 × 追加人数
    maxExtra: 4,       // 追加できるのは最大4人まで(合計5人)
  },

  // 表情差分(個数に応じて単価が下がる段階制)
  faceVariant: {
    max: 15,
    tiers: [
      { upTo: 3, unitPrice: 500 },
      { upTo: 8, unitPrice: 450 },
      { upTo: Infinity, unitPrice: 400 },
    ],
  },

  // 小物追加(割引なし)
  props: {
    unitPrice: 1000,
    max: 10,
  },

  // キャラクターデザイン(衣装1着込み)
  characterDesign: {
    price: 3000,
    note: "衣装デザイン1着分を含みます",
  },

  // 衣装デザイン(2着目以降。キャラクターデザインと併用可)
  costumeDesign: {
    price: 2000,
    note: "2着目以降の衣装を追加できます",
  },

  // 三面図(人数分課金)
  threeView: {
    price: 3000, // × 人数
  },

  // 自動計算せず「ご相談ください」に誘導する項目
  consultOnly: [
    { key: "complexBg",   label: "複雑な背景",     note: "描画範囲により金額が変動するため、詳細はご相談ください" },
    { key: "illustration",label: "一枚絵",         note: "内容によって金額が変動するため、詳細はご相談ください" },
    { key: "commercial",  label: "商用利用",       note: "利用範囲により金額が変動するため、詳細はご相談ください" },
    { key: "copyright",   label: "著作権譲渡",     note: "詳細はご相談ください" },
    { key: "rush",        label: "納期短縮",       note: "3日あたり¥4,000目安（要相談）" },
  ],

  // 見積もり保存の上限(超えたら古いものから削除)
  storage: {
    maxRecords: 30,
  },
};
