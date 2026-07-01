const SUPABASE_URL = 'https://unrkdxrqmhgxlmgzxyqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_optM3gsSn5pV-2aQo23Rpg_ndL99Rr_';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;
let currentUser = null;
let lang = "zh";
let birthdayMode = "month";

const users = {
  admin: { password: "1234", role: "admin", labelZh: "管理员", labelJa: "管理者" },
  manager: { password: "1234", role: "manager", labelZh: "店长", labelJa: "店長" },
  staff: { password: "1234", role: "staff", labelZh: "店员", labelJa: "スタッフ" }
};

const typeLabel = {
  customerType: {
    japanese:{zh:"日本客人",ja:"日本のお客様"}, chinese:{zh:"中国客人",ja:"中国のお客様"}, other:{zh:"其他外国客人",ja:"その他外国人"}, unknown:{zh:"不确定",ja:"不明"}
  },
  visitScene: {
    family:{zh:"家庭聚餐",ja:"家族利用"}, company:{zh:"公司聚餐",ja:"会社利用"}, couple:{zh:"情侣",ja:"カップル"}, friends:{zh:"朋友聚会",ja:"友人同士"}, alone:{zh:"一个人",ja:"一人利用"}, tourist:{zh:"游客",ja:"観光客"}, nearby:{zh:"附近居民",ja:"近隣住民"}, regular:{zh:"熟客",ja:"常連"}, unknown:{zh:"不确定",ja:"不明"}
  },
  foodPreference: {
    hotpot:{zh:"火锅",ja:"火鍋"}, sichuan:{zh:"川菜",ja:"四川料理"}, xiaolongbao:{zh:"小笼包",ja:"小籠包"}, dimsum:{zh:"点心",ja:"点心"}, dessert:{zh:"甜品",ja:"デザート"}, alcohol:{zh:"酒类",ja:"お酒"}, setmeal:{zh:"套餐",ja:"セット"}, unknown:{zh:"不确定",ja:"不明"}
  },
  tastePreference: {
    spicy_strong:{zh:"重辣",ja:"激辛"}, spicy_mild:{zh:"微辣",ja:"ピリ辛"}, no_spicy:{zh:"不吃辣",ja:"辛い物不可"}, mala:{zh:"喜欢麻味",ja:"しびれ好き"}, light:{zh:"清淡",ja:"あっさり"}, rich:{zh:"重口味",ja:"濃い味"}, unknown:{zh:"不确定",ja:"不明"}
  }
};

const labels = {
  zh: {
    dashboard:"首页", search:"会员查询", register:"新增会员", birthday:"生日会员", status:"营业状态",
    members:"会员列表", analysis:"客户分析", push:"LINE推送", settings:"系统设置", logout:"退出",
    total:"会员总数", birthMonth:"本月生日", visitMonth:"本月到店", currentStatus:"当前状态",
    todayWork:"今日操作", searchSub:"输入电话后4位，店员端只显示隐藏后的电话。",
    name:"姓名", phone:"电话号码", birth:"生日（月日）", store:"常去门店", profile:"客户画像",
    customerType:"客户类型", visitScene:"来店场景", foodPreference:"菜品偏好", tastePreference:"口味属性",
    today:"今日生日", month:"本月生日", all:"全部生日",
    open:"营业中", busy:"忙碌中", stop:"停止接待", closed:"已打烊",
    statusSub:"店员可切换现场营业状态，防止误操作会二次确认。",
    save:"保存会员", searchBtn:"查询", pushBtn:"模拟发送",
    active:"活跃会员",
warning:"提醒会员",
sleep:"沉睡会员",
lost:"流失会员",
    anaType:"客户类型", anaScene:"来店场景", anaFood:"菜品偏好", anaTaste:"口味属性", anaActive:"活跃度", anaStore:"门店分布"
  },
  ja: {
    dashboard:"ホーム", search:"会員検索", register:"会員登録", birthday:"誕生日会員", status:"営業状態",
    members:"会員一覧", analysis:"顧客分析", push:"LINE配信", settings:"システム設定", logout:"ログアウト",
    total:"会員総数", birthMonth:"今月の誕生日", visitMonth:"今月の来店", currentStatus:"現在の状態",
    todayWork:"本日の操作", searchSub:"電話番号下4桁を入力。スタッフ画面では番号を非表示にします。",
    name:"お名前", phone:"電話番号", birth:"誕生日（月日）", store:"よく行く店舗", profile:"顧客プロフィール",
    customerType:"顧客タイプ", visitScene:"来店シーン", foodPreference:"料理ジャンル", tastePreference:"味の好み",
    today:"今日の誕生日", month:"今月の誕生日", all:"すべて",
    open:"営業中", busy:"混雑中", stop:"受付停止", closed:"閉店",
    statusSub:"スタッフが店舗の営業状態を切り替えできます。誤操作防止の確認があります。",
    save:"保存", searchBtn:"検索", pushBtn:"送信テスト",
    activeOften:"常連", activeNormal:"通常", inactive30:"30日未来店", inactive90:"90日休眠",
    anaType:"顧客タイプ", anaScene:"来店シーン", anaFood:"料理ジャンル", anaTaste:"味の好み", anaActive:"利用頻度", anaStore:"店舗分布"
  }
};

