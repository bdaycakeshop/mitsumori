/**
 * イラストコミッション見積もりシミュレーター
 * ------------------------------------------------
 * 注意: ここで計算する金額は「表示用」です。
 * 実際に確定・通知される金額はGAS側で再計算されます(改ざん防止)。
 */

// ---------------------------------------------
// 状態管理
// ---------------------------------------------
const state = {
  plan: null,        // "A" | "B"
  range: null,        // "shoulder" | "waist" | "knee" | "full"
  extraPeople: 0,
  faceVariant: 0,
  props: 0,
  characterDesign: false,
  costumeDesign: 0,
  threeView: false,
  consult: {},        // { complexBg: bool, illustration: bool, ... }
};
CONFIG.consultOnly.forEach(item => (state.consult[item.key] = false));

let currentId = null;
const notifiedCopyIds = new Set(); // このページ表示中に「コピー通知済み」のID

// ---------------------------------------------
// ID生成
// ---------------------------------------------
function generateId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ---------------------------------------------
// 金額計算
// ---------------------------------------------
function calcFaceVariantPrice(count) {
  if (count <= 0) return { unitPrice: 0, total: 0 };
  const tier = CONFIG.faceVariant.tiers.find(t => count <= t.upTo);
  const unitPrice = tier.unitPrice;
  return { unitPrice, total: unitPrice * count };
}

function calculate() {
  const result = {
    valid: false,
    base: 0,
    peopleExtra: 0,
    options: [],   // { label, amount }
    consultItems: [], // 選択された「ご相談」項目のラベル
    subtotal: 0,
    discount: 0,
    total: 0,
  };

  if (!state.plan || !state.range) return result;

  const baseInfo = CONFIG.basePrice[state.range];
  result.base = baseInfo.price;
  result.peopleExtra = Math.round(baseInfo.price * CONFIG.people.extraRate * state.extraPeople);

  const baseWithPeople = result.base + result.peopleExtra;

  // オプション
  if (state.characterDesign) {
    result.options.push({ label: "キャラクターデザイン", amount: CONFIG.characterDesign.price });
  }
  if (state.costumeDesign > 0) {
    result.options.push({
      label: `衣装デザイン ×${state.costumeDesign}`,
      amount: CONFIG.costumeDesign.price * state.costumeDesign,
    });
  }
  if (state.threeView) {
    const headcount = 1 + state.extraPeople;
    result.options.push({
      label: `三面図（${headcount}人分）`,
      amount: CONFIG.threeView.price * headcount,
    });
  }
  if (state.props > 0) {
    result.options.push({
      label: `小物追加 ×${state.props}`,
      amount: CONFIG.props.unitPrice * state.props,
    });
  }
  if (state.faceVariant > 0) {
    const fv = calcFaceVariantPrice(state.faceVariant);
    result.options.push({
      label: `表情差分 ×${state.faceVariant}（単価¥${fv.unitPrice.toLocaleString()}）`,
      amount: fv.total,
    });
  }

  // ご相談項目(金額計算には含めない)
  CONFIG.consultOnly.forEach(item => {
    if (state.consult[item.key]) result.consultItems.push(item.label);
  });

  const optionsTotal = result.options.reduce((sum, o) => sum + o.amount, 0);
  result.subtotal = baseWithPeople + optionsTotal;

  const rate = CONFIG.plan[state.plan].discountRate;
  result.discount = Math.round(result.subtotal * rate);
  result.total = result.subtotal - result.discount;
  result.valid = result.total > 0;

  return result;
}

// ---------------------------------------------
// UI更新
// ---------------------------------------------
function updateOptionsLockState() {
  const locked = !(state.plan && state.range);
  document.getElementById("options-section").classList.toggle("locked", locked);
  document
    .querySelectorAll("#options-section input, #options-section button.stepper-btn")
    .forEach(el => (el.disabled = locked));
}

function render() {
  const result = calculate();

  // IDは内容が変わるたびに再生成
  currentId = result.valid ? generateId() : null;

  updateOptionsLockState();

  // 内訳表示
  const breakdown = document.getElementById("breakdown");
  breakdown.innerHTML = "";

  if (!state.plan || !state.range) {
    breakdown.innerHTML = `<p class="hint">プランと描画範囲を選んでください</p>`;
  } else {
    const rangeLabel = CONFIG.basePrice[state.range].label;
    addBreakdownLine(breakdown, `基本料金（${rangeLabel}）`, result.base);
    if (result.peopleExtra > 0) {
      addBreakdownLine(breakdown, `人数追加 ×${state.extraPeople}`, result.peopleExtra);
    }
    result.options.forEach(o => addBreakdownLine(breakdown, o.label, o.amount));
    if (result.discount > 0) {
      addBreakdownLine(breakdown, `${CONFIG.plan[state.plan].label} 割引`, -result.discount);
    }
    if (result.consultItems.length > 0) {
      const p = document.createElement("p");
      p.className = "consult-note";
      p.textContent = `※ ${result.consultItems.join("・")} は別途ご相談ください`;
      breakdown.appendChild(p);
    }
  }

  // 合計
  document.getElementById("total-amount").textContent = `¥${result.total.toLocaleString()}`;
  document.getElementById("estimate-id").textContent = currentId ? `ID：${currentId}` : "";

  // ボタン活性状態
  const estimateBtn = document.getElementById("btn-estimate");
  const copyBtn = document.getElementById("btn-copy");
  estimateBtn.disabled = !result.valid;
  copyBtn.disabled = !result.valid;
}

function addBreakdownLine(container, label, amount) {
  const row = document.createElement("div");
  row.className = "breakdown-row";
  const sign = amount < 0 ? "-" : "";
  row.innerHTML = `<span>${label}</span><span>${sign}¥${Math.abs(amount).toLocaleString()}</span>`;
  container.appendChild(row);
}

