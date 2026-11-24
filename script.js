/* ==========================================================
   LUNARA — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================== */

const ORDER_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbztCdQbz9w5APo-YdXf3iVFyFp4eTyGvKMcy1w0lG02Zb9uR8zr98cPLbCG0xH92uYwrw/exec";

const ORDERS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTm3byyUHh4D0NuRQ8tiVuSKdokhDJq-juzZEg7EsBuem1tN_X-Ywfl6wAMUyVjlneVYmqGpLWJMKlX/pub?gid=0&single=true&output=csv";

/* ปุ่มกรอง: key ใช้เป็นค่า ?mood=xxx ด้วย */
const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "rose", label: "Rose" },
  { key: "lavender", label: "Lavender" },
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้า product.html
   ========================================================== */

/* หา key สีของสินค้า (rose / lavender) จาก id หรือชื่อ */
function getProductKey(p) {
  const text = `${p.id || ""} ${p.name || ""}`.toLowerCase();
  if (text.includes("rose")) return "rose";
  if (text.includes("lavender")) return "lavender";
  return p.mood || "";
}

/* สินค้าตรงกับ filter ไหม (รองรับทั้ง ?mood=rose และ ?mood=romance) */
function matchesFilter(p, filter) {
  if (!filter || filter === "all") return true;
  const f = filter.toLowerCase();
  return getProductKey(p) === f || String(p.mood || "").toLowerCase() === f;
}

/* ชื่อรายการที่ส่งไปหน้า order เช่น "ยาสระผม LUNARA Rose ใหญ่ 200ml" */
function buildItemName(p) {
  let name = p.name || "";
  if (!/lunara/i.test(name)) {
    name = name.replace(/^ยาสระผม\s*/, "ยาสระผม LUNARA ");
    if (!/lunara/i.test(name)) name = `LUNARA ${name}`;
  }
  return `${name} ใหญ่ ${p.size || ""}`.trim();
}

function formatPrice(n) {
  return Number(n).toLocaleString("th-TH");
}

async function initProductPage() {
  const list = document.getElementById("product-list");
  const bar = document.getElementById("filter-bar");

  let products = [];
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    products = await res.json();
  } catch (err) {
    console.error(err);
    list.innerHTML =
      '<p class="text-center">ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  let current = (params.get("mood") || "all").toLowerCase();
  const validKeys = FILTERS.map((f) => f.key);
  const productKeys = products.map((p) => String(p.mood || "").toLowerCase());
  if (!validKeys.includes(current) && !productKeys.includes(current)) {
    current = "all";
  }

  function renderFilters() {
    if (!bar) return;
    bar.innerHTML = "";
    FILTERS.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = f.label;
      btn.dataset.filter = f.key;
      const isActive =
        f.key === current ||
        (f.key !== "all" &&
          current !== "all" &&
          products.some(
            (p) => matchesFilter(p, current) && getProductKey(p) === f.key
          ) &&
          !validKeys.includes(current));
      if (isActive) btn.classList.add("active");
      btn.addEventListener("click", () => {
        current = f.key;
        renderFilters();
        renderProducts();
      });
      bar.appendChild(btn);
    });
  }

  function renderProducts() {
    list.innerHTML = "";
    const shown = products.filter((p) => matchesFilter(p, current));

    if (!shown.length) {
      list.innerHTML = '<p class="text-center">ยังไม่มีสินค้าในหมวดนี้</p>';
      return;
    }

    shown.forEach((p) => {
      const key = getProductKey(p);
      const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "";

      const card = document.createElement("article");
      card.className = "product-card fade-in";
      card.dataset.mood = key;

      const media = document.createElement("div");
      media.className = "product-card__media";
      const img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      const body = document.createElement("div");
      body.className = "product-card__body";

      const moodEl = document.createElement("span");
      moodEl.className = "product-card__mood";
      moodEl.innerHTML = '<span class="mood-dot"></span>';
      moodEl.appendChild(document.createTextNode(label));

      const name = document.createElement("h3");
      name.className = "product-card__name";
      name.textContent = p.name;

      const meta = document.createElement("div");
      meta.className = "product-card__meta";
      const size = document.createElement("span");
      size.className = "product-card__size";
      size.textContent = p.size;
      const price = document.createElement("span");
      price.className = "product-card__price";
      price.textContent = `${formatPrice(p.price)} บาท`;
      meta.append(size, price);

      const orderUrl = new URLSearchParams({
        item: buildItemName(p),
        price: String(p.price),
      });
      const btn = document.createElement("a");
      btn.className = "btn btn--gold";
      btn.href = `order.html?${orderUrl.toString()}`;
      btn.textContent = "สั่งซื้อ";

      body.append(moodEl, name, meta, btn);
      card.append(media, body);
      list.appendChild(card);
    });
  }

  renderFilters();
  renderProducts();
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  const params = new URLSearchParams(window.location.search);

  /* เติมค่าอัตโนมัติ: ชื่อสินค้า -> #items, ราคา -> #total */
  const item = params.get("item");
  const price = params.get("price");

  const itemsEl = document.getElementById("items");
  const totalEl = document.getElementById("total");

  if (itemsEl && item !== null) itemsEl.value = item;
  if (totalEl && price !== null) totalEl.value = price;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value,
      contact: document.getElementById("contact").value,
      items: document.getElementById("items").value,
      total: document.getElementById("total").value,
      note: document.getElementById("note").value,
    };

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      if (submitBtn) submitBtn.disabled = false;
    });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */

/* parse CSV เอง: รองรับ "..." , "" (escape), คอมมา/ขึ้นบรรทัดใหม่ในเครื่องหมายคำพูด */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

async function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  const COLS = 6;

  function message(text) {
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = COLS;
    td.style.textAlign = "center";
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  message("กำลังโหลดข้อมูล...");

  try {
    const res = await fetch(`${ORDERS_CSV_URL}&_=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseCSV(await res.text());

    // แถวแรกคือหัวคอลัมน์ -> ข้าม แล้วกลับลำดับให้รายการล่าสุดขึ้นก่อน
    const data = rows.slice(1).reverse();

    if (!data.length) {
      message("ยังไม่มีรายการสั่งซื้อ");
      return;
    }

    tbody.innerHTML = "";
    data.forEach((r) => {
      const tr = document.createElement("tr");
      // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
      for (let i = 0; i < COLS; i++) {
        const td = document.createElement("td");
        td.textContent = r[i] !== undefined ? r[i] : "";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    message("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
  }
}
