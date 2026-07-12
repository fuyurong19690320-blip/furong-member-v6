/* V7.3 三层权限 + 独立首页 */
const SUPABASE_URL = 'https://unrkdxrqmhgxlmgzxyqs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_optM3gsSn5pV-2aQo23Rpg_ndL99Rr_';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let currentUser = null;
let lang = 'zh';
let birthdayMode = 'month';
let cacheMembers = [];
let cacheBookings = [];
let lastBookingId = null;
let bookingAlertStarted = false;

const users = {
  admin: { password: '1234', role: 'admin', labelZh: '超级管理员', labelJa: '管理者', storeScope:'all' },

  // 兼容旧测试账号：默认本店一楼
  manager: { password: '1234', role: 'manager', labelZh: '本店一楼店长', labelJa: '店長', storeScope:'1f' },
  front: { password: '1234', role: 'front', labelZh: '本店一楼前台', labelJa: 'フロント', storeScope:'1f' },
  staff: { password: '1234', role: 'staff', labelZh: '本店一楼服务员', labelJa: 'スタッフ', storeScope:'1f' },

  // 店长账号
  manager_main: { password: '1234', role: 'manager', labelZh: '本店一楼店长', labelJa: '店長', storeScope:'1f' },
  manager_2f: { password: '1234', role: 'manager', labelZh: '本店二楼火锅店长', labelJa: '店長', storeScope:'2f' },
  manager_kyoto: { password: '1234', role: 'manager', labelZh: '京都店店长', labelJa: '店長', storeScope:'kyoto' },
  manager_parco: { password: '1234', role: 'manager', labelZh: 'PARCO店店长', labelJa: '店長', storeScope:'parco' },

  // 前台账号
  front_main: { password: '1234', role: 'front', labelZh: '本店一楼前台', labelJa: 'フロント', storeScope:'1f' },
  front_2f: { password: '1234', role: 'front', labelZh: '本店二楼前台', labelJa: 'フロント', storeScope:'2f' },
  front_kyoto: { password: '1234', role: 'front', labelZh: '京都店前台', labelJa: 'フロント', storeScope:'kyoto' },
  front_parco: { password: '1234', role: 'front', labelZh: 'PARCO店前台', labelJa: 'フロント', storeScope:'parco' },

  // 服务员账号
  staff_main: { password: '1234', role: 'staff', labelZh: '本店一楼服务员', labelJa: 'スタッフ', storeScope:'1f' },
  staff_2f: { password: '1234', role: 'staff', labelZh: '本店二楼服务员', labelJa: 'スタッフ', storeScope:'2f' },
  staff_kyoto: { password: '1234', role: 'staff', labelZh: '京都店服务员', labelJa: 'スタッフ', storeScope:'kyoto' },
  staff_parco: { password: '1234', role: 'staff', labelZh: 'PARCO店服务员', labelJa: 'スタッフ', storeScope:'parco' }
};

const stores = {
  '1f': '長堀橋店 1階｜四川料理',
  '2f': '長堀橋店 2階｜火鍋・四川料理',
  hotpot: '長堀橋店 2階｜火鍋・四川料理',
  kyoto: '京都店｜火鍋・四川料理',
  parco: 'PARCO店｜小籠包・四川料理'
};

const storeAliases = { hotpot:'2f', main:'1f', main_1f:'1f', main_2f:'2f' };
function normalizeStoreCode(code){ const c=String(code||'').trim(); return storeAliases[c] || c || ''; }
function storeName(code){ const c=normalizeStoreCode(code); return stores[c] || stores[code] || code || '未登记'; }
function currentStoreScope(){ return currentUser ? normalizeStoreCode(currentUser.storeScope || 'all') : 'all'; }
function isAllStoreScope(){ return currentStoreScope()==='all'; }
function scopeStoreName(){ return isAllStoreScope() ? '全部门店' : storeName(currentStoreScope()); }
function bookingStoreCode(b){ return normalizeStoreCode(b && b.store_code); }
function memberStoreCode(m){
  const code=normalizeStoreCode(memberValue(m,'store_code','storeCode'));
  if(code) return code;
  const text=String(memberValue(m,'store')||'');
  if(text.includes('京都')) return 'kyoto';
  if(text.toLowerCase().includes('parco') || text.includes('PARCO')) return 'parco';
  if(text.includes('2階') || text.includes('二楼') || text.includes('火鍋') || text.includes('火锅')) return '2f';
  if(text.includes('1階') || text.includes('一楼')) return '1f';
  return '';
}
function inCurrentStoreScope(code){ const scope=currentStoreScope(); if(scope==='all') return true; return normalizeStoreCode(code)===scope; }
function filterBookingsByScope(data){ return isAllStoreScope() ? (data||[]) : (data||[]).filter(b=>inCurrentStoreScope(bookingStoreCode(b))); }
function filterMembersByScope(data){ return isAllStoreScope() ? (data||[]) : (data||[]).filter(m=>inCurrentStoreScope(memberStoreCode(m))); }
function canViewFullPhone(){ return currentUser && ['admin','manager','front'].includes(currentUser.role); }


const bookingChannels = {
  line:'LINE官方', google:'Google地图', phone:'电话预约', instagram:'Instagram', xiaohongshu:'小红书',
  tiktok:'TikTok', walkin:'到店预约', koc:'KOC达人', hotel:'酒店介绍', friend:'朋友介绍',
  website:'官网预约', wechat:'微信预约', tabelog:'食べログ', gurunavi:'ぐるなび', hotpepper:'HotPepper', other:'其他'
};
const bookingPurposes = {
  normal:'普通用餐', birthday:'生日', family:'家庭聚餐', company:'公司聚餐', business:'商务宴请',
  friends:'朋友聚会', couple:'情侣约会', tourist:'旅游', other:'其他'
};
const childChairLabels = { yes:'需要儿童椅', no:'不需要儿童椅' };
const seatLabels = { none:'无座位要求', window:'靠窗', private:'包间', quiet:'安静位置', near_exit:'靠近出口', other:'其他' };

const kyotoTables = [
  {id:'A1', seats:4, zone:'A区'}, {id:'A2', seats:4, zone:'A区'},
  {id:'A3', seats:4, zone:'A区'}, {id:'A4', seats:4, zone:'A区'},
  {id:'B1', seats:6, zone:'B区'}, {id:'B2', seats:6, zone:'B区'},
  {id:'C1', seats:6, zone:'C区'}, {id:'C2', seats:6, zone:'C区'},
  {id:'C3', seats:6, zone:'C区'}, {id:'C4', seats:6, zone:'C区'},
  {id:'C5', seats:6, zone:'C区'}, {id:'C6', seats:6, zone:'C区'},
  {id:'VIP', seats:6, zone:'VIP室', vip:true}
];

function kyotoTableLabel(t){
  return t.vip ? `VIP室（${t.seats}人座・需店铺确认）` : `${t.id}（${t.seats}人座）`;
}
function bookingBlocksTable(b){
  return !['已取消','No Show'].includes(String(b.status||''));
}
async function occupiedKyotoTables(date,time,excludeId=null){
  if(!date || !time || !supabaseClient) return new Set();
  const {data,error}=await supabaseClient.from('bookings')
    .select('id,table_no,status')
    .eq('store_code','kyoto')
    .eq('booking_date',date)
    .eq('booking_time',time);
  if(error){ console.error('京都桌台读取失败',error); return new Set(); }
  return new Set((data||[])
    .filter(b=>bookingBlocksTable(b) && (!excludeId || Number(b.id)!==Number(excludeId)))
    .map(b=>String(b.table_no||'').trim().toUpperCase())
    .filter(Boolean));
}
async function fillKyotoTableSelect(selectEl,{people,date,time,currentValue='',allowOther=false,excludeId=null}={}){
  if(!selectEl) return;
  const count=Number(people||0);
  const occupied=await occupiedKyotoTables(date,time,excludeId);
  const options=['<option value="">请选择桌号</option>'];
  kyotoTables.forEach(t=>{
    const tooSmall=count>0 && count>t.seats;
    const isOccupied=occupied.has(t.id);
    const disabled=tooSmall || isOccupied;
    let suffix='';
    if(tooSmall) suffix='（人数超过座位数）';
    else if(isOccupied) suffix='（该时段已预约）';
    else if(count>0 && t.seats===count) suffix='（推荐）';
    options.push(`<option value="${t.id}" ${disabled?'disabled':''} ${currentValue===t.id?'selected':''}>${kyotoTableLabel(t)}${suffix}</option>`);
  });
  if(allowOther) options.push(`<option value="OTHER" ${currentValue==='OTHER'?'selected':''}>其他 / 暂不分配</option>`);
  selectEl.innerHTML=options.join('');
}
async function refreshBackendBookingTables(){
  const room=$('bookingRoom');
  if(!room) return;
  const selectedStore=$('bookingStore') ? normalizeStoreCode($('bookingStore').value) : currentStoreScope();
  const storeCode=isAllStoreScope()?selectedStore:currentStoreScope();
  const hint=$('bookingTableHint');
  if(storeCode==='kyoto'){
    await fillKyotoTableSelect(room,{
      people:$('bookingPeople')?.value,
      date:$('bookingDate')?.value,
      time:$('bookingTime')?.value,
      currentValue:room.value,
      allowOther:true
    });
    if(hint) hint.textContent='京都店桌号：A1-A4为4人座，B1-B2、C1-C6和VIP室为6人座。';
  }else{
    room.innerHTML='<option value="">桌号 / 包间（可选）</option><option value="OTHER">其他 / 暂不分配</option>';
    if(hint) hint.textContent='非京都店可暂不分配桌号。';
  }
}
let bookingFilter = { status:'active', channel:'all', keyword:'', date:'' };

function channelName(v){ return bookingChannels[v] || v || '未登记'; }
function purposeName(v){ return bookingPurposes[v] || v || '普通用餐'; }
function getBookingMeta(note){
  const out={channel:'other', purpose:'normal', childChair:'no', seatRequest:'none', firstSource:'', memberId:'', memberStatus:'', birthday:'', raw:''};
  const text=String(note||'');
  const lines=text.split(/\n/);
  const raws=[];
  lines.forEach(line=>{
    const clean=line.trim();
    if(clean.startsWith('[渠道]')) out.channel=clean.replace('[渠道]','').trim()||out.channel;
    else if(clean.startsWith('[目的]')) out.purpose=clean.replace('[目的]','').trim()||out.purpose;
    else if(clean.startsWith('[儿童椅]')) out.childChair=clean.replace('[儿童椅]','').trim()||out.childChair;
    else if(clean.startsWith('[座位]')) out.seatRequest=clean.replace('[座位]','').trim()||out.seatRequest;
    else if(clean.startsWith('[首次来源]')) out.firstSource=clean.replace('[首次来源]','').trim();
    else if(clean.startsWith('[会员ID]')) out.memberId=clean.replace('[会员ID]','').trim();
    else if(clean.startsWith('[会员状态]')) out.memberStatus=clean.replace('[会员状态]','').trim();
    else if(clean.startsWith('[生日]')) out.birthday=clean.replace('[生日]','').trim();
    else if(clean) raws.push(clean);
  });
  const lowered=text.toLowerCase();
  if(out.channel==='other' && text){
    if(lowered.includes('line') || text.includes('ライン')) out.channel='line';
    else if(lowered.includes('google') || text.includes('グーグル')) out.channel='google';
    else if(text.includes('电话') || text.includes('電話')) out.channel='phone';
    else if(lowered.includes('instagram') || lowered.includes('ins')) out.channel='instagram';
    else if(text.includes('小红书') || lowered.includes('xiaohongshu')) out.channel='xiaohongshu';
    else if(lowered.includes('tiktok') || text.includes('抖音')) out.channel='tiktok';
    else if(text.includes('到店') || lowered.includes('walk')) out.channel='walkin';
    else if(text.includes('ホテル') || text.includes('酒店')) out.channel='hotel';
  }
  if(!out.firstSource) out.firstSource=out.channel;
  out.raw=raws.join('\n').trim();
  return out;
}
function buildBookingNote(raw, meta={}){
  const channel=meta.channel||'other';
  const purpose=meta.purpose||'normal';
  const childChair=meta.childChair||'no';
  const seatRequest=meta.seatRequest||'none';
  const firstSource=meta.firstSource||channel;
  const memberId=meta.memberId||'';
  const memberStatus=meta.memberStatus||'';
  const birthday=meta.birthday||'';
  const body=String(raw||'').trim();
  return `[渠道]${channel}
[首次来源]${firstSource}
[目的]${purpose}
[儿童椅]${childChair}
[座位]${seatRequest}`
    +(memberId?`
[会员ID]${memberId}`:'')
    +(memberStatus?`
[会员状态]${memberStatus}`:'')
    +(birthday?`
[生日]${birthday}`:'')
    +(body?`\n${body}`:'');
}
function bookingStatusGroup(status){
  if(status==='已取消') return 'cancel';
  if(status==='No Show' || status==='爽约') return 'noshow';
  if(status==='已到店' || status==='已完成') return 'done';
  return 'active';
}
function bookingMemberByPhone(phone){
  const n=String(phone||'').replace(/\D/g,'');
  return cacheMembers.find(m=>String(m.phone||'').replace(/\D/g,'')===n);
}