function login(){
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value.trim();
  if(!users[u] || users[u].password !== p){ alert("账号或密码错误"); return; }
  currentUser = { username:u, ...users[u] };
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("app").style.display = "block";
  applyPermission();
  setLang(lang);
  showPage(currentUser.role === "staff" ? "search" : "dashboard");
}

function logout(){
  currentUser = null;
  document.getElementById("app").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";
}

function applyPermission(){
  const role = currentUser.role;
  document.getElementById("roleText").innerText = "当前账号：" + currentUser.username + " / " + currentUser.labelZh;
  ["navDashboard","navSearch","navRegister","navBirthday","navStatus","navMembers","navAnalysis","navPush","navSettings"].forEach(id=>document.getElementById(id).classList.remove("hidden"));
  document.querySelectorAll(".manager-only").forEach(el=>el.classList.remove("hidden"));
  if(role === "staff"){
    ["navDashboard","navMembers","navAnalysis","navPush","navSettings"].forEach(id=>document.getElementById(id).classList.add("hidden"));
    document.querySelectorAll(".manager-only").forEach(el=>el.classList.add("hidden"));
  }
  if(role === "manager"){ document.getElementById("navSettings").classList.add("hidden"); }
  renderAll();
  loadBookingLinks();
}

function setLang(l){
  lang = l;
  const t = labels[l];
  const ids = {
    navDashboard:"dashboard", navSearch:"search", navRegister:"register", navBirthday:"birthday", navStatus:"status",
    navMembers:"members", navAnalysis:"analysis", navPush:"push", navSettings:"settings", titleSearch:"search", titleRegister:"register",
    titleBirthday:"birthday", titleStatus:"status", titleMembers:"members", titleAnalysis:"analysis", titlePush:"push", titleSettings:"settings",
    dashboardTitle:"todayWork", searchSub:"searchSub", statTotalLabel:"total", statBirthLabel:"birthMonth",
    statVisitLabel:"visitMonth", statStatusLabel:"currentStatus", labelName:"name", labelPhone:"phone", labelBirthday:"birth",
    labelStore:"store", sectionProfile:"profile", labelCustomerType:"customerType", labelVisitScene:"visitScene", labelFoodPreference:"foodPreference", labelTastePreference:"tastePreference",
    birthToday:"today", birthMonth:"month", birthAll:"all", stOpen:"open", stBusy:"busy", stStop:"stop", stClosed:"closed", statusSub:"statusSub", saveBtn:"save", searchBtn:"searchBtn", pushBtn:"pushBtn",
    quickSearch:"search", quickRegister:"register", quickBirthday:"birthday", quickAnalysis:"analysis",
    anaType:"anaType", anaScene:"anaScene", anaFood:"anaFood", anaTaste:"anaTaste", anaActive:"anaActive", anaStore:"anaStore"
  };
  for(const id in ids){ const el=document.getElementById(id); if(el) el.innerText = t[ids[id]]; }
  document.getElementById("logoutBtn").innerText = t.logout;
  updateStatusText();
  renderAll();
}

function showPage(id){
  if(!currentUser) return;
  if(currentUser.role === "staff" && ["dashboard","members","analysis","push","settings"].includes(id)){ alert("店员账号无权查看此页面"); return; }
  if(currentUser.role === "manager" && id === "settings"){ alert("店长账号无权查看系统设置"); return; }
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  renderAll();
}

function getMembers(){ return JSON.parse(localStorage.getItem("fuyoen_members_v5") || "[]"); }
function saveMembers(data){ localStorage.setItem("fuyoen_members_v5", JSON.stringify(data)); }
function getStatus(){ return localStorage.getItem("fuyoen_store_status_v5") || "open"; }
function saveStatus(s){ localStorage.setItem("fuyoen_store_status_v5", s); }