// ---------------------------------------------
// テキスト生成(コピー用・通知用 共通フォーマット)
// ---------------------------------------------
function buildSummaryText() {
  const result = calculate();
  if (!result.valid) return "";

  const lines = [];
  lines.push("【イラストコミッションお見積り】");
  lines.push("■プラン");
  lines.push(CONFIG.plan[state.plan].label.replace(/（.*）/, ""));
  lines.push("■描画範囲");
  lines.push(CONFIG.basePrice[state.range].label);
  lines.push("■人数");
  lines.push(`${1 + state.extraPeople}人`);

  if (result.options.length > 0) {
    lines.push("■オプション");
    result.options.forEach(o => lines.push(`・${o.label}`));
  }
  if (result.consultItems.length > 0) {
    lines.push("■要相談");
    result.consultItems.forEach(label => lines.push(`・${label}`));
  }

  lines.push("■合計金額");
  lines.push(`${result.total.toLocaleString()}円（税込）`);
  lines.push(`ID：${currentId}`);
  lines.push("");
  lines.push("※ご依頼の際は、この内容をコピーしてお送りください。");

  return lines.join("\n");
}

// ---------------------------------------------
// GAS通知(未設定の場合は何もしない)
// ---------------------------------------------
async function notifyGAS(type) {
  if (!CONFIG.GAS_ENDPOINT) {
    console.info(`[notifyGAS] GAS_ENDPOINT未設定のため送信スキップ (type=${type})`);
    return;
  }
  const result = calculate();
  if (!result.valid) return;

  const payload = {
    type, // "created" | "copied"
    id: currentId,
    plan: state.plan,
    range: state.range,
    headcount: 1 + state.extraPeople,
    options: result.options,
    consultItems: result.consultItems,
    total: result.total,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(CONFIG.GAS_ENDPOINT, {
      method: "POST",
      mode: "no-cors", // GAS WebアプリはCORS制約があるため
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("GAS通知に失敗しました", err);
  }
}

// ---------------------------------------------
// イベント登録
// ---------------------------------------------
function setupPlanButtons() {
  document.querySelectorAll("[data-plan]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.plan = btn.dataset.plan;
      document.querySelectorAll("[data-plan]").forEach(b => b.classList.toggle("selected", b === btn));
      render();
    });
  });
}

function setupRangeButtons() {
  document.querySelectorAll("[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.range = btn.dataset.range;
      document.querySelectorAll("[data-range]").forEach(b => b.classList.toggle("selected", b === btn));
      render();
    });
  });
}

function setupStepper(id, stateKey, max) {
  const decBtn = document.getElementById(`${id}-dec`);
  const incBtn = document.getElementById(`${id}-inc`);
  const valueEl = document.getElementById(`${id}-value`);

  function update() {
    valueEl.textContent = state[stateKey];
    decBtn.disabled = state[stateKey] <= 0;
    incBtn.disabled = state[stateKey] >= max;
  }

  decBtn.addEventListener("click", () => {
    if (state[stateKey] > 0) state[stateKey]--;
    update();
    render();
  });
  incBtn.addEventListener("click", () => {
    if (state[stateKey] < max) state[stateKey]++;
    update();
    render();
  });
  update();
}

function setupCheckbox(id, stateKey) {
  const el = document.getElementById(id);
  el.addEventListener("change", () => {
    state[stateKey] = el.checked;
    render();
  });
}

function setupConsultCheckboxes() {
  CONFIG.consultOnly.forEach(item => {
    const el = document.getElementById(`consult-${item.key}`);
    if (!el) return;
    el.addEventListener("change", () => {
      state.consult[item.key] = el.checked;
      render();
    });
  });
}

function setupButtons() {
  document.getElementById("btn-estimate").addEventListener("click", async () => {
    await notifyGAS("created");
    const msg = document.getElementById("estimate-status");
    msg.textContent = "見積もりを作成しました。";
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 2500);
  });

  document.getElementById("btn-copy").addEventListener("click", async () => {
    const text = buildSummaryText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("クリップボードへのコピーに失敗しました", err);
    }

    // 同一IDでの通知は最初の1回のみ(内容を変えると新IDになるため自然に再通知される)
    if (currentId && !notifiedCopyIds.has(currentId)) {
      notifiedCopyIds.add(currentId);
      await notifyGAS("copied");
    }

    const msg = document.getElementById("copy-status");
    msg.textContent = "コピーしました。";
    msg.classList.add("show");
    setTimeout(() => msg.classList.remove("show"), 2500);
  });
}

// ---------------------------------------------
// 初期化
// ---------------------------------------------
function buildConsultCheckboxesHTML() {
  const container = document.getElementById("consult-options");
  container.innerHTML = CONFIG.consultOnly
    .map(
      item => `
      <label class="option-row">
        <input type="checkbox" id="consult-${item.key}" />
        <span>${item.label}</span>
        <small>${item.note}</small>
      </label>`
    )
    .join("");
}

function init() {
  buildConsultCheckboxesHTML();

  setupPlanButtons();
  setupRangeButtons();
  setupStepper("people", "extraPeople", CONFIG.people.maxExtra);
  setupStepper("face", "faceVariant", CONFIG.faceVariant.max);
  setupStepper("props", "props", CONFIG.props.max);
  setupStepper("costume", "costumeDesign", 5); // 上限は仕様上明示なし、暫定5着まで
  setupCheckbox("character-design", "characterDesign");
  setupCheckbox("three-view", "threeView");
  setupConsultCheckboxes();
  setupButtons();

  render();
}

document.addEventListener("DOMContentLoaded", init);