function bookingSourceSummaryHtml(bookings){
  const rows=Object.entries(countBy(bookings||[], b=>getBookingMeta(b.note).channel)).sort((a,b)=>b[1]-a[1]);
  if(!rows.length) return '<span class="channel-empty">暂无来源数据</span>';
  const total=rows.reduce((s,x)=>s+x[1],0)||1;
  return `<div class="channel-pills">${rows.map(([k,v])=>`<span class="channel-pill">${esc(channelName(k))} <b>${v}</b><small>${Math.round(v/total*100)}%</small></span>`).join('')}</div>`;
}
function bookingConversionSummaryHtml(bookings){
  const rows=Object.entries(countBy(bookings||[], b=>getBookingMeta(b.note).channel)).sort((a,b)=>b[1]-a[1]);
  if(!rows.length) return '<div class="empty-line">暂无渠道成交数据</div>';
  return rows.map(([ch,total])=>{
    const list=(bookings||[]).filter(b=>getBookingMeta(b.note).channel===ch);
    const arrived=list.filter(b=>['已到店','已完成'].includes(b.status||'')).length;
    const cancel=list.filter(b=>b.status==='已取消').length;
    const noshow=list.filter(b=>b.status==='No Show').length;
    const rate=total?Math.round(arrived/total*100):0;
    return `<div class="channel-row"><div><b>${esc(channelName(ch))}</b><span>预约${total}｜到店${arrived}｜取消${cancel}｜No Show ${noshow}</span></div><strong>${rate}%</strong></div>`;
  }).join('');
}

const typeLabel = {
  customerType: {japanese:{zh:'日本客人',ja:'日本のお客様'}, chinese:{zh:'中国客人',ja:'中国のお客様'}, other:{zh:'其他外国客人',ja:'その他外国人'}, student:{zh:'学生',ja:'学生'}, tourist:{zh:'游客',ja:'観光客'}, vip:{zh:'VIP客人',ja:'VIP'}, unknown:{zh:'不确定',ja:'不明'}},
  visitScene: {family:{zh:'家庭聚餐',ja:'家族利用'}, company:{zh:'公司聚餐',ja:'会社利用'}, couple:{zh:'情侣',ja:'カップル'}, friends:{zh:'朋友聚会',ja:'友人同士'}, alone:{zh:'一个人',ja:'一人利用'}, tourist:{zh:'游客',ja:'観光客'}, nearby:{zh:'附近居民',ja:'近隣住民'}, regular:{zh:'熟客',ja:'常連'}, unknown:{zh:'不确定',ja:'不明'}},
  foodPreference: {hotpot:{zh:'火锅',ja:'火鍋'}, sichuan:{zh:'川菜',ja:'四川料理'}, xiaolongbao:{zh:'小笼包',ja:'小籠包'}, dimsum:{zh:'点心',ja:'点心'}, dessert:{zh:'甜品',ja:'デザート'}, alcohol:{zh:'酒类',ja:'お酒'}, setmeal:{zh:'套餐',ja:'セット'}, unknown:{zh:'不确定',ja:'不明'}},
  tastePreference: {spicy_strong:{zh:'重辣',ja:'激辛'}, spicy_mild:{zh:'微辣',ja:'ピリ辛'}, no_spicy:{zh:'不吃辣',ja:'辛い物不可'}, mala:{zh:'喜欢麻味',ja:'しびれ好き'}, light:{zh:'清淡',ja:'あっさり'}, rich:{zh:'重口味',ja:'濃い味'}, unknown:{zh:'不确定',ja:'不明'}}
};

const labels = {
  zh: {dashboard:'首页仪表盘', search:'会员查询', register:'新增会员', birthday:'生日会员', status:'营业状态', members:'会员列表', analysis:'客户分析', push:'LINE推送', settings:'系统设置', logout:'退出', total:'会员总数', birthMonth:'本月生日', visitMonth:'本月到店', currentStatus:'当前状态', todayWork:'今日操作', searchSub:'输入电话后4位，店员端只显示隐藏后的电话。', name:'姓名', phone:'电话号码', birth:'生日（月日）', store:'常去门店', profile:'客户画像', customerType:'客户类型', visitScene:'来店场景', foodPreference:'菜品偏好', tastePreference:'口味属性', today:'今日生日', month:'本月生日', all:'全部生日', open:'营业中', busy:'忙碌中', stop:'停止接待', closed:'已打烊', statusSub:'店员可切换现场营业状态，防止误操作会二次确认。', save:'保存会员', searchBtn:'查询', pushBtn:'模拟发送', active:'活跃会员', warning:'提醒会员', sleep:'沉睡会员', lost:'流失会员', anaType:'客户类型', anaScene:'来店场景', anaFood:'菜品偏好', anaTaste:'口味属性', anaActive:'活跃度', anaStore:'门店分布'},
  ja: {dashboard:'ホーム', search:'会員検索', register:'会員登録', birthday:'誕生日会員', status:'営業状態', members:'会員一覧', analysis:'顧客分析', push:'LINE配信', settings:'システム設定', logout:'ログアウト', total:'会員総数', birthMonth:'今月の誕生日', visitMonth:'今月の来店', currentStatus:'現在の状態', todayWork:'本日の操作', searchSub:'電話番号下4桁を入力。スタッフ画面では番号を非表示にします。', name:'お名前', phone:'電話番号', birth:'誕生日（月日）', store:'よく行く店舗', profile:'顧客プロフィール', customerType:'顧客タイプ', visitScene:'来店シーン', foodPreference:'料理ジャンル', tastePreference:'味の好み', today:'今日の誕生日', month:'今月の誕生日', all:'すべて', open:'営業中', busy:'混雑中', stop:'受付停止', closed:'閉店', statusSub:'スタッフが店舗の営業状態を切り替えできます。誤操作防止の確認があります。', save:'保存', searchBtn:'検索', pushBtn:'送信テスト', active:'アクティブ', warning:'要フォロー', sleep:'休眠', lost:'離脱', anaType:'顧客タイプ', anaScene:'来店シーン', anaFood:'料理ジャンル', anaTaste:'味の好み', anaActive:'利用頻度', anaStore:'店舗分布'}
};