function label(group, key){
  key = key || "unknown";
  return (typeLabel[group][key] || typeLabel[group].unknown)[lang];
}

function maskPhone(phone){
  const n = String(phone || "").replace(/\D/g,"");
  if(n.length < 8) return "****";
  return n.slice(0,3) + "-****-" + n.slice(-4);
}

async function saveMember(){
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const birthday = document.getElementById("birthdayInput").value.trim();
  const store = document.getElementById("store").value;
  const customerType = document.getElementById("customerType").value;
  const visitScene = document.getElementById("visitScene").value;
  const foodPreference = document.getElementById("foodPreference").value;
  const tastePreference = document.getElementById("tastePreference").value;
  const remark = document.getElementById("remark").value.trim();

  if(!name || !phone){
    alert("请输入姓名和电话");
    return;
  }

 const { error } = await supabaseClient
  .from("members")
  .insert([{
    name: name,
    phone: phone,
    birthday: birthday || null,
    points: 0,
    level: "普通会员"
  }]);

if (error) {
  alert("保存失败：" + error.message);
  return;
}
  
alert("会员保存成功");
["name","phone","birthdayInput"].forEach(id=>document.getElementById(id).value="");

renderAll();
}

function profileHtml(m){
  return `客户类型：${label("customerType", m.customerType)}<br>来店场景：${label("visitScene", m.visitScene)}<br>菜品偏好：${label("foodPreference", m.foodPreference)}<br>口味属性：${label("tastePreference", m.tastePreference)}<br>备注：${m.remark || "无"}`;
}

