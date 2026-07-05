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
    activeOften:"常来", activeNormal:"一般", inactive30:"30天未到店", inactive90:"90天沉睡",
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

function saveMember(){
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const birthday = document.getElementById("birthdayInput").value.trim();
  const store = document.getElementById("store").value;
  const customerType = document.getElementById("customerType").value;
  const visitScene = document.getElementById("visitScene").value;
  const foodPreference = document.getElementById("foodPreference").value;
  const tastePreference = document.getElementById("tastePreference").value;
  if(!name || !phone){ alert("请输入姓名和电话"); return; }
  const data = getMembers();
  data.push({ id:Date.now(), name, phone, birthday, store, customerType, visitScene, foodPreference, tastePreference, lineBound:true, createdAt:new Date().toISOString().slice(0,10), visits:[] });
  saveMembers(data);
  alert("会员保存成功");
  ["name","phone","birthdayInput"].forEach(id=>document.getElementById(id).value="");
  renderAll();
}

function profileHtml(m){
  return `客户类型：${label("customerType", m.customerType)}<br>来店场景：${label("visitScene", m.visitScene)}<br>菜品偏好：${label("foodPreference", m.foodPreference)}<br>口味属性：${label("tastePreference", m.tastePreference)}`;
}

function searchMember(){
  const last4 = document.getElementById("searchPhone").value.trim();
  const data = getMembers();
  const found = data.filter(m => String(m.phone).replace(/\D/g,"").slice(-4) === last4);
  const box = document.getElementById("searchResult");
  if(found.length === 0){ box.innerHTML = `<div class="member">未找到会员</div>`; return; }
  if(found.length > 1){ box.innerHTML = `<div class="member">找到多个会员，请确认姓名或让客人出示LINE会员页面。</div>`; return; }
  const m = found[0];
  const phoneView = currentUser.role === "admin" ? m.phone : maskPhone(m.phone);
  box.innerHTML = `<div class="member"><strong>${m.name}</strong><br>电话：${phoneView}<br>生日：${m.birthday || "未登记"}<br>常去门店：${m.store}<br>${profileHtml(m)}<br><span class="badge">LINE已绑定</span><span class="badge badge-yellow">${getActiveLabel(m)}</span><br><button class="red" style="margin-top:12px" onclick="recordVisit(${m.id})">今日到店</button></div>`;
}

function recordVisit(id){
  const data = getMembers();
  const m = data.find(x=>x.id === id);
  if(!m) return;
  const today = new Date().toISOString().slice(0,10);
  m.visits = m.visits || [];
  if(!m.visits.includes(today)) m.visits.push(today);
  saveMembers(data);
  alert("已记录今日到店");
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
  if(visits.length === 0) return "inactive90";
  const last = visits.slice().sort().pop();
  const days = daysSince(last);
  if(days >= 90) return "inactive90";
  if(days >= 30) return "inactive30";
  if(visits.length >= 3) return "activeOften";
  return "activeNormal";
}

function getActiveLabel(m){ return labels[lang][getActiveKey(m)]; }

function parseMonthDay(b){
  const m = String(b||"").match(/(\d{1,2})[\/\-\.](\d{1,2})/);
  if(!m) return null;
  return {month:parseInt(m[1],10), day:parseInt(m[2],10)};
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

function renderMembers(){
  const box = document.getElementById("memberList");
  if(!currentUser || currentUser.role === "staff"){ box.innerHTML = `<div class="member">无权限查看</div>`; return; }
  const data = getMembers();
  if(data.length === 0){ box.innerHTML = `<div class="member">暂无会员</div>`; return; }
  box.innerHTML = data.map(m=>{
    const phoneView = currentUser.role === "admin" ? m.phone : maskPhone(m.phone);
    return `<div class="member"><strong>${m.name}</strong><br>电话：${phoneView}<br>生日：${m.birthday || "未登记"}<br>门店：${m.store}<br>${profileHtml(m)}<br>到店次数：${(m.visits||[]).length}<br>活跃度：${getActiveLabel(m)}<br>注册日期：${m.createdAt}</div>`;
  }).join("");
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
  document.getElementById("statVisit").innerText = data.filter(m=>(m.visits||[]).some(v=>v.startsWith(ym))).length;
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

function renderAll(){ renderStats(); renderBirthday(birthdayMode); renderMembers(); renderAnalysis(); }