function $(id){ return document.getElementById(id); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function yen(n){ return Number(n || 0).toLocaleString('ja-JP') + '円'; }
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function compactDate(v){ return v ? String(v).slice(0,10) : ''; }
function getStatus(){ return localStorage.getItem('fuyoen_store_status_v6') || 'open'; }
function saveStatus(s){ localStorage.setItem('fuyoen_store_status_v6', s); }
function label(group,key){ key = key || 'unknown'; return ((typeLabel[group]||{})[key] || typeLabel[group].unknown)[lang]; }
function memberValue(m, ...keys){ for(const k of keys){ if(m && m[k] !== undefined && m[k] !== null && m[k] !== '') return m[k]; } return ''; }
function maskPhone(phone){ const n=String(phone||'').replace(/\D/g,''); if(n.length<8) return '****'; return n.slice(0,3)+'-****-'+n.slice(-4); }
function parseMonthDay(b){ const s=String(b||''); const m=s.match(/(\d{1,2})[\/\-.](\d{1,2})$/); if(!m) return null; return {month:parseInt(m[1],10), day:parseInt(m[2],10)}; }
function daysSince(dateStr){ if(!dateStr) return 9999; const d=new Date(dateStr); if(isNaN(d.getTime())) return 9999; return Math.floor((new Date()-d)/(1000*60*60*24)); }
function getActiveKey(m){ const days=daysSince(memberValue(m,'last_visit','lastVisit')); if(days>90) return 'lost'; if(days>30) return 'sleep'; if(days>15) return 'warning'; return 'active'; }
function getMemberLevel(m){ const total=Number(memberValue(m,'total_spent','totalSpent')||0); if(total>=100000) return '钻石会员'; if(total>=50000) return '金卡会员'; if(total>=10000) return '银卡会员'; return memberValue(m,'level') || '普通会员'; }

function chooseDate(title='请选择日期', currentValue=''){
  return new Promise(resolve=>{
    const old=document.getElementById('datePickerOverlay');
    if(old) old.remove();
    const overlay=document.createElement('div');
    overlay.id='datePickerOverlay';
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
    overlay.innerHTML=`<div style="width:min(420px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <h3 style="margin:0 0 16px">${esc(title)}</h3>
      <input id="datePickerInput" type="date" value="${esc(compactDate(currentValue))}" max="${todayStr()}" style="width:100%;box-sizing:border-box;padding:14px;border:1px solid #d1d5db;border-radius:12px;font-size:17px">
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
        <button id="datePickerClear" type="button" style="padding:10px 14px;border:0;border-radius:10px;background:#e5e7eb">清空生日</button>
        <button id="datePickerCancel" type="button" style="padding:10px 14px;border:0;border-radius:10px;background:#e5e7eb">取消</button>
        <button id="datePickerOk" type="button" style="padding:10px 14px;border:0;border-radius:10px;background:#7b1e22;color:#fff;font-weight:700">确定</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const close=value=>{ overlay.remove(); resolve(value); };
    document.getElementById('datePickerOk').onclick=()=>close(document.getElementById('datePickerInput').value);
    document.getElementById('datePickerClear').onclick=()=>close('');
    document.getElementById('datePickerCancel').onclick=()=>close(null);
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(null); });
  });
}

async function updateMemberBirthday(id){
  const m=cacheMembers.find(x=>x.id===id) || {};
  const birthday=await chooseDate('补充或修改生日（可选）',m.birthday||'');
  if(birthday===null) return;
  const {error}=await supabaseClient.from('members').update({birthday:birthday||null}).eq('id',id);
  if(error){ alert('生日保存失败：'+error.message); return; }
  alert(birthday?'生日已保存':'生日已清空');
  await fetchMembers();
  if($('searchPhone')&&$('searchPhone').value) await searchMember();
  renderAll();
}

async function fetchMembers(){
  if(!supabaseClient) return [];
  const {data,error}=await supabaseClient.from('members').select('*').order('id',{ascending:false});
  if(error){ console.error(error); return []; }
  cacheMembers=filterMembersByScope(data||[]);
  return cacheMembers;
}
async function fetchBookings(){
  if(!supabaseClient) return [];
  const {data,error}=await supabaseClient.from('bookings').select('*').order('booking_date',{ascending:false}).order('booking_time',{ascending:false});
  if(error){ console.error(error); return []; }
  cacheBookings=filterBookingsByScope(data||[]);
  return cacheBookings;
}

async function fetchConsumeLogs(memberId){
  if(!supabaseClient || !memberId) return [];
  const {data,error}=await supabaseClient
    .from('consume_logs')
    .select('*')
    .eq('member_id', memberId)
    .order('consume_date', {ascending:false})
    .order('created_at', {ascending:false});
  if(error){ console.error(error); alert('消费明细读取失败：'+error.message); return []; }
  return data || [];
}

function prepareStoreScopedInputs(){
  const scope=currentStoreScope();
  const storeSelect=$('store');
  if(storeSelect && !isAllStoreScope()){ storeSelect.value=storeName(scope); storeSelect.disabled=true; }
  if(storeSelect && isAllStoreScope()){ storeSelect.disabled=false; }
  const bookingStore=$('bookingStore');
  if(bookingStore){ bookingStore.value=isAllStoreScope()? (bookingStore.value||'1f') : scope; bookingStore.disabled=!isAllStoreScope(); }
}

function login(){
  const u=$('loginUser').value.trim(); const p=$('loginPass').value.trim();
  if(!users[u] || users[u].password!==p){ alert('账号或密码错误'); return; }
  currentUser={username:u,...users[u]}; $('loginPage').style.display='none'; $('app').style.display='block';
  applyPermission(); setLang(lang); showPage('dashboard'); startBookingAlert();
}
function logout(){ currentUser=null; $('app').style.display='none'; $('loginPage').style.display='flex'; }
function hasPermission(action){
  const role = currentUser ? currentUser.role : '';
  const rules = {
    admin: ['view_all','edit_all','delete_all','settings','push','analysis','members','status','booking','member_query','register','birthday','consume_edit','consume_delete'],
    manager: ['view_store','edit_booking','cancel_booking','analysis','members','status','booking','member_query','register','birthday','consume_edit','push'],
    front: ['booking','member_query','register','birthday','edit_booking','cancel_booking','record_consume','record_visit'],
    staff: ['booking','member_query']
  };
  return (rules[role] || []).includes(action);
}

function setNavVisible(id, visible){ const el=$(id); if(el) el.classList.toggle('hidden', !visible); }

function sidebarButton(page,label,id){ return `<button onclick="showPage('${page}')" id="${id}">${label}</button>`; }
function sidebarGroup(label){ return `<div class="menu-group-title">${label}</div>`; }
function buildSidebar(){
  const box=$('sidebar'); if(!box||!currentUser) return;
  const role=currentUser.role;
  let html='';
  if(role==='admin'){
    html += sidebarGroup('老板总览');
    html += sidebarButton('dashboard','老板驾驶舱','navDashboard');
    html += sidebarGroup('客户管理');
    html += sidebarButton('search','会员查询','navSearch');
    html += sidebarButton('register','新增会员','navRegister');
    html += sidebarButton('members','会员列表','navMembers');
    html += sidebarButton('birthday','生日会员','navBirthday');
    html += sidebarGroup('门店运营');
    html += sidebarButton('booking','全部预约','navBooking');
    html += sidebarButton('status','营业状态','navStatus');
    html += sidebarGroup('经营分析');
    html += sidebarButton('analysis','全店客户分析','navAnalysis');
    html += sidebarButton('push','LINE推送','navPush');
    html += sidebarGroup('系统管理');
    html += sidebarButton('settings','系统设置','navSettings');
  }else if(role==='manager'){
    html += sidebarGroup(scopeStoreName());
    html += sidebarButton('dashboard','店长工作台','navDashboard');
    html += sidebarGroup('今日工作');
    html += sidebarButton('booking','今日预约','navBooking');
    html += sidebarButton('birthday','今日生日','navBirthday');
    html += sidebarButton('search','会员查询','navSearch');
    html += sidebarButton('register','新增会员','navRegister');
    html += sidebarGroup('本店管理');
    html += sidebarButton('members','本店会员','navMembers');
    html += sidebarButton('status','营业状态','navStatus');
    html += sidebarButton('analysis','本店数据','navAnalysis');
  }else if(role==='front'){
    html += sidebarGroup(scopeStoreName());
    html += sidebarButton('dashboard','前台工作台','navDashboard');
    html += sidebarButton('booking','今日预约','navBooking');
    html += sidebarButton('search','会员查询','navSearch');
    html += sidebarButton('register','新增会员','navRegister');
    html += sidebarButton('birthday','今日生日','navBirthday');
  }else{
    html += sidebarGroup(scopeStoreName());
    html += sidebarButton('dashboard','今日工作','navDashboard');
    html += sidebarButton('booking','今日预约','navBooking');
    html += sidebarButton('search','会员查询','navSearch');
  }
  box.innerHTML=html;
}
function applyPermission(){
  $('roleText').innerText='当前账号：'+currentUser.username+' / '+currentUser.labelZh+' / '+scopeStoreName();
  buildSidebar();
  prepareStoreScopedInputs();
  ['bookingStore','bookingPeople','bookingDate','bookingTime'].forEach(id=>{
    const el=$(id);
    if(el && !el.dataset.tableBound){
      el.dataset.tableBound='1';
      el.addEventListener('change',refreshBackendBookingTables);
      el.addEventListener('input',refreshBackendBookingTables);
    }
  });
  refreshBackendBookingTables();
  renderAll();
}

function isVipMember(m){
  const t=String(memberValue(m,'customer_type','customerType')||'').toLowerCase();
  const level=getMemberLevel(m);
  return t==='vip' || ['金卡会员','钻石会员'].includes(level) || String(m.remark||'').toUpperCase().includes('VIP');
}
function hasKeyword(m, words){ const text=String((m&&m.remark)||'').toLowerCase(); return words.some(w=>text.includes(w)); }
function bookingMember(b){
  const p=String(b.phone||'').replace(/\D/g,'');
  return cacheMembers.find(m=>String(m.phone||'').replace(/\D/g,'')===p);
}
function roleListHtml(items, renderer){ return items.length?items.map(renderer).join(''):'<div class="role-empty">暂无</div>'; }
async function renderRoleDashboard(){
  const box=$('roleDashboardPanel'); if(!box||!currentUser) return;
  const members=cacheMembers.length?cacheMembers:await fetchMembers();
  const bookings=cacheBookings.length?cacheBookings:await fetchBookings();
  const today=todayStr();
  const todayBookings=bookings.filter(b=>String(b.booking_date||'')===today && b.status!=='已取消');
  const todayBirth=members.filter(m=>{const d=parseMonthDay(m.birthday); const n=new Date(); return d&&d.month===n.getMonth()+1&&d.day===n.getDate();});
  const vipBookings=todayBookings.filter(b=>{const m=bookingMember(b); return m&&isVipMember(m);});
  const inactive30=members.filter(m=>{const d=daysSince(m.last_visit); return d>=30&&d<90;});
  const complaintBookings=todayBookings.filter(b=>{const m=bookingMember(b); return (m&&hasKeyword(m,['投诉','客诉','complaint'])) || String(b.note||'').includes('投诉');});
  const blacklist=members.filter(m=>hasKeyword(m,['黑名单','禁止接待','blacklist']));
  const blacklistBookings=todayBookings.filter(b=>{const m=bookingMember(b); return m&&blacklist.some(x=>x.id===m.id);});
  const special=todayBookings.filter(b=>{const meta=getBookingMeta(b.note); return meta.childChair==='yes'||meta.seatRequest!=='none'||meta.purpose==='birthday'||/忌口|过敏|素食|不吃辣/.test(String(b.note||''));});

  const adminBlocks=['adminStatGrid','adminQuickCard','adminTodayBookingCard','adminChannelCard'];
  adminBlocks.forEach(id=>{if($(id)) $(id).style.display=currentUser.role==='admin'?'':'none';});

  if(currentUser.role==='admin'){
    box.innerHTML=`<div class="role-home"><div class="role-home-head"><h2>老板驾驶舱</h2><p>查看全部门店的会员、预约、消费与渠道数据。</p></div></div>`;
    return;
  }
  if(currentUser.role==='manager'){
    box.innerHTML=`<div class="role-home">
      <div class="role-home-head"><h2>${esc(scopeStoreName())} · 店长工作台</h2><p>只显示本店数据，优先处理今日重点客户和预约。</p></div>
      <div class="role-alert-grid">
        <div class="role-alert"><span>🎂 今日生日会员</span><b>${todayBirth.length}</b></div>
        <div class="role-alert good-box"><span>⭐ 今日VIP预约</span><b>${vipBookings.length}</b></div>
        <div class="role-alert warn-box"><span>❤️ 30天未到店</span><b>${inactive30.length}</b></div>
        <div class="role-alert danger-box"><span>⚠️ 今日投诉客户预约</span><b>${complaintBookings.length}</b></div>
        <div class="role-alert danger-box"><span>🚫 黑名单客户</span><b>${blacklist.length}</b></div>
        <div class="role-alert"><span>📅 今日预约</span><b>${todayBookings.length}</b></div>
      </div>
      <div class="role-list"><h3>今日重点预约</h3>${roleListHtml(todayBookings.slice().sort((a,b)=>String(a.booking_time).localeCompare(String(b.booking_time))),b=>{const m=bookingMember(b);return `<div class="role-list-item"><b>${esc(b.booking_time||'')}　${esc(b.name||'')}</b>　${esc(b.people||'')}位<br>${m&&isVipMember(m)?'⭐ VIP　':''}${complaintBookings.some(x=>x.id===b.id)?'⚠️ 投诉客户　':''}${blacklistBookings.some(x=>x.id===b.id)?'🚫 黑名单　':''}${esc(b.note||'无备注')}</div>`;})}</div>
      <div class="role-list"><h3>今日特殊要求</h3>${roleListHtml(special,b=>`<div class="role-list-item"><b>${esc(b.booking_time||'')} ${esc(b.name||'')}</b><br>${esc(b.note||'')}</div>`)}</div>
    </div>`;
    return;
  }
  const next=todayBookings.slice().sort((a,b)=>String(a.booking_time).localeCompare(String(b.booking_time)));
  const title=currentUser.role==='front'?'前台工作台':'今日工作';
  box.innerHTML=`<div class="role-home">
    <div class="role-home-head"><h2>${esc(scopeStoreName())} · ${title}</h2><p>只显示今天接待所需的信息。</p></div>
    <div class="role-alert-grid">
      <div class="role-alert"><span>今日预约</span><b>${todayBookings.length}</b></div>
      <div class="role-alert warn-box"><span>特殊要求</span><b>${special.length}</b></div>
      <div class="role-alert good-box"><span>下一组预约</span><b style="font-size:22px">${next[0]?esc(next[0].booking_time||''):'暂无'}</b></div>
    </div>
    <div class="role-list"><h3>今日接待顺序</h3>${roleListHtml(next,b=>`<div class="role-list-item"><b>${esc(b.booking_time||'')}　${esc(b.name||'')}</b>　${esc(b.people||'')}位<br>${esc(b.note||'无备注')}</div>`)}</div>
  </div>`;
}


// ===== V8.3 全界面中日文切换 =====
const fullJaMap = {
  '首页':'ホーム','首页仪表盘':'ホームダッシュボード','老板驾驶舱':'オーナーダッシュボード','店长工作台':'店長ダッシュボード','前台工作台':'フロント業務','今日工作':'本日の業務',
  '客户管理':'顧客管理','本店管理':'店舗管理','预约管理':'予約管理','营销分析':'マーケティング分析','系统管理':'システム管理',
  '会员查询':'会員検索','新增会员':'会員登録','会员列表':'会員一覧','本店会员':'店舗会員','生日会员':'誕生日会員','今日生日':'本日の誕生日','营业状态':'営業状態','客户分析':'顧客分析','本店数据':'店舗データ','LINE推送':'LINE配信','系统设置':'システム設定',
  '会员总数':'会員総数','本月生日':'今月の誕生日','本月到店':'今月の来店','今日预约':'本日の予約','今日消费':'本日の売上','当前状态':'現在の状態','今日操作':'本日の操作','今日渠道成交':'本日の流入経路実績',
  '账号':'アカウント','密码':'パスワード','登录':'ログイン','退出':'ログアウト','测试账号：':'テストアカウント：','管理员':'管理者','京都店长':'京都店 店長','京都前台':'京都店 フロント','京都服务员':'京都店 スタッフ','PARCO店长':'PARCO店 店長',
  '姓名':'氏名','电话号码':'電話番号','联系电话':'電話番号','生日（可选）':'誕生日（任意）','生日（月日）':'誕生日（月日）','常去门店':'よく利用する店舗','客户画像':'顧客プロフィール','客户类型':'顧客タイプ','来店场景':'来店シーン','菜品偏好':'料理の好み','口味属性':'味の好み','备注':'備考','保存会员':'会員を保存',
  '输入电话后4位':'電話番号下4桁を入力','输入电话后4位，店员端只显示隐藏后的电话。':'電話番号の下4桁を入力してください。スタッフ画面では電話番号を一部非表示にします。','查询':'検索',
  '今日生日':'本日の誕生日','本月生日':'今月の誕生日','全部生日':'すべての誕生日','暂无生日会员':'誕生日会員はいません',
  '营业中':'営業中','忙碌中':'混雑中','停止接待':'受付停止','已打烊':'閉店','当前状态：':'現在の状態：','店员可切换现场营业状态，防止误操作会二次确认。':'スタッフは営業状態を切り替えられます。誤操作防止のため確認画面が表示されます。',
  '预约管理':'予約管理','提交预约时，系统会按电话号码自动关联老会员；新客户会自动生成会员，无需另外注册。':'予約登録時、電話番号で既存会員を自動照合します。新規のお客様は会員として自動登録され、別途登録は不要です。','客户姓名':'お客様名','预约列表':'予約一覧','保存预约':'予約を保存','暂无预约记录':'予約はありません',
  '桌号 / 包间（京都店请选择）':'テーブル／個室（京都店は選択必須）','京都店会根据人数、日期和时间显示可选桌号。':'京都店では人数・日付・時間に応じて選択可能なテーブルを表示します。','桌号 / 包间（可选）':'テーブル／個室（任意）','其他 / 暂不分配':'その他／未割当',
  '本店一楼':'長堀橋店1階','本店二楼火锅':'長堀橋店2階 火鍋','京都店':'京都店','PARCO店':'PARCO店',
  'LINE官方':'LINE公式','Google地图':'Googleマップ','电话预约':'電話予約','小红书':'RED','到店预约':'店頭予約','KOC达人':'KOC','酒店介绍':'ホテル紹介','朋友介绍':'友人紹介','官网预约':'公式サイト予約','微信预约':'WeChat予約','其他':'その他',
  '普通用餐':'通常利用','生日':'誕生日','家庭聚餐':'家族利用','公司聚餐':'会社利用','商务宴请':'接待・会食','朋友聚会':'友人同士','情侣约会':'デート','旅游':'観光',
  '不需要儿童椅':'子ども椅子不要','需要儿童椅':'子ども椅子必要','无座位要求':'座席指定なし','靠窗':'窓側','包间':'個室','安静位置':'静かな席','靠近出口':'出口付近',
  '备注：生日、忌口、儿童椅等':'備考：誕生日、アレルギー、子ども椅子など',
  '全部会员':'全会員','日本客人':'日本人のお客様','中国客人':'中国人のお客様','本月生日会员':'今月誕生日の会員','30天未到店会员':'30日未来店の会員','90天沉睡会员':'90日休眠会員','家庭聚餐客人':'家族利用のお客様','火锅偏好客人':'火鍋が好みのお客様','不吃辣客人':'辛い物が苦手なお客様','推送标题':'配信タイトル','推送内容':'配信内容','模拟发送':'テスト配信',
  '导出会员数据':'会員データをエクスポート','清空本地缓存':'ローカルキャッシュを削除','V6已经改为优先读取Supabase，清空这里只会清除本机缓存，不会删除云端会员。':'データはSupabaseを優先して読み込みます。ここで削除されるのは端末内キャッシュのみで、クラウド上の会員データは削除されません。',
  '客户类型':'顧客タイプ','来店场景':'来店シーン','菜品偏好':'料理の好み','口味属性':'味の好み','活跃度':'アクティブ度','门店分布':'店舗別分布','会员总览':'会員概要','暂无数据':'データなし','暂无':'なし','读取中...':'読み込み中...',
  '日本客人':'日本人のお客様','中国客人':'中国人のお客様','其他外国客人':'その他外国人','不确定':'不明','情侣':'カップル','一个人':'お一人様','游客':'観光客','附近居民':'近隣住民','熟客':'常連','火锅':'火鍋','川菜':'四川料理','小笼包':'小籠包','点心':'点心','甜品':'デザート','酒类':'お酒','套餐':'セット','重辣':'激辛','微辣':'ピリ辛','不吃辣':'辛い物不可','喜欢麻味':'しびれ好き','清淡':'あっさり','重口味':'濃い味',
  '今日生日会员':'本日誕生日の会員','今日VIP预约':'本日のVIP予約','30天未到店':'30日未来店','今日投诉客户预约':'本日のクレーム顧客予約','黑名单客户':'ブラックリスト顧客','今日重点预约':'本日の重要予約','今日特殊要求':'本日の特別要望','特殊要求':'特別要望','下一组预约':'次の予約','今日接待顺序':'本日のご案内順','只显示本店数据，优先处理今日重点客户和预约。':'店舗データのみ表示し、本日の重要顧客と予約を優先して対応します。','只显示今天接待所需的信息。':'本日の接客に必要な情報のみ表示します。','查看全部门店的会员、预约、消费与渠道数据。':'全店舗の会員・予約・売上・流入経路データを表示します。',
  '电话：':'電話：','生日：':'誕生日：','门店：':'店舗：','等级：':'ランク：','积分：':'ポイント：','到店：':'来店：','最后到店：':'最終来店：','消费：':'利用：','累计：':'累計：','平均：':'平均：','最后消费：':'最終利用：','备注：':'備考：','无':'なし','未登记':'未登録','未记录':'記録なし','次':'回','位':'名',
  '今日到店':'本日来店','消费记录':'利用記録','编辑会员':'会員編集','客户档案':'顧客カルテ','删除会员':'会員削除','补充生日':'誕生日を追加','修改生日':'誕生日を変更','消费明细':'利用明細','预约记录':'予約履歴','营销建议':'マーケティング提案','近6个月消费趋势':'直近6か月の利用推移','累计消费':'累計利用額','消费次数':'利用回数','平均消费':'平均利用額','到店次数':'来店回数','流失风险：':'離脱リスク：','低':'低','中':'中','高':'高',
  '已预约':'予約済み','待确认':'確認待ち','已确认':'確認済み','已到店':'来店済み','已完成':'完了','已取消':'キャンセル','删除预约':'予約削除','修改预约':'予約変更','No Show':'無断キャンセル',
  '预约统计':'予約集計','总预约：':'予約総数：','总人数：':'総人数：','已预约：':'予約済み：','已到店：':'来店済み：','已取消：':'キャンセル：',
  '请选择桌号':'テーブルを選択してください','请先选择日期、时间和人数':'先に日付・時間・人数を選択してください','人数超过座位数':'定員超過','该时段已预约':'この時間帯は予約済み','推荐':'おすすめ','需店铺确认':'店舗確認が必要',
  '清空生日':'誕生日をクリア','取消':'キャンセル','确定':'確定','请选择日期':'日付を選択してください','补充或修改生日（可选）':'誕生日の追加・変更（任意）'
};

const fullJaPatterns = [
  [/当前账号：/g,'現在のアカウント：'],[/人/g,'人'],[/组/g,'組'],[/位/g,'名'],[/次/g,'回'],
  [/预约(\d+)/g,'予約$1'],[/到店(\d+)/g,'来店$1'],[/取消(\d+)/g,'キャンセル$1'],
  [/最后到店：/g,'最終来店：'],[/最后消费：/g,'最終利用：'],[/注册日期：/g,'登録日：']
];

const originalTextNodes = new WeakMap();
const originalAttrs = new WeakMap();
let languageObserver = null;
let translatingLanguage = false;

function translateExactText(text){
  const lead=(text.match(/^\s*/)||[''])[0], tail=(text.match(/\s*$/)||[''])[0];
  const core=text.trim();
  if(!core) return text;
  let out=fullJaMap[core] || core;
  if(out===core){
    const prefixPairs=[
      ['电话：','電話：'],['生日：','誕生日：'],['门店：','店舗：'],['桌号：','テーブル：'],['备注：','備考：'],['状态：','状態：'],['人数：','人数：'],['来源：','流入経路：'],['客户类型：','顧客タイプ：'],['来店场景：','来店シーン：'],['菜品偏好：','料理の好み：'],['口味属性：','味の好み：'],['到店次数：','来店回数：'],['注册日期：','登録日：']
    ];
    for(const [zh,ja] of prefixPairs){ if(out.startsWith(zh)){ out=ja+out.slice(zh.length); break; } }
  }
  fullJaPatterns.forEach(([re,rep])=>{ out=out.replace(re,rep); });
  return lead+out+tail;
}

function translateElementTree(root=document.body){
  if(!root) return;
  translatingLanguage=true;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const parent=node.parentElement;
    if(!parent || ['SCRIPT','STYLE'].includes(parent.tagName)) return;
    if(!originalTextNodes.has(node)) originalTextNodes.set(node,node.nodeValue);
    const source=originalTextNodes.get(node);
    node.nodeValue=lang==='ja'?translateExactText(source):source;
  });
  root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
    if(!originalAttrs.has(el)) originalAttrs.set(el,{
      placeholder:el.getAttribute('placeholder'), title:el.getAttribute('title'), aria:el.getAttribute('aria-label')
    });
    const attrs=originalAttrs.get(el);
    [['placeholder',attrs.placeholder],['title',attrs.title],['aria-label',attrs.aria]].forEach(([name,value])=>{
      if(value!==null) el.setAttribute(name,lang==='ja'?translateExactText(value):value);
    });
  });
  document.documentElement.lang=lang==='ja'?'ja':'zh-CN';
  translatingLanguage=false;
}

function startLanguageObserver(){
  if(languageObserver) return;
  languageObserver=new MutationObserver(mutations=>{
    if(translatingLanguage) return;
    if(lang!=='ja') return;
    mutations.forEach(m=>{
      if(m.type==='childList') m.addedNodes.forEach(n=>{
        if(n.nodeType===Node.TEXT_NODE){
          if(!originalTextNodes.has(n)) originalTextNodes.set(n,n.nodeValue);
          n.nodeValue=translateExactText(originalTextNodes.get(n));
        }else if(n.nodeType===Node.ELEMENT_NODE) translateElementTree(n);
      });
      if(m.type==='characterData'){
        const n=m.target;
        if(!originalTextNodes.has(n)) originalTextNodes.set(n,n.nodeValue);
        n.nodeValue=translateExactText(originalTextNodes.get(n));
      }
    });
  });
  languageObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
}

function setLang(l){
  lang=l;
  localStorage.setItem('fuyoen_ui_lang',l);
  const t=labels[l];
  const ids={navDashboard:'dashboard',navSearch:'search',navRegister:'register',navBirthday:'birthday',navStatus:'status',navMembers:'members',navAnalysis:'analysis',navPush:'push',navSettings:'settings',titleSearch:'search',titleRegister:'register',titleBirthday:'birthday',titleStatus:'status',titleMembers:'members',titleAnalysis:'analysis',titlePush:'push',titleSettings:'settings',dashboardTitle:'todayWork',searchSub:'searchSub',statTotalLabel:'total',statBirthLabel:'birthMonth',statVisitLabel:'visitMonth',statStatusLabel:'currentStatus',labelName:'name',labelPhone:'phone',labelBirthday:'birth',labelStore:'store',sectionProfile:'profile',labelCustomerType:'customerType',labelVisitScene:'visitScene',labelFoodPreference:'foodPreference',labelTastePreference:'tastePreference',birthToday:'today',birthMonth:'month',birthAll:'all',stOpen:'open',stBusy:'busy',stStop:'stop',stClosed:'closed',statusSub:'statusSub',saveBtn:'save',searchBtn:'searchBtn',pushBtn:'pushBtn',quickSearch:'search',quickRegister:'register',quickAnalysis:'analysis',anaType:'anaType',anaScene:'anaScene',anaFood:'anaFood',anaTaste:'anaTaste',anaActive:'anaActive',anaStore:'anaStore'};
  for(const id in ids){ if($(id)) $(id).innerText=t[ids[id]]; }
  if($('logoutBtn')) $('logoutBtn').innerText=t.logout;
  if(currentUser){
    buildSidebar();
    updateStatusText();
    Promise.resolve(renderAll()).then(()=>translateElementTree(document.body));
  }else{
    translateElementTree(document.body);
  }
  startLanguageObserver();
}

function showPage(id){
  if(!currentUser) return;
  const role=currentUser.role;
  const allowed={
    admin:['dashboard','search','register','birthday','status','members','booking','analysis','push','settings'],
    manager:['dashboard','search','register','birthday','status','members','booking','analysis'],
    front:['dashboard','search','register','birthday','booking'],
    staff:['dashboard','search','booking']
  };
  if(!(allowed[role]||[]).includes(id)){ alert('当前账号无权查看此页面'); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page=$(id); if(!page){ alert('页面不存在'); return; }
  page.classList.add('active');
  if(id==='booking' && $('navBooking')){ $('navBooking').innerText='预约管理'; $('navBooking').style.background=''; }
  prepareStoreScopedInputs();
  renderAll();
}

async function saveMember(){
  const selectedStore = isAllStoreScope() ? $('store').value : storeName(currentStoreScope());
  const row={name:$('name').value.trim(), phone:$('phone').value.trim(), birthday:$('birthdayInput').value.trim()||null, store:selectedStore, store_code: currentStoreScope()==='all' ? memberStoreCode({store:selectedStore}) : currentStoreScope(), customer_type:$('customerType').value, scene:$('visitScene').value, food:$('foodPreference').value, taste:$('tastePreference').value, remark:$('remark').value.trim(), points:0, level:'普通会员', visit_count:0, total_spent:0, consume_count:0};
  if(!row.name || !row.phone){ alert('请输入姓名和电话'); return; }
  const {error}=await supabaseClient.from('members').insert([row]);
  if(error){ alert('保存失败：'+error.message); return; }
  alert('会员保存成功'); ['name','phone','birthdayInput','remark'].forEach(id=>$(id).value=''); await renderAll();
}
function profileHtml(m){ return `客户类型：${label('customerType',memberValue(m,'customer_type','customerType'))}<br>来店场景：${label('visitScene',memberValue(m,'scene','visitScene'))}<br>菜品偏好：${label('foodPreference',memberValue(m,'food','foodPreference'))}<br>口味属性：${label('tastePreference',memberValue(m,'taste','tastePreference'))}<br>备注：${memberValue(m,'remark')||'无'}`; }
async function searchMember(){
  const last4=$('searchPhone').value.replace(/\D/g,'').slice(-4); const box=$('searchResult');
  if(!last4){ box.innerHTML='<div class="member">请输入电话后4位</div>'; return; }
  const data=await fetchMembers(); const found=data.filter(m=>String(m.phone||'').replace(/\D/g,'').slice(-4)===last4);
  if(found.length===0){ box.innerHTML='<div class="member">未找到会员</div>'; return; }
  if(found.length>1){ box.innerHTML=found.map(m=>memberCard(m,true)).join(''); return; }
  box.innerHTML=memberCard(found[0],true);
}
function memberCard(m,withActions=false){
  const phoneView=canViewFullPhone()?m.phone:maskPhone(m.phone);
  const total=Number(memberValue(m,'total_spent')||0);
  const count=Number(memberValue(m,'consume_count')||0);
  const avg=count?Math.round(total/count):0;
  return `<div class="member"><strong>${m.name||''}</strong><br>电话：${phoneView}<br>生日：${m.birthday||'未登记'}<br>门店：${memberValue(m,'store')||'未登记'}<br>等级：${getMemberLevel(m)}｜积分：${memberValue(m,'points')||0}<br>到店：${memberValue(m,'visit_count')||0}次｜最后到店：${memberValue(m,'last_visit')||'未记录'}<br>消费：${count}次｜累计：${yen(total)}｜平均：${yen(avg)}<br>最后消费：${memberValue(m,'last_consume')||'未记录'}<br>${profileHtml(m)}${withActions?`<div class="action-row">${hasPermission('record_visit')||hasPermission('edit_all')?`<button class="green" onclick="recordVisit(${m.id})">今日到店</button>`:''}${hasPermission('record_consume')||hasPermission('edit_all')?`<button class="orange" onclick="recordConsume(${m.id})">消费记录</button>`:''}${hasPermission('edit_all')||hasPermission('consume_edit')?`<button class="blue" onclick="editMember(${m.id})">编辑会员</button>`:''}${!m.birthday?`<button class="yellow" onclick="updateMemberBirthday(${m.id})">补充生日</button>`:''}<button class="black" onclick="showMemberStats(${m.id})">客户档案</button>${hasPermission('delete_all')?`<button class="red" onclick="deleteMember(${m.id})">删除会员</button>`:''}</div><div id="consumeHistory_${m.id}" class="consume-history"></div>`:''}</div>`;
}
async function showMemberStats(id){
  const m=cacheMembers.find(x=>x.id===id) || (await supabaseClient.from('members').select('*').eq('id',id).single()).data;
  if(!m) return;
  const box=$('consumeHistory_'+id);
  if(!box) return;

  const logs=await fetchConsumeLogs(id);
  let bookings=[];
  try{
    const phone=String(m.phone||'').replace(/\D/g,'');
    if(cacheBookings.length===0) await fetchBookings();
    bookings=cacheBookings.filter(b=>String(b.phone||'').replace(/\D/g,'')===phone);
  }catch(e){ bookings=[]; }

  const total=Number(m.total_spent||0);
  const count=Number(m.consume_count||0);
  const avg=count?Math.round(total/count):0;
  const lastVisit=m.last_visit||'未记录';
  const lastConsume=m.last_consume||'未记录';
  const visitDays=daysSince(m.last_visit);
  let risk='低';
  let riskClass='risk-low';
  let suggestion='保持正常维护，可在生日或节日前发送优惠。';
  if(visitDays>90){ risk='高'; riskClass='risk-high'; suggestion='建议发送回访优惠券或人工联系。'; }
  else if(visitDays>30){ risk='中'; riskClass='risk-mid'; suggestion='建议发送30天未到店提醒或小额优惠。'; }

  const monthMap={};
  logs.forEach(x=>{
    const ym=String(x.consume_date||x.created_at||'').slice(0,7)||'未记录';
    monthMap[ym]=(monthMap[ym]||0)+Number(x.amount||0);
  });
  const months=Object.entries(monthMap).slice(0,6);
  const maxMonth=Math.max(1,...months.map(x=>x[1]));
  const monthHtml=months.length?months.map(([ym,val])=>`
    <div class="mini-bar"><div class="mini-bar-top"><b>${esc(ym)}</b><span>${yen(val)}</span></div><div class="mini-bar-bg"><div class="mini-bar-fill" style="width:${Math.max(6,Math.round(val/maxMonth*100))}%"></div></div></div>
  `).join(''):'<div class="empty-line">暂无趋势数据</div>';

  const logHtml=logs.length?logs.map(x=>{
    const title=x.memo&&String(x.memo).trim()?x.memo:'普通消费';
    return `
    <div class="history-card">
      <div class="history-card-main">
        <b>${esc(title)}</b>
        <strong>${yen(x.amount)}</strong>
      </div>
      <div class="history-meta">📅 ${esc(compactDate(x.consume_date||x.created_at)||'未记录日期')}　📝 ${esc(x.memo||'无备注')}</div>
      ${hasPermission('consume_edit')||hasPermission('edit_all')?`<div class="mini-actions"><button class="mini-edit" onclick="editConsumeLog(${x.id},${id})">编辑</button>${hasPermission('consume_delete')||hasPermission('delete_all')?`<button class="mini-delete" onclick="deleteConsumeLog(${x.id},${id})">删除</button>`:''}</div>`:''}
    </div>`;
  }).join(''):'<div class="empty-line">暂无消费明细</div>';

  const bookingStats={total:bookings.length, done:0, cancel:0, noshow:0};
  const channelStats={};
  bookings.forEach(b=>{ const g=bookingStatusGroup(b.status); if(g==='done') bookingStats.done++; if(g==='cancel') bookingStats.cancel++; if(g==='noshow') bookingStats.noshow++; const ch=getBookingMeta(b.note).channel; channelStats[ch]=(channelStats[ch]||0)+1; });
  const channelStatsHtml=Object.entries(channelStats).map(([k,v])=>`${channelName(k)}：${v}次`).join('｜') || '暂无';
  const bookingHtml=bookings.length?`<div class="history-card booking-card"><b>预约统计</b><div class="history-meta">总预约：${bookingStats.total}次｜已到店/完成：${bookingStats.done}次｜取消：${bookingStats.cancel}次｜No Show：${bookingStats.noshow}次<br>预约来源：${esc(channelStatsHtml)}</div></div>`+bookings.slice(0,8).map(b=>{
    const meta=getBookingMeta(b.note);
    return `
    <div class="history-card booking-card">
      <div class="history-card-main"><b>${esc(b.booking_date||'未定日期')} ${esc(b.booking_time||'')}</b><strong>${esc(b.status||'')}</strong></div>
      <div class="history-meta">👥 ${esc(b.people||'')}位　🏪 ${esc(storeName(b.store_code))}　📍 ${esc(channelName(meta.channel))}　🎯 ${esc(purposeName(meta.purpose))}　📝 ${esc(meta.raw||'无备注')}</div>
    </div>`;
  }).join(''):'<div class="empty-line">暂无预约记录</div>';

  box.innerHTML=`
    <div class="crm-panel">
      <div class="crm-header">
        <div><b>${esc(m.name||'未命名会员')}</b><span>${esc(getMemberLevel(m))}</span></div>
        <div class="${riskClass}">流失风险：${risk}</div>
      </div>
      <div class="crm-grid">
        <div class="crm-stat"><span>累计消费</span><b>${yen(total)}</b></div>
        <div class="crm-stat"><span>消费次数</span><b>${count}次</b></div>
        <div class="crm-stat"><span>平均消费</span><b>${yen(avg)}</b></div>
        <div class="crm-stat"><span>到店次数</span><b>${Number(m.visit_count||0)}次</b></div>
        <div class="crm-stat"><span>最后到店</span><b>${esc(lastVisit)}</b></div>
        <div class="crm-stat"><span>最后消费</span><b>${esc(lastConsume)}</b></div>
      </div>
      <div class="crm-section"><h3>客户画像</h3><div class="crm-text">${profileHtml(m)}</div></div>
      <div class="crm-section"><h3>营销建议</h3><div class="crm-text">${esc(suggestion)}</div></div>
      <div class="crm-section"><h3>近6个月消费趋势</h3>${monthHtml}</div>
      <div class="crm-section"><h3>消费明细</h3>${logHtml}</div>
      <div class="crm-section"><h3>预约记录</h3>${bookingHtml}</div>
    </div>
  `;
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function recordVisit(id){ const m=cacheMembers.find(x=>x.id===id) || {}; const today=todayStr(); const newCount=Number(m.visit_count||0)+1; const {error}=await supabaseClient.from('members').update({last_visit:today,visit_count:newCount}).eq('id',id); if(error){ alert('记录失败：'+error.message); return; } alert('已记录今日到店，到店次数：'+newCount); await fetchMembers(); await searchMember(); renderAll(); }
async function recordConsume(id){
  const amountText=prompt('请输入本次消费金额（日元）\n例如：5800','');
  if(amountText===null) return;
  const amount=Number(amountText.replace(/,/g,''));
  if(isNaN(amount)||amount<=0){ alert('请输入正确金额'); return; }
  const memo=prompt('消费备注（可不填）\n例如：生日聚餐、火锅、包间','') || '';
  const m=cacheMembers.find(x=>x.id===id) || {};
  const today=todayStr();
  const newTotal=Number(m.total_spent||0)+amount;
  const newCount=Number(m.consume_count||0)+1;
  const log=await supabaseClient.from('consume_logs').insert({member_id:id,amount,consume_date:today,memo});
  if(log.error){ alert('消费明细保存失败：'+log.error.message); return; }
  const {error}=await supabaseClient.from('members').update({total_spent:newTotal,consume_count:newCount,last_consume:today,level:getMemberLevel({total_spent:newTotal})}).eq('id',id);
  if(error){ alert('消费记录失败：'+error.message); return; }
  alert('消费已记录\n本次消费：'+yen(amount)+'\n累计消费：'+yen(newTotal));
  await fetchMembers();
  await searchMember();
  renderAll();
  setTimeout(()=>showMemberStats(id),200);
}

async function recalcMemberConsume(memberId){
  const logs=await fetchConsumeLogs(memberId);
  const total=logs.reduce((s,x)=>s+Number(x.amount||0),0);
  const count=logs.length;
  const last=logs.length?compactDate(logs[0].consume_date||logs[0].created_at):null;
  const update={total_spent:total,consume_count:count,last_consume:last,level:getMemberLevel({total_spent:total})};
  const {error}=await supabaseClient.from('members').update(update).eq('id',memberId);
  if(error){ alert('会员消费统计更新失败：'+error.message); return false; }
  await fetchMembers();
  return true;
}

async function editConsumeLog(logId, memberId){
  const logs=await fetchConsumeLogs(memberId);
  const log=logs.find(x=>x.id===logId);
  if(!log){ alert('找不到这条消费记录'); return; }
  const amountText=prompt('修改消费金额（日元）', String(log.amount||''));
  if(amountText===null) return;
  const amount=Number(String(amountText).replace(/,/g,''));
  if(isNaN(amount)||amount<=0){ alert('请输入正确金额'); return; }
  const memo=prompt('修改消费备注', log.memo||'') || '';
  const date=prompt('修改消费日期（YYYY-MM-DD）', compactDate(log.consume_date||log.created_at)||todayStr());
  if(date===null) return;
  const {error}=await supabaseClient.from('consume_logs').update({amount,memo,consume_date:date}).eq('id',logId);
  if(error){ alert('消费明细修改失败：'+error.message); return; }
  const ok=await recalcMemberConsume(memberId);
  if(!ok) return;
  alert('消费明细已修改');
  await searchMember();
  renderAll();
  setTimeout(()=>showMemberStats(memberId),200);
}

async function deleteConsumeLog(logId, memberId){
  if(!confirm('确定删除这条消费记录吗？删除后会重新计算累计消费。')) return;
  const {error}=await supabaseClient.from('consume_logs').delete().eq('id',logId);
  if(error){ alert('消费明细删除失败：'+error.message); return; }
  const ok=await recalcMemberConsume(memberId);
  if(!ok) return;
  alert('消费明细已删除');
  await searchMember();
  renderAll();
  setTimeout(()=>showMemberStats(memberId),200);
}

async function editMember(id){
  const m=cacheMembers.find(x=>x.id===id) || {};
  const name=prompt('会员姓名：',m.name||'');
  if(name===null) return;
  const birthday=await chooseDate('生日（可选）',m.birthday||'');
  if(birthday===null) return;
  const customerType=prompt('客户类型：japanese / chinese / other / student / tourist / vip',memberValue(m,'customer_type')||'japanese');
  if(customerType===null) return;
  const scene=prompt('来店场景：family/company/couple/friends/alone/tourist/nearby/regular',memberValue(m,'scene')||'unknown');
  if(scene===null) return;
  const food=prompt('菜品偏好：hotpot/sichuan/xiaolongbao/dimsum/dessert/alcohol/setmeal',memberValue(m,'food')||'unknown');
  if(food===null) return;
  const taste=prompt('口味属性：spicy_strong/spicy_mild/no_spicy/mala/light/rich',memberValue(m,'taste')||'unknown');
  if(taste===null) return;
  const remark=prompt('备注：',m.remark||'');
  if(remark===null) return;
  const {error}=await supabaseClient.from('members').update({name,birthday:birthday||null,customer_type:customerType,scene,food,taste,remark}).eq('id',id);
  if(error){ alert(error.message); return; }
  alert('会员资料已更新');
  await fetchMembers();
  await searchMember();
  renderAll();
}

async function deleteMember(id){ if(!confirm('确定删除该会员吗？')) return; const {error}=await supabaseClient.from('members').delete().eq('id',id); if(error){ alert(error.message); return; } $('searchResult').innerHTML=''; alert('删除成功'); renderAll(); }

async function renderMembers(){ const box=$('memberList'); if(!box) return; if(!currentUser||currentUser.role==='staff'){ box.innerHTML='<div class="member">无权限查看</div>'; return; } const data=await fetchMembers(); box.innerHTML=data.length?data.map(m=>memberCard(m,false)).join(''):'<div class="member">暂无会员</div>'; }
async function renderBirthday(mode=birthdayMode){ birthdayMode=mode; const now=new Date(); const cm=now.getMonth()+1, cd=now.getDate(); let data=await fetchMembers(); data=data.filter(m=>m.birthday); if(mode==='today') data=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm&&d.day===cd;}); if(mode==='month') data=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm;}); $('birthdayList').innerHTML=data.length?data.map(m=>memberCard(m,false)).join(''):'<div class="member">暂无生日会员</div>'; }
async function renderStats(){
  const data=await fetchMembers();
  const bookings=await fetchBookings();
  const now=new Date();
  const cm=now.getMonth()+1;
  const today=todayStr();
  const todayBookings=bookings.filter(b=>b.booking_date===today);
  const activeToday=todayBookings.filter(b=>!['已取消','No Show'].includes(b.status||''));
  const arrivedToday=todayBookings.filter(b=>['已到店','已完成'].includes(b.status||'')).length;
  const cancelToday=todayBookings.filter(b=>b.status==='已取消').length;
  const noshowToday=todayBookings.filter(b=>b.status==='No Show').length;
  $('statTotal').innerText=data.length;
  $('statBirth').innerText=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm;}).length;
  $('statVisit').innerText=data.filter(m=>(m.last_visit||'')===today).length;
  if($('statBooking')) $('statBooking').innerText=activeToday.length;
  if($('statSales')){
    const {data:logs,error}=await supabaseClient.from('consume_logs').select('amount,member_id').eq('consume_date',today);
    const memberIds=new Set((data||[]).map(m=>m.id));
    const scopedLogs=isAllStoreScope() ? (logs||[]) : (logs||[]).filter(x=>memberIds.has(x.member_id));
    $('statSales').innerText=error?'读取失败':yen(scopedLogs.reduce((s,x)=>s+Number(x.amount||0),0));
  }
  if($('dashboardChannelStats')) $('dashboardChannelStats').innerHTML=bookingConversionSummaryHtml(todayBookings);
  updateStatusText();
  renderTodayBookings();
}
function updateStatusText(){ const s=getStatus(); const t=labels[lang]; const name=t[s==='open'?'open':s==='busy'?'busy':s==='stop'?'stop':'closed']; const emoji=s==='open'?'🟢':s==='busy'?'🟡':s==='stop'?'🔴':'⚫'; if($('statusResult')) $('statusResult').innerText=emoji+' 当前状态：'+name; if($('statStatus')) $('statStatus').innerText=name; }
function changeStatus(s){ const t=labels[lang]; const name=t[s==='open'?'open':s==='busy'?'busy':s==='stop'?'stop':'closed']; if(confirm('确认切换为：'+name+'？')){ saveStatus(s); updateStatusText(); renderStats(); } }

function countBy(arr,fn){ const out={}; arr.forEach(x=>{const k=fn(x)||'unknown'; out[k]=(out[k]||0)+1;}); return out; }
function renderBars(targetId,data,labelFn){ const box=$(targetId); if(!box) return; const entries=Object.entries(data); const total=entries.reduce((s,e)=>s+e[1],0)||1; if(entries.length===0){ box.innerHTML='暂无数据'; return; } box.innerHTML=entries.map(([k,v])=>{const pct=Math.round(v/total*100); return `<div class="bar"><div class="bar-name"><span>${labelFn(k)}</span><span>${v}人</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;}).join(''); }
async function renderAnalysis(){ const data=await fetchMembers(); const bookings=await fetchBookings(); const total=data.length; const active=data.filter(m=>getActiveKey(m)==='active').length; const warning=data.filter(m=>getActiveKey(m)==='warning').length; const sleep=data.filter(m=>getActiveKey(m)==='sleep').length; const lost=data.filter(m=>getActiveKey(m)==='lost').length; const silver=data.filter(m=>getMemberLevel(m)==='银卡会员').length; const gold=data.filter(m=>getMemberLevel(m)==='金卡会员').length; const diamond=data.filter(m=>getMemberLevel(m)==='钻石会员').length; const channelSummary=bookingSourceSummaryHtml(bookings); const conversion=bookingConversionSummaryHtml(bookings); $('memberSummary').innerHTML=`<h3>会员总览</h3>会员总数：${total}<br>🟢 活跃会员：${active}<br>🟡 提醒会员：${warning}<br>🟠 沉睡会员：${sleep}<br>🔴 流失会员：${lost}<br><br>银卡会员：${silver}<br>金卡会员：${gold}<br>钻石会员：${diamond}<br><br><h4>预约来源结构</h4>${channelSummary}<h4>渠道成交情况</h4>${conversion}<h4>30天以上未到店提醒</h4>${data.filter(m=>['sleep','lost'].includes(getActiveKey(m))).map(m=>'• '+m.name+'｜最后到店：'+(m.last_visit||'未记录')).join('<br>')||'暂无'}`; renderBars('typeAnalysis',countBy(data,m=>memberValue(m,'customer_type','customerType')),k=>label('customerType',k)); renderBars('sceneAnalysis',countBy(data,m=>memberValue(m,'scene','visitScene')),k=>label('visitScene',k)); renderBars('foodAnalysis',countBy(data,m=>memberValue(m,'food','foodPreference')),k=>label('foodPreference',k)); renderBars('tasteAnalysis',countBy(data,m=>memberValue(m,'taste','tastePreference')),k=>label('tastePreference',k)); renderBars('activeAnalysis',countBy(data,m=>getActiveKey(m)),k=>labels[lang][k]); renderBars('storeAnalysis',countBy(data,m=>memberValue(m,'store')||stores[m.store_code]||'未登记'),k=>k); }



function normalizePhoneNumber(phone){
  return String(phone||'').replace(/\D/g,'');
}
function purposeToScene(purpose){
  const map={family:'family',company:'company',business:'company',couple:'couple',friends:'friends',tourist:'tourist'};
  return map[purpose]||'unknown';
}
function upsertSourceRemark(remark, channel, isNew=false){
  let text=String(remark||'').trim();
  const source=channelName(channel);
  if(!/\[首次来源\]/.test(text)) text+=(text?'\n':'')+`[首次来源]${source}`;
  if(/\[最近来源\][^\n]*/.test(text)) text=text.replace(/\[最近来源\][^\n]*/,`[最近来源]${source}`);
  else text+=(text?'\n':'')+`[最近来源]${source}`;
  if(isNew && !/\[自动会员\]/.test(text)) text+=(text?'\n':'')+'[自动会员]预约自动生成';
  return text;
}
async function ensureMemberFromBooking({name,phone,birthday='',storeCode='',channel='other',purpose='normal',note=''}){
  if(!supabaseClient) return {ok:false,error:'Supabase未连接'};
  const normalized=normalizePhoneNumber(phone);
  if(!normalized) return {ok:false,error:'电话号码不能为空'};
  const {data:allMembers,error:readError}=await supabaseClient.from('members').select('*');
  if(readError) return {ok:false,error:'会员查询失败：'+readError.message};
  let member=(allMembers||[]).find(m=>normalizePhoneNumber(m.phone)===normalized);
  if(member){
    const updates={remark:upsertSourceRemark(member.remark,channel,false)};
    if(!member.birthday && birthday) updates.birthday=birthday;
    if(!member.store_code && storeCode) updates.store_code=storeCode;
    if(!member.store && storeCode) updates.store=storeName(storeCode);
    const {error:updateError}=await supabaseClient.from('members').update(updates).eq('id',member.id);
    if(updateError) return {ok:false,error:'会员关联更新失败：'+updateError.message};
    member={...member,...updates};
    return {ok:true,member,isNew:false};
  }
  const row={
    name:name||'预约客户', phone, birthday:birthday||null,
    store:storeName(storeCode)||'未登记', store_code:storeCode||null,
    customer_type:'unknown', scene:purposeToScene(purpose), food:'unknown', taste:'unknown',
    remark:upsertSourceRemark(note,channel,true),
    points:0, level:'普通会员', visit_count:0, total_spent:0, consume_count:0
  };
  const {data:newMember,error:insertError}=await supabaseClient.from('members').insert([row]).select('*').single();
  if(insertError) return {ok:false,error:'自动创建会员失败：'+insertError.message};
  return {ok:true,member:newMember,isNew:true};
}

async function addBooking(){
  const channel=$('bookingChannel') ? $('bookingChannel').value : 'phone';
  const purpose=$('bookingPurpose') ? $('bookingPurpose').value : 'normal';
  const childChair=$('bookingChildChair') ? $('bookingChildChair').value : 'no';
  const seatRequest=$('bookingSeatRequest') ? $('bookingSeatRequest').value : 'none';
  const birthday=$('bookingBirthday') ? $('bookingBirthday').value.trim() : '';
  const rawNote=$('bookingNote').value.trim();
  const selectedBookingStore=$('bookingStore') ? $('bookingStore').value : (isAllStoreScope() ? '1f' : currentStoreScope());
  const storeCode=isAllStoreScope() ? normalizeStoreCode(selectedBookingStore) : currentStoreScope();
  const name=$('bookingName').value.trim();
  const phone=$('bookingPhone').value.trim();
  const date=$('bookingDate').value;
  const time=$('bookingTime').value;
  const people=Number($('bookingPeople').value||0);
  if(!name||!phone||!date||!time||!people){ alert('请输入姓名、电话、日期、时间、人数'); return; }
  const selectedTable=$('bookingRoom') ? String($('bookingRoom').value||'').trim() : '';
  if(storeCode==='kyoto'){
    if(!selectedTable || selectedTable==='OTHER'){ alert('京都店预约请选择具体桌号'); return; }
    const table=kyotoTables.find(t=>t.id===selectedTable);
    if(!table || people>table.seats){ alert('所选桌位不足，请重新选择'); return; }
    const occupied=await occupiedKyotoTables(date,time);
    if(occupied.has(selectedTable)){
      alert('该桌在所选日期和时间已经被预约，请选择其他桌号');
      await refreshBackendBookingTables();
      return;
    }
  }

  const memberResult=await ensureMemberFromBooking({name,phone,birthday,storeCode,channel,purpose,note:rawNote});
  if(!memberResult.ok){ alert(memberResult.error); return; }

  const row={
    store_code:storeCode, name, phone, booking_date:date, booking_time:time, people,
    table_no:selectedTable==='OTHER'?'':selectedTable,
    note:buildBookingNote(rawNote,{
      channel,purpose,childChair,seatRequest,firstSource:channel,
      memberId:memberResult.member.id,
      memberStatus:memberResult.isNew?'new':'existing',
      birthday:birthday||memberResult.member.birthday||''
    }),
    status:'已预约'
  };
  const {error}=await supabaseClient.from('bookings').insert([row]);
  if(error){ alert('预约保存失败：'+error.message); return; }

  ['bookingName','bookingPhone','bookingBirthday','bookingDate','bookingTime','bookingPeople','bookingRoom','bookingNote'].forEach(id=>{if($(id)) $(id).value='';});
  if($('bookingStore')) $('bookingStore').value=isAllStoreScope()?'1f':currentStoreScope();
  if($('bookingChannel')) $('bookingChannel').value='line';
  if($('bookingPurpose')) $('bookingPurpose').value='normal';
  if($('bookingChildChair')) $('bookingChildChair').value='no';
  if($('bookingSeatRequest')) $('bookingSeatRequest').value='none';
  await refreshBackendBookingTables();
  await fetchMembers();
  alert(memberResult.isNew?'预约保存成功，并已自动生成会员':'预约保存成功，已关联原会员');
  await renderBookings(); await renderStats();
}
function bookingFilterControls(bookings){
  const today=todayStr();
  const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const countByChannel=countBy(bookings,b=>getBookingMeta(b.note).channel);
  const channelBtns=['all',...Object.keys(bookingChannels)].map(ch=>`<button class="filter-chip ${bookingFilter.channel===ch?'active':''}" onclick="setBookingFilter('channel','${ch}')">${ch==='all'?'全部来源':channelName(ch)}${ch==='all'?'':' '+(countByChannel[ch]||0)}</button>`).join('');
  return `<div class="booking-filter-box">
    <div class="filter-row">
      <button class="filter-chip ${bookingFilter.status==='active'?'active':''}" onclick="setBookingFilter('status','active')">待到店</button>
      <button class="filter-chip ${bookingFilter.date===today?'active':''}" onclick="setBookingFilter('date','${today}')">今日</button>
      <button class="filter-chip ${bookingFilter.date===tomorrow?'active':''}" onclick="setBookingFilter('date','${tomorrow}')">明日</button>
      <button class="filter-chip ${bookingFilter.status==='done'?'active':''}" onclick="setBookingFilter('status','done')">已完成</button>
      <button class="filter-chip ${bookingFilter.status==='cancel'?'active':''}" onclick="setBookingFilter('status','cancel')">已取消</button>
      <button class="filter-chip ${bookingFilter.status==='noshow'?'active':''}" onclick="setBookingFilter('status','noshow')">No Show</button>
      <button class="filter-chip" onclick="clearBookingFilter()">清除筛选</button>
    </div>
    <div class="filter-row">${channelBtns}</div>
    <div class="filter-row"><input id="bookingKeyword" placeholder="搜索姓名 / 电话 / 备注" value="${esc(bookingFilter.keyword)}" oninput="setBookingFilter('keyword',this.value)"><input id="bookingFilterDate" type="date" value="${esc(bookingFilter.date)}" onchange="setBookingFilter('date',this.value)"></div>
  </div>`;
}
function setBookingFilter(key,value){ bookingFilter[key]=value; renderBookings(); }
function clearBookingFilter(){ bookingFilter={status:'active',channel:'all',keyword:'',date:''}; renderBookings(); }
function applyBookingFilter(bookings){
  let out=[...bookings];
  if(bookingFilter.status && bookingFilter.status!=='all') out=out.filter(b=>bookingStatusGroup(b.status)===bookingFilter.status);
  if(bookingFilter.channel && bookingFilter.channel!=='all') out=out.filter(b=>getBookingMeta(b.note).channel===bookingFilter.channel);
  if(bookingFilter.date) out=out.filter(b=>b.booking_date===bookingFilter.date);
  const kw=String(bookingFilter.keyword||'').trim().toLowerCase();
  if(kw) out=out.filter(b=>[b.name,b.phone,b.booking_date,b.booking_time,b.note,b.table_no,stores[b.store_code]].join(' ').toLowerCase().includes(kw));
  return out;
}
async function renderBookings(){
  const list=$('bookingList'); if(!list) return;
  const bookings=await fetchBookings();
  const totalPeople=bookings.reduce((s,b)=>s+Number(b.people||0),0);
  const active=bookings.filter(b=>bookingStatusGroup(b.status)==='active').length;
  const arrived=bookings.filter(b=>bookingStatusGroup(b.status)==='done').length;
  const cancel=bookings.filter(b=>bookingStatusGroup(b.status)==='cancel').length;
  const noshow=bookings.filter(b=>bookingStatusGroup(b.status)==='noshow').length;
  const channelSummary=Object.entries(countBy(bookings,b=>getBookingMeta(b.note).channel)).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${channelName(k)}：${v}组`).join('｜') || '暂无渠道数据';
  if($('bookingTodayStats')) $('bookingTodayStats').innerHTML=`<div class="member"><b>预约统计</b><br>总预约：${bookings.length}组｜总人数：${totalPeople}人｜待到店：${active}组｜已完成：${arrived}组｜已取消：${cancel}组｜No Show：${noshow}组<br>来源统计：${channelSummary}</div>${bookingFilterControls(bookings)}`;
  const filtered=applyBookingFilter(bookings).sort((a,b)=>String(a.booking_date||'').localeCompare(String(b.booking_date||'')) || String(a.booking_time||'').localeCompare(String(b.booking_time||'')));
  list.innerHTML=filtered.length?filtered.map(b=>bookingCard(b)).join(''):'暂无预约记录';
}
function bookingCard(b){
  const meta=getBookingMeta(b.note);
  const member=bookingMemberByPhone(b.phone);
  const memberLine=member?`<br><span class="badge">${meta.memberStatus==='new'?'预约自动生成会员':'已关联会员'}</span> ${getMemberLevel(member)}｜累计：${yen(member.total_spent)}｜到店：${Number(member.visit_count||0)}次｜最后到店：${member.last_visit||'未记录'}`:'<br><span class="badge badge-red">会员关联异常</span>';
  return `<div class="member booking-item"><strong>${esc(b.name||'')}</strong><br>${esc(b.people||'')}位｜${esc(b.booking_date||'')} ${esc(b.booking_time||'')}<br>电话：${canViewFullPhone()?esc(b.phone):maskPhone(b.phone)}<br>门店：${esc(storeName(b.store_code))}｜桌号：${esc(b.table_no||'未登记')}<br>来源：<b>${esc(channelName(meta.channel))}</b>｜首次来源：${esc(channelName(meta.firstSource||meta.channel))}<br>目的：${esc(purposeName(meta.purpose))}｜儿童椅：${esc(childChairLabels[meta.childChair]||meta.childChair)}｜座位：${esc(seatLabels[meta.seatRequest]||meta.seatRequest)}<br>备注：${esc(meta.raw||'无')}${memberLine}<br>状态：<select onchange="changeBookingStatus(${b.id},this.value)"><option value="已预约" ${b.status==='已预约'?'selected':''}>已预约</option><option value="待确认" ${b.status==='待确认'?'selected':''}>待确认</option><option value="已确认" ${b.status==='已确认'?'selected':''}>已确认</option><option value="已到店" ${b.status==='已到店'?'selected':''}>已到店</option><option value="已完成" ${b.status==='已完成'?'selected':''}>已完成</option><option value="已取消" ${b.status==='已取消'?'selected':''}>已取消</option><option value="No Show" ${b.status==='No Show'?'selected':''}>No Show</option></select><div class="action-row"><button class="green" onclick="changeBookingStatus(${b.id},'已到店')">已到店</button>${hasPermission('edit_booking')||hasPermission('edit_all')?`<button class="blue" onclick="editBooking(${b.id})">修改预约</button><button class="orange" onclick="changeBookingStatus(${b.id},'No Show')">No Show</button>`:''}${hasPermission('delete_all')?`<button class="red" onclick="deleteBooking(${b.id})">删除预约</button>`:''}</div></div>`;
}
async function editBooking(id){
  const b=cacheBookings.find(x=>x.id===id); if(!b){ alert('找不到预约'); return; }
  const meta=getBookingMeta(b.note);
  const name=prompt('客户姓名',b.name||''); if(name===null) return;
  const phone=prompt('联系电话',b.phone||''); if(phone===null) return;
  const date=prompt('预约日期 YYYY-MM-DD',b.booking_date||todayStr()); if(date===null) return;
  const time=prompt('预约时间 HH:MM',b.booking_time||'18:00'); if(time===null) return;
  const people=Number(prompt('人数',b.people||'2')); if(!people){ alert('人数不正确'); return; }
  const channel=prompt('预约来源：line/google/phone/instagram/xiaohongshu/tiktok/walkin/koc/hotel/friend/website/wechat/tabelog/gurunavi/hotpepper/other',meta.channel||'phone')||meta.channel||'phone';
  const purpose=prompt('预约目的：normal/birthday/family/company/business/friends/couple/tourist/other',meta.purpose||'normal')||meta.purpose||'normal';
  const childChair=prompt('儿童椅：yes/no',meta.childChair||'no')||meta.childChair||'no';
  const seatRequest=prompt('座位要求：none/window/private/quiet/near_exit/other',meta.seatRequest||'none')||meta.seatRequest||'none';
  const table_no=prompt('桌号/包间',b.table_no||'')||'';
  const raw=prompt('备注',meta.raw||'')||'';
  const {error}=await supabaseClient.from('bookings').update({name,phone,booking_date:date,booking_time:time,people,table_no,note:buildBookingNote(raw,{...meta,channel,purpose,childChair,seatRequest})}).eq('id',id);
  if(error){ alert('修改失败：'+error.message); return; }
  alert('预约已修改'); await renderBookings(); await renderStats();
}
async function changeBookingStatus(id,status){
  const b=cacheBookings.find(x=>x.id===id); const oldStatus=b?b.status:'';
  const {error}=await supabaseClient.from('bookings').update({status}).eq('id',id);
  if(error){ alert(error.message); return; }
  if(oldStatus!=='已到店' && oldStatus!=='已完成' && (status==='已到店'||status==='已完成') && b&&b.phone){
    let member=bookingMemberByPhone(b.phone);
    if(!member){
      const meta=getBookingMeta(b.note);
      const ensured=await ensureMemberFromBooking({name:b.name,phone:b.phone,birthday:meta.birthday,storeCode:b.store_code,channel:meta.channel,purpose:meta.purpose,note:meta.raw});
      if(ensured.ok) member=ensured.member;
    }
    if(member) await recordVisit(member.id);
  }
  await fetchBookings();
  renderBookings(); renderStats();
}
async function deleteBooking(id){
  if(!confirm('确定删除这条预约吗？')) return;
  const {error}=await supabaseClient.from('bookings').delete().eq('id',id);
  if(error){ alert('预约删除失败：'+error.message); return; }
  alert('预约已删除');
  await fetchBookings();
  await renderBookings();
  await renderStats();
}
function renderTodayBookings(){
  const box=$('todayBookingList'); if(!box) return;
  const today=todayStr();
  const allToday=cacheBookings.filter(b=>b.booking_date===today);
  const data=allToday.filter(b=>!['已取消','No Show'].includes(b.status||'')).sort((a,b)=>String(a.booking_time).localeCompare(String(b.booking_time)));
  const arrived=allToday.filter(b=>['已到店','已完成'].includes(b.status||'')).length;
  const waiting=allToday.filter(b=>['待确认','已确认','已预约',''].includes(b.status||'')).length;
  const cancel=allToday.filter(b=>b.status==='已取消').length;
  const noshow=allToday.filter(b=>b.status==='No Show').length;
  const people=data.reduce((s,b)=>s+Number(b.people||0),0);
  const summary = `<div class="member">
    <b>今日预约看板</b><br>
    今日预约：${data.length}组｜预计人数：${people}人｜待到店：${waiting}组｜已到店：${arrived}组｜取消：${cancel}组｜No Show：${noshow}组<br>
    <div style="margin-top:8px">${bookingSourceSummaryHtml(allToday)}</div>
  </div>`;
  box.innerHTML=summary + (data.length?data.map(bookingCard).join(''):'<div class="member">今日暂无预约</div>');
}
function buildLineLinks(){ const box=$('lineLinks'); if(!box) return; const list=[['shop1Link','本店一楼四川料理预约链接','1f','shop1QR'],['shop2Link','本店二楼火锅城预约链接','2f','shop2QR'],['kyotoLink','京都火锅城预约链接','kyoto','kyotoQR'],['parcoLink','PARCO芙蓉料理预约链接','parco','parcoQR']]; box.innerHTML=list.map(([id,title,store,qr])=>{const saved=localStorage.getItem(id)||`https://warm-froyo-b511b7.netlify.app/?store=${store}`; return `<p><b>${title}</b></p><div class="link-box"><input id="${id}" type="text" value="${saved}"><button class="small-btn" onclick="copyLink('${id}')">复制</button></div><div id="${qr}" class="qr-box">后期放二维码</div><input type="file" accept="image/*" onchange="previewQRCode(this,'${qr}')">`;}).join(''); }
function copyLink(id){ const input=$(id); input.select(); input.setSelectionRange(0,99999); navigator.clipboard.writeText(input.value).then(()=>alert('链接已复制')).catch(()=>{document.execCommand('copy'); alert('链接已复制');}); }
function saveBookingLinks(){ ['shop1Link','shop2Link','kyotoLink','parcoLink'].forEach(id=>{ if($(id)) localStorage.setItem(id,$(id).value); }); alert('预约链接已保存'); }
function previewQRCode(input,boxId){ const file=input.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=e=>{$(boxId).innerHTML=`<img src="${e.target.result}" style="width:160px;height:160px;object-fit:contain;">`;}; reader.readAsDataURL(file); }

function sendPush(){ const target=$('pushTarget').value; const title=$('pushTitle').value||'未填写标题'; const content=$('pushContent').value||''; $('pushResult').innerHTML=`<div class="member"><strong>推送对象：${target}</strong><br>${title}<br>${content}<br><br>LINE推送模拟成功。正式版接入LINE Messaging API后会真正发送。</div>`; }
async function exportMembers(){ if(!currentUser||currentUser.role!=='admin'){ alert('只有管理员可以导出'); return; } const data=await fetchMembers(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='fuyoen_members_v6.json'; a.click(); URL.revokeObjectURL(url); }
function clearLocalCache(){ if(confirm('确定清空本地缓存吗？不会删除云端数据。')){ localStorage.removeItem('fuyoen_store_status_v6'); alert('本地缓存已清空'); } }
async function renderAll(){ if(!currentUser) return; await renderStats(); await renderRoleDashboard(); if($('memberList')) renderMembers(); if($('bookingList')) renderBookings(); if($('birthdayList')) renderBirthday(birthdayMode); if($('memberSummary')) renderAnalysis(); }

function playBookingSound(){ const audio=new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'); audio.play().catch(()=>{}); }
async function checkNewBookingAlert(){ if(!supabaseClient || !currentUser) return; const {data,error}=await supabaseClient.from('bookings').select('id,name,booking_date,booking_time,people,store_code').order('id',{ascending:false}).limit(10); if(error||!data||!data.length) return; const scoped=filterBookingsByScope(data||[]); if(!scoped.length) return; const newest=scoped[0]; if(lastBookingId===null){ lastBookingId=newest.id; return; } if(newest.id!==lastBookingId){ lastBookingId=newest.id; playBookingSound();
      const nav=$('navBooking');
      if(nav){ nav.innerText='预约管理 🔴'; nav.style.background='#dc2626'; }
      alert('有新的预约：'+newest.name+'｜'+newest.booking_date+' '+newest.booking_time+'｜'+newest.people+'位');
      renderBookings(); renderStats(); } }
function startBookingAlert(){ if(bookingAlertStarted) return; bookingAlertStarted=true; checkNewBookingAlert(); setInterval(checkNewBookingAlert,30000); }

// 初始化界面语言
lang=localStorage.getItem('fuyoen_ui_lang')||'zh';
startLanguageObserver();
setTimeout(()=>translateElementTree(document.body),0);

// ===== 客人预约页面：LINE入口用 =====
(function(){
  const params=new URLSearchParams(window.location.search); const storeCode=params.get('store'); if(!storeCode) return; const storeName=stores[storeCode]||'大阪芙蓉苑';
  document.body.innerHTML=`<div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;"><div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.25);"><h1 style="color:#8b0000;margin-bottom:6px;">大阪芙蓉苑</h1><h2 style="margin-top:0;">${storeName} 予約</h2><p style="color:#666;">ご予約内容をご入力ください。</p><label>お名前 / 姓名</label><input id="guestName"><label>電話番号 / 电话</label><input id="guestPhone"><label>誕生日（任意）/ 生日（选填）</label><input id="guestBirthday" type="date" max="${todayStr()}"><label>予約日 / 日期</label><input id="guestDate" type="date"><label>予約時間 / 时间</label><input id="guestTime" type="time"><label>人数 / 人数</label><input id="guestPeople" type="number" min="1">${storeCode==='kyoto'?`<label>テーブル / 桌号</label><select id="guestTable"><option value="">请先选择日期、时间和人数</option></select><div id="guestTableHint" style="font-size:12px;color:#666;margin:-6px 0 14px;line-height:1.6;">A1-A4为4人座；B1-B2、C1-C6和VIP室为6人座。已预约的桌号不能选择。</div>`:''}<label>ご利用目的 / 预约目的</label><select id="guestPurpose"><option value="normal">普通用餐</option><option value="birthday">生日</option><option value="family">家庭聚餐</option><option value="company">公司聚餐</option><option value="business">商务宴请</option><option value="friends">朋友聚会</option><option value="couple">情侣约会</option><option value="tourist">旅游</option><option value="other">其他</option></select><label>儿童椅</label><select id="guestChildChair"><option value="no">不需要</option><option value="yes">需要</option></select><label>座位要求</label><select id="guestSeatRequest"><option value="none">无要求</option><option value="window">靠窗</option><option value="private">包间</option><option value="quiet">安静位置</option><option value="other">其他</option></select><label>备注 / ご要望</label><textarea id="guestNote" rows="3"></textarea><button onclick="submitGuestBooking()" style="width:100%;padding:14px;background:#b00020;color:white;border:none;border-radius:10px;font-size:18px;font-weight:bold;">予約する / 提交预约</button><p style="font-size:12px;color:#888;margin-top:16px;">※送信後、店舗より確認のご連絡をする場合があります。</p></div></div>`;
  if(storeCode==='kyoto'){
    window.refreshGuestKyotoTables=async function(){
      const tableSelect=$('guestTable');
      if(!tableSelect) return;
      const people=$('guestPeople').value;
      const date=$('guestDate').value;
      const time=$('guestTime').value;
      if(!people || !date || !time){
        tableSelect.innerHTML='<option value="">请先选择日期、时间和人数</option>';
        return;
      }
      await fillKyotoTableSelect(tableSelect,{people,date,time,currentValue:tableSelect.value});
    };
    ['guestPeople','guestDate','guestTime'].forEach(id=>{
      const el=$(id);
      if(el){
        el.addEventListener('change',window.refreshGuestKyotoTables);
        el.addEventListener('input',window.refreshGuestKyotoTables);
      }
    });
  }

  window.submitGuestBooking=async function(){
    const name=$('guestName').value.trim();
    const phone=$('guestPhone').value.trim();
    const birthday=$('guestBirthday').value.trim();
    const date=$('guestDate').value;
    const time=$('guestTime').value;
    const people=$('guestPeople').value;
    const note=$('guestNote').value.trim();
    const purpose=$('guestPurpose').value;
    const childChair=$('guestChildChair').value;
    const seatRequest=$('guestSeatRequest').value;
    const selectedTable=storeCode==='kyoto' && $('guestTable') ? String($('guestTable').value||'').trim() : '';
    if(!name||!phone||!date||!time||!people){ alert('お名前・電話・日付・時間・人数を入力してください。'); return; }
    if(storeCode==='kyoto'){
      if(!selectedTable){ alert('テーブルを選択してください。/ 请选择桌号。'); return; }
      const table=kyotoTables.find(t=>t.id===selectedTable);
      if(!table || Number(people)>table.seats){ alert('人数に合うテーブルを選択してください。/ 请选择符合人数的桌位。'); return; }
      const occupied=await occupiedKyotoTables(date,time);
      if(occupied.has(selectedTable)){
        alert('このテーブルはすでに予約されています。別のテーブルを選択してください。');
        await window.refreshGuestKyotoTables();
        return;
      }
    }

    const memberResult=await ensureMemberFromBooking({name,phone,birthday,storeCode,channel:'line',purpose,note});
    if(!memberResult.ok){ alert(memberResult.error); return; }

    const bookingNote=buildBookingNote(note,{
      channel:'line',purpose,childChair,seatRequest,firstSource:'line',
      memberId:memberResult.member.id,
      memberStatus:memberResult.isNew?'new':'existing',
      birthday:birthday||memberResult.member.birthday||''
    });
    const {error}=await supabaseClient.from('bookings').insert([{
      name,phone,store_code:storeCode,booking_date:date,booking_time:time,
      people:Number(people),table_no:selectedTable,note:bookingNote,
      status:selectedTable==='VIP'?'待确认':'已预约'
    }]);
    if(error){ alert('预约保存失败：'+error.message); return; }

    document.body.innerHTML=`<div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;"><div style="max-width:520px;margin:80px auto;background:white;border-radius:18px;padding:28px;text-align:center;"><h1 style="color:#8b0000;">预约已提交</h1><p>ありがとうございます。ご予約を受け付けました。</p><p><b>${storeName}</b></p><p>${date} ${time} / ${people}名様</p>${selectedTable?`<p><b>テーブル / 桌号：${selectedTable==='VIP'?'VIP室':selectedTable}</b></p>`:''}${selectedTable==='VIP'?`<p style="color:#9a6700;">VIP室は店舗確認後に確定します。/ VIP室需店铺确认后生效。</p>`:''}<p style="color:#666">${memberResult.isNew?'今回のご予約で会員情報が自動作成されました。':'既存の会員情報に予約を登録しました。'}</p></div></div>`;
  };
})();