async function searchMember(){
  const last4 = document.getElementById("searchPhone").value.replace(/\D/g,"").slice(-4);
  const box = document.getElementById("searchResult");

  if(!last4){
    box.innerHTML = `<div class="member">请输入电话后4位</div>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("members")
    .select("*");

  if(error){
    box.innerHTML = `<div class="member">查询失败：${error.message}</div>`;
    return;
  }

  const found = data.filter(m =>
    String(m.phone || "").replace(/\D/g,"").slice(-4) === last4
  );

  if(found.length === 0){
    box.innerHTML = `<div class="member">未找到会员</div>`;
    return;
  }

  if(found.length > 1){
    box.innerHTML = `<div class="member">找到多个会员，请确认电话号码。</div>`;
    return;
  }

  const m = found[0];
  const phoneView = currentUser.role === "admin" ? m.phone : maskPhone(m.phone);

  box.innerHTML = `
    <div class="member">
      <strong>${m.name}</strong><br>
      电话：${phoneView}<br>
      生日：${m.birthday || "未登记"}<br>
      等级：${m.level || "普通会员"}<br>
    积分：${m.points || 0}<br><br>
<button class="red"
onclick="recordVisit(${m.id})">
今日到店
</button>

<button class="red"
style="margin-left:8px;background:#ff9800"
onclick="recordConsume(${m.id})">
消费记录
</button>

<button class="red"
style="margin-left:8px;background:#2196F3"
onclick="editMember(${m.id})">
编辑会员
</button>

<button class="red"
style="margin-left:8px;background:#f44336"
onclick="deleteMember(${m.id})">
删除会员
</button>

<button class="red"
style="margin-left:8px;background:#4CAF50"
onclick="showMemberStats(${m.id})">
统计分析
</button>
    </div>
  `;
}
async function showMemberStats(id){
    const { data: m, error } = await supabaseClient
        .from("members")
        .select("*")
        .eq("id", id)
        .single();

    if(error){
        alert(error.message);
        return;
    }

    const avg = m.consume_count ? Math.round((m.total_spent || 0) / m.consume_count) : 0;

    alert(
        "【会员统计】\n\n" +
        "姓名：" + (m.name || "") + "\n" +
        "电话：" + (m.phone || "") + "\n" +
        "到店次数：" + (m.visit_count || 0) + "\n" +
        "最后到店：" + (m.last_visit || "未记录") + "\n" +
        "消费次数：" + (m.consume_count || 0) + "\n" +
        "累计消费：" + (m.total_spent || 0) + "日元\n" +
        "平均消费：" + avg + "日元\n" +
        "最后消费：" + (m.last_consume || "未记录")
    );
}
async function recordVisit(id){
  const today = new Date().toISOString().slice(0,10);

  const { data, error: readError } = await supabaseClient
    .from("members")
    .select("visit_count")
    .eq("id", id)
    .single();

  if(readError){
    alert("读取会员失败：" + readError.message);
    return;
  }

  const newVisitCount = Number(data.visit_count || 0) + 1;

  const { error } = await supabaseClient
    .from("members")
    .update({
      last_visit: today,
      visit_count: newVisitCount
    })
    .eq("id", id);

  if(error){
    alert("记录失败：" + error.message);
    return;
  }

  alert("已记录今日到店，到店次数：" + newVisitCount);

  searchMember();
  renderAll();
}
async function recordConsume(id){
  const amountText = prompt("请输入本次消费金额（日元）：", "");
  if(amountText === null) return;

  const amount = Number(amountText.replace(/,/g, ""));
  if(!amount || amount <= 0){
    alert("请输入正确金额");
    return;
  }

  const today = new Date().toISOString().slice(0,10);

  const { data, error: readError } = await supabaseClient
    .from("members")
    .select("total_spent, consume_count")
    .eq("id", id)
    .single();

  if(readError){
    alert("读取会员失败：" + readError.message);
    return;
  }

  const newTotal = Number(data.total_spent || 0) + amount;
  const newCount = Number(data.consume_count || 0) + 1;

  const { error } = await supabaseClient
    .from("members")
    .update({
      total_spent: newTotal,
      consume_count: newCount,
      last_consume: today
    })
    .eq("id", id);

  if(error){
    alert("消费记录失败：" + error.message);
    return;
  }

  alert("消费已记录，累计消费：" + newTotal + "円");

  searchMember();
  renderAll();
}
function daysSince(dateStr){
  if(!dateStr) return 9999;
  const d = new Date(dateStr);
  return Math.floor((new Date()-d)/(1000*60*60*24));
}

function getActiveKey(m){
    const visits = m.visits || [];

   if(visits.length === 0) return "lost";
    const last = visits.slice().sort().pop();
    const days = daysSince(last);

    if(days > 90) return "lost";
    if(days > 30) return "sleep";
    if(days > 15) return "warning";

    return "active";
}

function getActiveLabel(m){ return labels[lang][getActiveKey(m)]; }
function getMemberLevel(m){
  const total = m.total_spent || 0;
  if(total >= 100000) return "钻石会员";
  if(total >= 50000) return "金卡会员";
  if(total >= 10000) return "银卡会员";
  return "普通会员";
}

function parseMonthDay(b){
    const s = String(b || "");
    const m = s.match(/(\d{1,2})[\/\-\.](\d{1,2})$/);
    if(!m) return null;
    return {
        month: parseInt(m[1],10),
        day: parseInt(m[2],10)
    };
}

function renderBirthday(mode=birthdayMode){
  birthdayMode = mode;
  const now = new Date();
  const cm = now.getMonth()+1, cd = now.getDate();
  let data = getMembers().filter(m=>m.birthday);
  if(mode === "today") data = data.filter(m=>{ const d=parseMonthDay(m.birthday); return d && d.month===cm && d.day===cd; });
  if(mode === "month") data = data.filter(m=>{ const d=parseMonthDay(m.birthday); return d && d.month===cm; });
  const box = document.getElementById("birthdayList");
  if(data.length === 0){ box.innerHTML = `<div class="member">暂无生日会员</div>`; return; }
  box.innerHTML = data.map(m=>{
    const phoneView = currentUser && currentUser.role === "admin" ? m.phone : maskPhone(m.phone);
    return `<div class="member"><strong>${m.name}</strong><br>电话：${phoneView}<br>生日：${m.birthday}<br>门店：${m.store}<br>${profileHtml(m)}</div>`;
  }).join("");
}

async function renderMembers(){
  const box = document.getElementById("memberList");
  if(!currentUser || currentUser.role === "staff"){
    box.innerHTML = `<div class="member">无权限查看</div>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .order("id", { ascending: false });

  if(error){
    box.innerHTML = `<div class="member">读取失败：${error.message}</div>`;
    return;
  }

  if(!data || data.length === 0){
    box.innerHTML = `<div class="member">暂无会员</div>`;
    return;
  }

  box.innerHTML = data.map(m=>{
    const phoneView = currentUser.role === "admin" ? m.phone : maskPhone(m.phone);
    return `<div class="member"><strong>${m.name}</strong><br>电话：${phoneView}<br>生日：${m.birthday || "未登记"}<br>等级：${m.level || "普通会员"}</div>`;
  }).join("");
}
async function deleteMember(id){

    if(!confirm("确定删除该会员吗？")){
        return;
    }

    const { error } = await supabaseClient
        .from("members")
        .delete()
        .eq("id", id);

    if(error){
        alert(error.message);
        return;
    }

    searchMember();
    renderAll();

    alert("删除成功");
}
async function editMember(id){
    

  const { data: m, error } = await supabaseClient
.from("members")
.select("*")
.eq("id", id)
.single();

if(error){
    alert(error.message);
    return;
}
  
  const name = prompt("会员姓名：", m.name || "");
  if(name === null) return;

  const birthday = prompt("生日（例如 1980-05-20）：", m.birthday || "");
 const customerType = prompt(
"客户类型请输入：japanese / chinese / student / tourist / vip",
m.customer_type || "japanese"
);
  const scene = prompt("来店场景：", m.scene || "");
  const food = prompt("菜品偏好：", m.food || "");
  const taste = prompt("口味属性：", m.taste || "");
  const remark = prompt("备注：", m.remark || "");

 const { error: updateError } = await supabaseClient
.from("members")
.update({
    name: name,
    birthday: birthday,
   customer_type: customerType,
    scene: scene,
    food: food,
    taste: taste,
    remark: remark
})
.eq("id", id);

if(updateError){
    alert(updateError.message);
    return;
}

searchMember();

renderAll();

alert("会员资料已更新");
}
function changeStatus(s){
  const t = labels[lang];
  const name = t[s === "open" ? "open" : s === "busy" ? "busy" : s === "stop" ? "stop" : "closed"];
  if(confirm("确认切换为：" + name + "？")){
    saveStatus(s);
    updateStatusText();
    renderStats();
  }
}

function updateStatusText(){
  const s = getStatus();
  const t = labels[lang];
  const name = t[s === "open" ? "open" : s === "busy" ? "busy" : s === "stop" ? "stop" : "closed"];
  const emoji = s==="open"?"🟢":s==="busy"?"🟡":s==="stop"?"🔴":"⚫";
  const box = document.getElementById("statusResult");
  if(box) box.innerText = emoji + " 当前状态：" + name;
  const stat = document.getElementById("statStatus");
  if(stat) stat.innerText = name;
}

function renderStats(){
  const data = getMembers();
  const now = new Date();
  const cm = now.getMonth()+1;
  const ym = now.toISOString().slice(0,7);
  document.getElementById("statTotal").innerText = data.length;
 document.getElementById("statVisit").innerText =
data.filter(m =>
    (m.visits || []).some(v =>
        (v.date || "").startsWith(ym)
    )
).length;
  document.getElementById("statBirth").innerText = data.filter(m=>{ const d=parseMonthDay(m.birthday); return d && d.month===cm; }).length;
  updateStatusText();
}

function countBy(arr, fn){
  const out = {};
  arr.forEach(x=>{ const k=fn(x); out[k]=(out[k]||0)+1; });
  return out;
}

function renderBars(targetId, data, labelFn){
  const box = document.getElementById(targetId);
  const entries = Object.entries(data);
  const total = entries.reduce((s,e)=>s+e[1],0) || 1;
  if(entries.length === 0){ box.innerHTML = "暂无数据"; return; }
  box.innerHTML = entries.map(([k,v])=>{
    const pct = Math.round(v/total*100);
    return `<div class="bar"><div class="bar-name"><span>${labelFn(k)}</span><span>${v}人</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
  }).join("");
}

function renderAnalysis(){
  const data = getMembers();
const total = data.length;

const active = data.filter(m => getActiveKey(m) === "active").length;
const warning = data.filter(m => getActiveKey(m) === "warning").length;
const sleep = data.filter(m => getActiveKey(m) === "sleep").length;
const lost = data.filter(m => getActiveKey(m) === "lost").length;

const silver = data.filter(m => getMemberLevel(m) === "银卡会员").length;
const gold = data.filter(m => getMemberLevel(m) === "金卡会员").length;
const diamond = data.filter(m => getMemberLevel(m) === "钻石会员").length;
document.getElementById("memberSummary").innerHTML = `
<h3>会员总览</h3>
会员总数：${total}<br>
🟢 活跃会员：${active}<br>
🟡 提醒会员：${warning}<br>
🟠 沉睡会员：${sleep}<br>
🔴 流失会员：${lost}<br><br>

银卡会员：${silver}<br>
金卡会员：${gold}<br>
钻石会员：${diamond}
<br><br>

<h4>30天未到店提醒</h4>

${data.filter(m => getActiveKey(m) === "lost")
.map(m => `• ${m.name}`)
.join("<br>") || "暂无"}
`;

console.log(
`会员总数:${total}
活跃会员:${active}
提醒会员:${warning}
沉睡会员:${sleep}
流失会员:${lost}
银卡会员:${silver}
金卡会员:${gold}
钻石会员:${diamond}`
);
  renderBars("typeAnalysis", countBy(data, m=>m.customerType||"unknown"), k=>label("customerType", k));
  renderBars("sceneAnalysis", countBy(data, m=>m.visitScene||"unknown"), k=>label("visitScene", k));
  renderBars("foodAnalysis", countBy(data, m=>m.foodPreference||"unknown"), k=>label("foodPreference", k));
  renderBars("tasteAnalysis", countBy(data, m=>m.tastePreference||"unknown"), k=>label("tastePreference", k));
  renderBars("activeAnalysis", countBy(data, m=>getActiveKey(m)), k=>labels[lang][k]);
  renderBars("storeAnalysis", countBy(data, m=>m.store||"未登记"), k=>k);
}

function sendPush(){
  const target = document.getElementById("pushTarget").value;
  const title = document.getElementById("pushTitle").value || "未填写标题";
  document.getElementById("pushResult").innerHTML = `<div class="member"><strong>推送对象：${target}</strong><br>${title}<br><br>LINE推送模拟成功。正式版接入LINE后会真正发送。</div>`;
}

function exportMembers(){
  if(!currentUser || currentUser.role !== "admin"){ alert("只有管理员可以导出"); return; }
  const data = getMembers();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "fuyoen_members_v5.json"; a.click(); URL.revokeObjectURL(url);
}

function clearMembers(){
  if(!currentUser || currentUser.role !== "admin"){ alert("只有管理员可以清空"); return; }
  if(confirm("确定清空全部测试会员吗？")){
    localStorage.removeItem("fuyoen_members_v5");
    renderAll();
  }
}

function renderAll(){ 
  renderMembers(); 
  renderBookings(); 
}
function addBooking() {

  const name = document.getElementById("bookingName").value;
  const phone = document.getElementById("bookingPhone").value;
  const date = document.getElementById("bookingDate").value;
  const time = document.getElementById("bookingTime").value;
  const people = document.getElementById("bookingPeople").value;
  const room = document.getElementById("bookingRoom").value;
  const note = document.getElementById("bookingNote").value;
let memberInfo = "未关联会员";
let members = getMembers();
let member = members.find(m => m.phone === phone);

if(member){
  memberInfo = member.name + "｜到店" + (member.visitCount || 0) + "次｜" + (member.activity || "普通会员");
}

  const bookingList = document.getElementById("bookingList");
if(!name){
    alert("请输入客户姓名");
    return;
}

if(!phone){
    alert("请输入联系电话");
    return;
}

if(!people){
    alert("请输入人数");
    return;
}

 bookingList.innerHTML += `
  <div style="border:1px solid #ddd;padding:10px;margin:10px 0;">
    <b>${name}</b><br>
    ${people}位<br>
    ${date} ${time}<br>
    电话：${phone}<br>
    桌号：${room}<br>
    备注：${note}
  </div>
`;
let bookings = JSON.parse(localStorage.getItem("fuyoen_bookings") || "[]");

bookings.push({
    name,
    phone,
    date,
    time,
    people,
    room,
    note,
    memberInfo,
    status: "已预约"
});
localStorage.setItem(
    "fuyoen_bookings",
    JSON.stringify(bookings)
);
document.getElementById("bookingName").value = "";
document.getElementById("bookingPhone").value = "";
document.getElementById("bookingDate").value = "";
document.getElementById("bookingTime").value = "";
document.getElementById("bookingPeople").value = "";
document.getElementById("bookingRoom").value = "";
document.getElementById("bookingNote").value = "";

alert("预约保存成功");

}


async function renderBookings() {
  const bookingList = document.getElementById("bookingList");
  if (!bookingList) return;

 let { data: bookings, error } = await supabaseClient
  .from("bookings")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  console.log("预约读取失败", error);
  bookings = [];
}
const todayStats = document.getElementById("bookingTodayStats");

const totalCount = bookings.length;

const totalPeople = bookings.reduce((sum, b) => sum + Number(b.people || 0), 0);

const bookedCount = bookings.filter(b => b.status === "已预约").length;

const arrivedCount = bookings.filter(b => b.status === "已到店").length;

const cancelCount = bookings.filter(b => b.status === "已取消").length;

todayStats.innerHTML = `
<div style="padding:10px;background:#f5f5f5;border-radius:8px;margin-bottom:15px;">
<b>预约统计</b><br>
总预约：${totalCount} 组<br>
总人数：${totalPeople} 人<br>
已预约：${bookedCount} 组<br>
已到店：${arrivedCount} 组<br>
已取消：${cancelCount} 组
</div>
`;

  if (bookings.length === 0) {
    bookingList.innerHTML = "暂无预约记录";
    return;
  }

  bookingList.innerHTML = bookings.map((b,index) => `
    <div style="border:1px solid #ddd;padding:10px;margin:10px 0;">
      <b>${b.name}</b><br>
      ${b.people}位<br>
    ${b.booking_date} ${b.booking_time}<br>
      电话：${b.phone}<br>
     桌号：${b.table_no || ""}<br>
      备注：${b.note}<br>
      会员信息：LINE预约客人<br>
     状态：
<select onchange="changeBookingStatus(${index},this.value)">
<option value="已预约" ${b.status === "已预约" ? "selected" : ""}>已预约</option>
<option value="已到店" ${b.status === "已到店" ? "selected" : ""}>已到店</option>
<option value="已取消" ${b.status === "已取消" ? "selected" : ""}>已取消</option>
</select>

<br><br>

<button onclick="deleteBooking(${index})"
style="background:#ff4d4f;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">
删除预约
</button>
    </div>
  `).join("");
}


function changeBookingStatus(index, status){
  let bookings = JSON.parse(localStorage.getItem("fuyoen_bookings") || "[]");

  let oldStatus = bookings[index].status;

  bookings[index].status = status;

if(oldStatus !== "已到店" && status === "已到店"){

    let members = getMembers();
    let member = members.find(m => m.phone === bookings[index].phone);

    if(member){

        if(!member.visits){
            member.visits = [];
        }

        member.visits.push({
            date: new Date().toISOString()
        });

        bookings[index].memberInfo =
            member.name +
            "｜到店" +
            member.visits.length +
            "次｜" +
            (member.activity || "普通会员");

        saveMembers(members);

    }
}

  localStorage.setItem("fuyoen_bookings", JSON.stringify(bookings));

  renderBookings();
  renderMembers();
}
function deleteBooking(index){
  if(!confirm("确定删除这条预约吗？")){
    return;
  }

  let bookings = JSON.parse(localStorage.getItem("fuyoen_bookings") || "[]");

  bookings.splice(index, 1);

  localStorage.setItem("fuyoen_bookings", JSON.stringify(bookings));
console.log("预约数据准备上传Supabase");

  renderBookings();

  alert("预约已删除");
}
function copyLink(id){
    const input = document.getElementById(id);

    input.select();
    input.setSelectionRange(0,99999);

    document.execCommand("copy");

    alert("链接已复制");
}


function saveBookingLinks(){

    localStorage.setItem("shop1Link",
        document.getElementById("shop1Link").value);

    localStorage.setItem("shop2Link",
        document.getElementById("shop2Link").value);

    localStorage.setItem("kyotoLink",
        document.getElementById("kyotoLink").value);

    localStorage.setItem("parcoLink",
        document.getElementById("parcoLink").value);

    alert("预约链接已保存");

}
function loadBookingLinks(){

    if(localStorage.getItem("shop1Link")){
        document.getElementById("shop1Link").value =
        localStorage.getItem("shop1Link");
    }

    if(localStorage.getItem("shop2Link")){
        document.getElementById("shop2Link").value =
        localStorage.getItem("shop2Link");
    }

    if(localStorage.getItem("kyotoLink")){
        document.getElementById("kyotoLink").value =
        localStorage.getItem("kyotoLink");
    }

    if(localStorage.getItem("parcoLink")){
        document.getElementById("parcoLink").value =
        localStorage.getItem("parcoLink");
    }

}
function previewQRCode(input, boxId){
    const file = input.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(e){
        document.getElementById(boxId).innerHTML =
        `<img src="${e.target.result}"
        style="width:160px;height:160px;object-fit:contain;">`;
    };

    reader.readAsDataURL(file);
}
// ===== 客人预约页面：LINE入口用 =====
(function(){
  const params = new URLSearchParams(window.location.search);
  const storeCode = params.get("store");

  if(!storeCode) return;

  const storeMap = {
    "1f": "長堀橋店 1階｜四川料理",
    "2f": "長堀橋店 2階｜火鍋・四川料理",
    "hotpot": "長堀橋店 2階｜火鍋・四川料理",
    "kyoto": "京都店｜火鍋・四川料理",
    "parco": "PARCO店｜小籠包・四川料理"
  };

  const storeName = storeMap[storeCode] || "大阪芙蓉苑";

  document.body.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.25);">
        <h1 style="color:#8b0000;margin-bottom:6px;">大阪芙蓉苑</h1>
        <h2 style="margin-top:0;">${storeName} 予約</h2>
        <p style="color:#666;">ご予約内容をご入力ください。</p >

        <label>お名前 / 姓名</label>
        <input id="guestName" style="width:100%;padding:12px;margin:8px 0 14px;border:1px solid #ddd;border-radius:8px;">

        <label>電話番号 / 电话</label>
        <input id="guestPhone" style="width:100%;padding:12px;margin:8px 0 14px;border:1px solid #ddd;border-radius:8px;">

        <label>予約日 / 日期</label>
        <input id="guestDate" type="date" style="width:100%;padding:12px;margin:8px 0 14px;border:1px solid #ddd;border-radius:8px;">

        <label>予約時間 / 时间</label>
        <input id="guestTime" type="time" style="width:100%;padding:12px;margin:8px 0 14px;border:1px solid #ddd;border-radius:8px;">

        <label>人数 / 人数</label>
        <input id="guestPeople" type="number" min="1" style="width:100%;padding:12px;margin:8px 0 14px;border:1px solid #ddd;border-radius:8px;">

        <label>备注 / ご要望</label>
        <textarea id="guestNote" rows="3" style="width:100%;padding:12px;margin:8px 0 18px;border:1px solid #ddd;border-radius:8px;"></textarea>

        <button onclick="submitGuestBooking()" style="width:100%;padding:14px;background:#b00020;color:white;border:none;border-radius:10px;font-size:18px;font-weight:bold;">
          予約する / 提交预约
        </button>

        <p style="font-size:12px;color:#888;margin-top:16px;">
          ※送信後、店舗より確認のご連絡をする場合があります。
        </p >
      </div>
    </div>
  `;

 window.submitGuestBooking = async function(){
    const name = document.getElementById("guestName").value.trim();
    const phone = document.getElementById("guestPhone").value.trim();
    const date = document.getElementById("guestDate").value;
    const time = document.getElementById("guestTime").value;
    const people = document.getElementById("guestPeople").value;
    const note = document.getElementById("guestNote").value.trim();

    if(!name || !phone || !date || !time || !people){
      alert("お名前・電話・日付・時間・人数を入力してください。");
      return;
    }

    const { error } = await supabaseClient
  .from("bookings")
  .insert([{
    name: name,
    phone: phone,
    store_code: storeCode,
    booking_date: date,
    booking_time: time,
    people: Number(people),
    table_no: "",
    note: note,
    status: "已预约"
  }]);

if (error) {
  alert("预约保存失败：" + error.message);
  return;
}
    document.body.innerHTML = `
      <div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;">
        <div style="max-width:520px;margin:80px auto;background:white;border-radius:18px;padding:28px;text-align:center;">
          <h1 style="color:#8b0000;">预约已提交</h1>
          <p>ありがとうございます。ご予約を受け付けました。</p >
          <p><b>${storeName}</b></p >
          <p>${date} ${time} / ${people}名様</p >
        </div>
      </div>
    `;
  };
})();
let lastBookingId = null;
let bookingAlertStarted = false;

function playBookingSound() {
  const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
  audio.play().catch(() => {});
}

async function checkNewBookingAlert() {
  const { data, error } = await supabaseClient
    .from("bookings")
    .select("id,name,phone,booking_date,booking_time,people,note")
    .order("id", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return;

  const newest = data[0];

  if (lastBookingId === null) {
    lastBookingId = newest.id;
    return;
  }

 if (newest.id !== lastBookingId) {
    lastBookingId = newest.id;

    renderBookings();
}
}

function startBookingAlert() {
  if (bookingAlertStarted) return;
  bookingAlertStarted = true;
  checkNewBookingAlert();
  setInterval(checkNewBookingAlert, 30000);
}

startBookingAlert();
