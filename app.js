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
  admin: { password: '1234', role: 'admin', labelZh: '管理员', labelJa: '管理者' },
  manager: { password: '1234', role: 'manager', labelZh: '店长', labelJa: '店長' },
  staff: { password: '1234', role: 'staff', labelZh: '店员', labelJa: 'スタッフ' }
};

const stores = {
  '1f': '長堀橋店 1階｜四川料理',
  '2f': '長堀橋店 2階｜火鍋・四川料理',
  hotpot: '長堀橋店 2階｜火鍋・四川料理',
  kyoto: '京都店｜火鍋・四川料理',
  parco: 'PARCO店｜小籠包・四川料理'
};


const bookingChannels = {
  line:'LINE官方', google:'Google地图', phone:'电话预约', instagram:'Instagram', xiaohongshu:'小红书',
  tiktok:'TikTok', walkin:'到店预约', koc:'KOC达人', hotel:'酒店介绍', friend:'朋友介绍', other:'其他'
};
const bookingPurposes = {
  normal:'普通用餐', birthday:'生日', family:'家庭聚餐', company:'公司聚餐', business:'商务宴请',
  friends:'朋友聚会', couple:'情侣约会', tourist:'旅游', other:'其他'
};
const childChairLabels = { yes:'需要儿童椅', no:'不需要儿童椅' };
const seatLabels = { none:'无座位要求', window:'靠窗', private:'包间', quiet:'安静位置', near_exit:'靠近出口', other:'其他' };
let bookingFilter = { status:'active', channel:'all', keyword:'', date:'' };

function channelName(v){ return bookingChannels[v] || v || '未登记'; }
function purposeName(v){ return bookingPurposes[v] || v || '普通用餐'; }
function getBookingMeta(note){
  const out={channel:'other', purpose:'normal', childChair:'no', seatRequest:'none', firstSource:'', raw:''};
  const text=String(note||'');
  const lines=text.split(/\n/);
  const raws=[];
  lines.forEach(line=>{
    if(line.startsWith('[渠道]')) out.channel=line.replace('[渠道]','').trim()||out.channel;
    else if(line.startsWith('[目的]')) out.purpose=line.replace('[目的]','').trim()||out.purpose;
    else if(line.startsWith('[儿童椅]')) out.childChair=line.replace('[儿童椅]','').trim()||out.childChair;
    else if(line.startsWith('[座位]')) out.seatRequest=line.replace('[座位]','').trim()||out.seatRequest;
    else if(line.startsWith('[首次来源]')) out.firstSource=line.replace('[首次来源]','').trim();
    else raws.push(line);
  });
  out.raw=raws.join('\n').trim();
  return out;
}
function buildBookingNote(raw, meta={}){
  const channel=meta.channel||'other';
  const purpose=meta.purpose||'normal';
  const childChair=meta.childChair||'no';
  const seatRequest=meta.seatRequest||'none';
  const firstSource=meta.firstSource||channel;
  const body=String(raw||'').trim();
  return `[渠道]${channel}\n[首次来源]${firstSource}\n[目的]${purpose}\n[儿童椅]${childChair}\n[座位]${seatRequest}${body?'\n'+body:''}`;
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

const typeLabel = {
  customerType: {japanese:{zh:'日本客人',ja:'日本のお客様'}, chinese:{zh:'中国客人',ja:'中国のお客様'}, other:{zh:'其他外国客人',ja:'その他外国人'}, student:{zh:'学生',ja:'学生'}, tourist:{zh:'游客',ja:'観光客'}, vip:{zh:'VIP客人',ja:'VIP'}, unknown:{zh:'不确定',ja:'不明'}},
  visitScene: {family:{zh:'家庭聚餐',ja:'家族利用'}, company:{zh:'公司聚餐',ja:'会社利用'}, couple:{zh:'情侣',ja:'カップル'}, friends:{zh:'朋友聚会',ja:'友人同士'}, alone:{zh:'一个人',ja:'一人利用'}, tourist:{zh:'游客',ja:'観光客'}, nearby:{zh:'附近居民',ja:'近隣住民'}, regular:{zh:'熟客',ja:'常連'}, unknown:{zh:'不确定',ja:'不明'}},
  foodPreference: {hotpot:{zh:'火锅',ja:'火鍋'}, sichuan:{zh:'川菜',ja:'四川料理'}, xiaolongbao:{zh:'小笼包',ja:'小籠包'}, dimsum:{zh:'点心',ja:'点心'}, dessert:{zh:'甜品',ja:'デザート'}, alcohol:{zh:'酒类',ja:'お酒'}, setmeal:{zh:'套餐',ja:'セット'}, unknown:{zh:'不确定',ja:'不明'}},
  tastePreference: {spicy_strong:{zh:'重辣',ja:'激辛'}, spicy_mild:{zh:'微辣',ja:'ピリ辛'}, no_spicy:{zh:'不吃辣',ja:'辛い物不可'}, mala:{zh:'喜欢麻味',ja:'しびれ好き'}, light:{zh:'清淡',ja:'あっさり'}, rich:{zh:'重口味',ja:'濃い味'}, unknown:{zh:'不确定',ja:'不明'}}
};

const labels = {
  zh: {dashboard:'首页', search:'会员查询', register:'新增会员', birthday:'生日会员', status:'营业状态', members:'会员列表', analysis:'客户分析', push:'LINE推送', settings:'系统设置', logout:'退出', total:'会员总数', birthMonth:'本月生日', visitMonth:'本月到店', currentStatus:'当前状态', todayWork:'今日操作', searchSub:'输入电话后4位，店员端只显示隐藏后的电话。', name:'姓名', phone:'电话号码', birth:'生日（月日）', store:'常去门店', profile:'客户画像', customerType:'客户类型', visitScene:'来店场景', foodPreference:'菜品偏好', tastePreference:'口味属性', today:'今日生日', month:'本月生日', all:'全部生日', open:'营业中', busy:'忙碌中', stop:'停止接待', closed:'已打烊', statusSub:'店员可切换现场营业状态，防止误操作会二次确认。', save:'保存会员', searchBtn:'查询', pushBtn:'模拟发送', active:'活跃会员', warning:'提醒会员', sleep:'沉睡会员', lost:'流失会员', anaType:'客户类型', anaScene:'来店场景', anaFood:'菜品偏好', anaTaste:'口味属性', anaActive:'活跃度', anaStore:'门店分布'},
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

async function fetchMembers(){
  if(!supabaseClient) return [];
  const {data,error}=await supabaseClient.from('members').select('*').order('id',{ascending:false});
  if(error){ console.error(error); return []; }
  cacheMembers=data||[]; return cacheMembers;
}
async function fetchBookings(){
  if(!supabaseClient) return [];
  const {data,error}=await supabaseClient.from('bookings').select('*').order('booking_date',{ascending:false}).order('booking_time',{ascending:false});
  if(error){ console.error(error); return []; }
  cacheBookings=data||[]; return cacheBookings;
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

function login(){
  const u=$('loginUser').value.trim(); const p=$('loginPass').value.trim();
  if(!users[u] || users[u].password!==p){ alert('账号或密码错误'); return; }
  currentUser={username:u,...users[u]}; $('loginPage').style.display='none'; $('app').style.display='block';
  applyPermission(); setLang(lang); showPage(currentUser.role==='staff'?'search':'dashboard'); startBookingAlert();
}
function logout(){ currentUser=null; $('app').style.display='none'; $('loginPage').style.display='flex'; }
function applyPermission(){
  const role=currentUser.role; $('roleText').innerText='当前账号：'+currentUser.username+' / '+currentUser.labelZh;
  ['navDashboard','navSearch','navRegister','navBirthday','navStatus','navMembers','navBooking','navLineBooking','navAnalysis','navPush','navSettings'].forEach(id=>$(id)&&$(id).classList.remove('hidden'));
  document.querySelectorAll('.manager-only').forEach(el=>el.classList.remove('hidden'));
  if(role==='staff') ['navDashboard','navMembers','navAnalysis','navPush','navSettings'].forEach(id=>$(id)&&$(id).classList.add('hidden'));
  if(role==='manager') $('navSettings').classList.add('hidden');
  buildLineLinks(); renderAll();
}
function setLang(l){
  lang=l; const t=labels[l]; const ids={navDashboard:'dashboard',navSearch:'search',navRegister:'register',navBirthday:'birthday',navStatus:'status',navMembers:'members',navAnalysis:'analysis',navPush:'push',navSettings:'settings',titleSearch:'search',titleRegister:'register',titleBirthday:'birthday',titleStatus:'status',titleMembers:'members',titleAnalysis:'analysis',titlePush:'push',titleSettings:'settings',dashboardTitle:'todayWork',searchSub:'searchSub',statTotalLabel:'total',statBirthLabel:'birthMonth',statVisitLabel:'visitMonth',statStatusLabel:'currentStatus',labelName:'name',labelPhone:'phone',labelBirthday:'birth',labelStore:'store',sectionProfile:'profile',labelCustomerType:'customerType',labelVisitScene:'visitScene',labelFoodPreference:'foodPreference',labelTastePreference:'tastePreference',birthToday:'today',birthMonth:'month',birthAll:'all',stOpen:'open',stBusy:'busy',stStop:'stop',stClosed:'closed',statusSub:'statusSub',saveBtn:'save',searchBtn:'searchBtn',pushBtn:'pushBtn',quickSearch:'search',quickRegister:'register',quickAnalysis:'analysis',anaType:'anaType',anaScene:'anaScene',anaFood:'anaFood',anaTaste:'anaTaste',anaActive:'anaActive',anaStore:'anaStore'};
  for(const id in ids){ if($(id)) $(id).innerText=t[ids[id]]; }
  if($('logoutBtn')) $('logoutBtn').innerText=t.logout; updateStatusText(); renderAll();
}
function showPage(id){
  if(!currentUser) return;
  if(currentUser.role==='staff' && ['dashboard','members','analysis','push','settings'].includes(id)){ alert('店员账号无权查看此页面'); return; }
  if(currentUser.role==='manager' && id==='settings'){ alert('店长账号无权查看系统设置'); return; }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); $(id).classList.add('active'); renderAll();
}

async function saveMember(){
  const row={name:$('name').value.trim(), phone:$('phone').value.trim(), birthday:$('birthdayInput').value.trim()||null, store:$('store').value, customer_type:$('customerType').value, scene:$('visitScene').value, food:$('foodPreference').value, taste:$('tastePreference').value, remark:$('remark').value.trim(), points:0, level:'普通会员', visit_count:0, total_spent:0, consume_count:0};
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
  const phoneView=currentUser&&currentUser.role==='admin'?m.phone:maskPhone(m.phone);
  const total=Number(memberValue(m,'total_spent')||0);
  const count=Number(memberValue(m,'consume_count')||0);
  const avg=count?Math.round(total/count):0;
  return `<div class="member"><strong>${m.name||''}</strong><br>电话：${phoneView}<br>生日：${m.birthday||'未登记'}<br>门店：${memberValue(m,'store')||'未登记'}<br>等级：${getMemberLevel(m)}｜积分：${memberValue(m,'points')||0}<br>到店：${memberValue(m,'visit_count')||0}次｜最后到店：${memberValue(m,'last_visit')||'未记录'}<br>消费：${count}次｜累计：${yen(total)}｜平均：${yen(avg)}<br>最后消费：${memberValue(m,'last_consume')||'未记录'}<br>${profileHtml(m)}${withActions?`<div class="action-row"><button class="green" onclick="recordVisit(${m.id})">今日到店</button><button class="orange" onclick="recordConsume(${m.id})">消费记录</button><button class="blue" onclick="editMember(${m.id})">编辑会员</button><button class="black" onclick="showMemberStats(${m.id})">客户档案</button><button class="red" onclick="deleteMember(${m.id})">删除会员</button></div><div id="consumeHistory_${m.id}" class="consume-history"></div>`:''}</div>`;
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
      <div class="mini-actions">
        <button class="mini-edit" onclick="editConsumeLog(${x.id},${id})">编辑</button>
        <button class="mini-delete" onclick="deleteConsumeLog(${x.id},${id})">删除</button>
      </div>
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
      <div class="history-meta">👥 ${esc(b.people||'')}位　🏪 ${esc(stores[b.store_code]||b.store_code||'未登记')}　📍 ${esc(channelName(meta.channel))}　🎯 ${esc(purposeName(meta.purpose))}　📝 ${esc(meta.raw||'无备注')}</div>
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

async function editMember(id){ const m=cacheMembers.find(x=>x.id===id) || {}; const name=prompt('会员姓名：',m.name||''); if(name===null) return; const birthday=prompt('生日（例如 1980-05-20 或 05/20）：',m.birthday||''); const customerType=prompt('客户类型：japanese / chinese / other / student / tourist / vip',memberValue(m,'customer_type')||'japanese'); const scene=prompt('来店场景：family/company/couple/friends/alone/tourist/nearby/regular',memberValue(m,'scene')||'unknown'); const food=prompt('菜品偏好：hotpot/sichuan/xiaolongbao/dimsum/dessert/alcohol/setmeal',memberValue(m,'food')||'unknown'); const taste=prompt('口味属性：spicy_strong/spicy_mild/no_spicy/mala/light/rich',memberValue(m,'taste')||'unknown'); const remark=prompt('备注：',m.remark||''); const {error}=await supabaseClient.from('members').update({name,birthday,customer_type:customerType,scene,food,taste,remark}).eq('id',id); if(error){ alert(error.message); return; } alert('会员资料已更新'); await fetchMembers(); await searchMember(); renderAll(); }
async function deleteMember(id){ if(!confirm('确定删除该会员吗？')) return; const {error}=await supabaseClient.from('members').delete().eq('id',id); if(error){ alert(error.message); return; } $('searchResult').innerHTML=''; alert('删除成功'); renderAll(); }

async function renderMembers(){ const box=$('memberList'); if(!box) return; if(!currentUser||currentUser.role==='staff'){ box.innerHTML='<div class="member">无权限查看</div>'; return; } const data=await fetchMembers(); box.innerHTML=data.length?data.map(m=>memberCard(m,false)).join(''):'<div class="member">暂无会员</div>'; }
async function renderBirthday(mode=birthdayMode){ birthdayMode=mode; const now=new Date(); const cm=now.getMonth()+1, cd=now.getDate(); let data=await fetchMembers(); data=data.filter(m=>m.birthday); if(mode==='today') data=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm&&d.day===cd;}); if(mode==='month') data=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm;}); $('birthdayList').innerHTML=data.length?data.map(m=>memberCard(m,false)).join(''):'<div class="member">暂无生日会员</div>'; }
async function renderStats(){ const data=await fetchMembers(); const bookings=await fetchBookings(); const now=new Date(); const cm=now.getMonth()+1; const today=todayStr(); $('statTotal').innerText=data.length; $('statBirth').innerText=data.filter(m=>{const d=parseMonthDay(m.birthday); return d&&d.month===cm;}).length; $('statVisit').innerText=data.filter(m=>(m.last_visit||'')===today).length; if($('statBooking')) $('statBooking').innerText=bookings.filter(b=>b.booking_date===today && b.status!=='已取消').length; if($('statSales')){ const {data:logs,error}=await supabaseClient.from('consume_logs').select('amount').eq('consume_date',today); $('statSales').innerText=error?'读取失败':yen((logs||[]).reduce((s,x)=>s+Number(x.amount||0),0)); } updateStatusText(); renderTodayBookings(); }
function updateStatusText(){ const s=getStatus(); const t=labels[lang]; const name=t[s==='open'?'open':s==='busy'?'busy':s==='stop'?'stop':'closed']; const emoji=s==='open'?'🟢':s==='busy'?'🟡':s==='stop'?'🔴':'⚫'; if($('statusResult')) $('statusResult').innerText=emoji+' 当前状态：'+name; if($('statStatus')) $('statStatus').innerText=name; }
function changeStatus(s){ const t=labels[lang]; const name=t[s==='open'?'open':s==='busy'?'busy':s==='stop'?'stop':'closed']; if(confirm('确认切换为：'+name+'？')){ saveStatus(s); updateStatusText(); renderStats(); } }

function countBy(arr,fn){ const out={}; arr.forEach(x=>{const k=fn(x)||'unknown'; out[k]=(out[k]||0)+1;}); return out; }
function renderBars(targetId,data,labelFn){ const box=$(targetId); if(!box) return; const entries=Object.entries(data); const total=entries.reduce((s,e)=>s+e[1],0)||1; if(entries.length===0){ box.innerHTML='暂无数据'; return; } box.innerHTML=entries.map(([k,v])=>{const pct=Math.round(v/total*100); return `<div class="bar"><div class="bar-name"><span>${labelFn(k)}</span><span>${v}人</span></div><div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;}).join(''); }
async function renderAnalysis(){ const data=await fetchMembers(); const total=data.length; const active=data.filter(m=>getActiveKey(m)==='active').length; const warning=data.filter(m=>getActiveKey(m)==='warning').length; const sleep=data.filter(m=>getActiveKey(m)==='sleep').length; const lost=data.filter(m=>getActiveKey(m)==='lost').length; const silver=data.filter(m=>getMemberLevel(m)==='银卡会员').length; const gold=data.filter(m=>getMemberLevel(m)==='金卡会员').length; const diamond=data.filter(m=>getMemberLevel(m)==='钻石会员').length; $('memberSummary').innerHTML=`<h3>会员总览</h3>会员总数：${total}<br>🟢 活跃会员：${active}<br>🟡 提醒会员：${warning}<br>🟠 沉睡会员：${sleep}<br>🔴 流失会员：${lost}<br><br>银卡会员：${silver}<br>金卡会员：${gold}<br>钻石会员：${diamond}<br><br><h4>30天以上未到店提醒</h4>${data.filter(m=>['sleep','lost'].includes(getActiveKey(m))).map(m=>'• '+m.name+'｜最后到店：'+(m.last_visit||'未记录')).join('<br>')||'暂无'}`; renderBars('typeAnalysis',countBy(data,m=>memberValue(m,'customer_type','customerType')),k=>label('customerType',k)); renderBars('sceneAnalysis',countBy(data,m=>memberValue(m,'scene','visitScene')),k=>label('visitScene',k)); renderBars('foodAnalysis',countBy(data,m=>memberValue(m,'food','foodPreference')),k=>label('foodPreference',k)); renderBars('tasteAnalysis',countBy(data,m=>memberValue(m,'taste','tastePreference')),k=>label('tastePreference',k)); renderBars('activeAnalysis',countBy(data,m=>getActiveKey(m)),k=>labels[lang][k]); renderBars('storeAnalysis',countBy(data,m=>memberValue(m,'store')||stores[m.store_code]||'未登记'),k=>k); }


async function addBooking(){
  const channel=$('bookingChannel') ? $('bookingChannel').value : 'phone';
  const purpose=$('bookingPurpose') ? $('bookingPurpose').value : 'normal';
  const childChair=$('bookingChildChair') ? $('bookingChildChair').value : 'no';
  const seatRequest=$('bookingSeatRequest') ? $('bookingSeatRequest').value : 'none';
  const rawNote=$('bookingNote').value.trim();
  const row={
    name:$('bookingName').value.trim(),
    phone:$('bookingPhone').value.trim(),
    booking_date:$('bookingDate').value,
    booking_time:$('bookingTime').value,
    people:Number($('bookingPeople').value||0),
    table_no:$('bookingRoom').value.trim(),
    note:buildBookingNote(rawNote,{channel,purpose,childChair,seatRequest}),
    status:'已预约'
  };
  if(!row.name||!row.phone||!row.booking_date||!row.booking_time||!row.people){ alert('请输入姓名、电话、日期、时间、人数'); return; }
  const {error}=await supabaseClient.from('bookings').insert([row]);
  if(error){ alert('预约保存失败：'+error.message); return; }
  ['bookingName','bookingPhone','bookingDate','bookingTime','bookingPeople','bookingRoom','bookingNote'].forEach(id=>$(id).value='');
  if($('bookingChannel')) $('bookingChannel').value='line';
  if($('bookingPurpose')) $('bookingPurpose').value='normal';
  if($('bookingChildChair')) $('bookingChildChair').value='no';
  if($('bookingSeatRequest')) $('bookingSeatRequest').value='none';
  alert('预约保存成功'); renderBookings(); renderStats();
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
  const memberLine=member?`<br><span class="badge">老会员</span> ${getMemberLevel(member)}｜累计：${yen(member.total_spent)}｜到店：${Number(member.visit_count||0)}次｜最后到店：${member.last_visit||'未记录'}`:'<br><span class="badge badge-gray">新客户/未入会</span>';
  return `<div class="member booking-item"><strong>${esc(b.name||'')}</strong><br>${esc(b.people||'')}位｜${esc(b.booking_date||'')} ${esc(b.booking_time||'')}<br>电话：${currentUser&&currentUser.role==='admin'?esc(b.phone):maskPhone(b.phone)}<br>门店：${esc(stores[b.store_code]||b.store_code||'未登记')}｜桌号：${esc(b.table_no||'未登记')}<br>来源：<b>${esc(channelName(meta.channel))}</b>｜首次来源：${esc(channelName(meta.firstSource||meta.channel))}<br>目的：${esc(purposeName(meta.purpose))}｜儿童椅：${esc(childChairLabels[meta.childChair]||meta.childChair)}｜座位：${esc(seatLabels[meta.seatRequest]||meta.seatRequest)}<br>备注：${esc(meta.raw||'无')}${memberLine}<br>状态：<select onchange="changeBookingStatus(${b.id},this.value)"><option value="已预约" ${b.status==='已预约'?'selected':''}>已预约</option><option value="待确认" ${b.status==='待确认'?'selected':''}>待确认</option><option value="已确认" ${b.status==='已确认'?'selected':''}>已确认</option><option value="已到店" ${b.status==='已到店'?'selected':''}>已到店</option><option value="已完成" ${b.status==='已完成'?'selected':''}>已完成</option><option value="已取消" ${b.status==='已取消'?'selected':''}>已取消</option><option value="No Show" ${b.status==='No Show'?'selected':''}>No Show</option></select><div class="action-row"><button class="green" onclick="changeBookingStatus(${b.id},'已到店')">已到店</button><button class="blue" onclick="editBooking(${b.id})">修改预约</button><button class="orange" onclick="changeBookingStatus(${b.id},'No Show')">No Show</button><button class="red" onclick="deleteBooking(${b.id})">删除预约</button></div></div>`;
}
async function editBooking(id){
  const b=cacheBookings.find(x=>x.id===id); if(!b){ alert('找不到预约'); return; }
  const meta=getBookingMeta(b.note);
  const name=prompt('客户姓名',b.name||''); if(name===null) return;
  const phone=prompt('联系电话',b.phone||''); if(phone===null) return;
  const date=prompt('预约日期 YYYY-MM-DD',b.booking_date||todayStr()); if(date===null) return;
  const time=prompt('预约时间 HH:MM',b.booking_time||'18:00'); if(time===null) return;
  const people=Number(prompt('人数',b.people||'2')); if(!people){ alert('人数不正确'); return; }
  const channel=prompt('预约来源：line/google/phone/instagram/xiaohongshu/tiktok/walkin/koc/hotel/friend/other',meta.channel||'phone')||meta.channel||'phone';
  const purpose=prompt('预约目的：normal/birthday/family/company/business/friends/couple/tourist/other',meta.purpose||'normal')||meta.purpose||'normal';
  const table_no=prompt('桌号/包间',b.table_no||'')||'';
  const raw=prompt('备注',meta.raw||'')||'';
  const {error}=await supabaseClient.from('bookings').update({name,phone,booking_date:date,booking_time:time,people,table_no,note:buildBookingNote(raw,{...meta,channel,purpose})}).eq('id',id);
  if(error){ alert('修改失败：'+error.message); return; }
  alert('预约已修改'); renderBookings(); renderStats();
}
async function changeBookingStatus(id,status){
  const b=cacheBookings.find(x=>x.id===id); const oldStatus=b?b.status:'';
  const {error}=await supabaseClient.from('bookings').update({status}).eq('id',id);
  if(error){ alert(error.message); return; }
  if(oldStatus!=='已到店' && oldStatus!=='已完成' && (status==='已到店'||status==='已完成') && b&&b.phone){ const member=bookingMemberByPhone(b.phone); if(member) await recordVisit(member.id); }
  renderBookings(); renderStats();
}
async function deleteBooking(id){ if(!confirm('确定删除这条预约吗？')) return; const {error}=await supabaseClient.from('bookings').delete().eq('id',id); if(error){ alert(error.message); return; } alert('预约已删除'); renderBookings(); renderStats(); }
function renderTodayBookings(){
  const box=$('todayBookingList'); if(!box) return;
  const today=todayStr(); const data=cacheBookings.filter(b=>b.booking_date===today && bookingStatusGroup(b.status)!=='cancel').sort((a,b)=>String(a.booking_time).localeCompare(String(b.booking_time)));
  const summary=Object.entries(countBy(data,b=>getBookingMeta(b.note).channel)).map(([k,v])=>`${channelName(k)}：${v}`).join('｜');
  box.innerHTML=(summary?`<div class="member"><b>今日渠道：</b>${summary}</div>`:'')+(data.length?data.map(bookingCard).join(''):'<div class="member">今日暂无预约</div>');
}

function buildLineLinks(){ const box=$('lineLinks'); if(!box) return; const list=[['shop1Link','本店一楼四川料理预约链接','1f','shop1QR'],['shop2Link','本店二楼火锅城预约链接','2f','shop2QR'],['kyotoLink','京都火锅城预约链接','kyoto','kyotoQR'],['parcoLink','PARCO芙蓉料理预约链接','parco','parcoQR']]; box.innerHTML=list.map(([id,title,store,qr])=>{const saved=localStorage.getItem(id)||`https://warm-froyo-b511b7.netlify.app/?store=${store}`; return `<p><b>${title}</b></p><div class="link-box"><input id="${id}" type="text" value="${saved}"><button class="small-btn" onclick="copyLink('${id}')">复制</button></div><div id="${qr}" class="qr-box">后期放二维码</div><input type="file" accept="image/*" onchange="previewQRCode(this,'${qr}')">`;}).join(''); }
function copyLink(id){ const input=$(id); input.select(); input.setSelectionRange(0,99999); navigator.clipboard.writeText(input.value).then(()=>alert('链接已复制')).catch(()=>{document.execCommand('copy'); alert('链接已复制');}); }
function saveBookingLinks(){ ['shop1Link','shop2Link','kyotoLink','parcoLink'].forEach(id=>{ if($(id)) localStorage.setItem(id,$(id).value); }); alert('预约链接已保存'); }
function previewQRCode(input,boxId){ const file=input.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=e=>{$(boxId).innerHTML=`<img src="${e.target.result}" style="width:160px;height:160px;object-fit:contain;">`;}; reader.readAsDataURL(file); }

function sendPush(){ const target=$('pushTarget').value; const title=$('pushTitle').value||'未填写标题'; const content=$('pushContent').value||''; $('pushResult').innerHTML=`<div class="member"><strong>推送对象：${target}</strong><br>${title}<br>${content}<br><br>LINE推送模拟成功。正式版接入LINE Messaging API后会真正发送。</div>`; }
async function exportMembers(){ if(!currentUser||currentUser.role!=='admin'){ alert('只有管理员可以导出'); return; } const data=await fetchMembers(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='fuyoen_members_v6.json'; a.click(); URL.revokeObjectURL(url); }
function clearLocalCache(){ if(confirm('确定清空本地缓存吗？不会删除云端数据。')){ localStorage.removeItem('fuyoen_store_status_v6'); alert('本地缓存已清空'); } }
async function renderAll(){ if(!currentUser) return; await renderStats(); if($('memberList')) renderMembers(); if($('bookingList')) renderBookings(); if($('birthdayList')) renderBirthday(birthdayMode); if($('memberSummary')) renderAnalysis(); }

function playBookingSound(){ const audio=new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg'); audio.play().catch(()=>{}); }
async function checkNewBookingAlert(){ if(!supabaseClient || !currentUser) return; const {data,error}=await supabaseClient.from('bookings').select('id,name,booking_date,booking_time,people').order('id',{ascending:false}).limit(1); if(error||!data||!data.length) return; const newest=data[0]; if(lastBookingId===null){ lastBookingId=newest.id; return; } if(newest.id!==lastBookingId){ lastBookingId=newest.id; playBookingSound(); alert('有新的预约：'+newest.name+'｜'+newest.booking_date+' '+newest.booking_time+'｜'+newest.people+'位'); renderBookings(); renderStats(); } }
function startBookingAlert(){ if(bookingAlertStarted) return; bookingAlertStarted=true; checkNewBookingAlert(); setInterval(checkNewBookingAlert,30000); }

// ===== 客人预约页面：LINE入口用 =====
(function(){
  const params=new URLSearchParams(window.location.search); const storeCode=params.get('store'); if(!storeCode) return; const storeName=stores[storeCode]||'大阪芙蓉苑';
  document.body.innerHTML=`<div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;"><div style="max-width:520px;margin:0 auto;background:white;border-radius:18px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.25);"><h1 style="color:#8b0000;margin-bottom:6px;">大阪芙蓉苑</h1><h2 style="margin-top:0;">${storeName} 予約</h2><p style="color:#666;">ご予約内容をご入力ください。</p><label>お名前 / 姓名</label><input id="guestName"><label>電話番号 / 电话</label><input id="guestPhone"><label>予約日 / 日期</label><input id="guestDate" type="date"><label>予約時間 / 时间</label><input id="guestTime" type="time"><label>人数 / 人数</label><input id="guestPeople" type="number" min="1"><label>ご利用目的 / 预约目的</label><select id="guestPurpose"><option value="normal">普通用餐</option><option value="birthday">生日</option><option value="family">家庭聚餐</option><option value="company">公司聚餐</option><option value="business">商务宴请</option><option value="friends">朋友聚会</option><option value="couple">情侣约会</option><option value="tourist">旅游</option><option value="other">其他</option></select><label>儿童椅</label><select id="guestChildChair"><option value="no">不需要</option><option value="yes">需要</option></select><label>座位要求</label><select id="guestSeatRequest"><option value="none">无要求</option><option value="window">靠窗</option><option value="private">包间</option><option value="quiet">安静位置</option><option value="other">其他</option></select><label>备注 / ご要望</label><textarea id="guestNote" rows="3"></textarea><button onclick="submitGuestBooking()" style="width:100%;padding:14px;background:#b00020;color:white;border:none;border-radius:10px;font-size:18px;font-weight:bold;">予約する / 提交预约</button><p style="font-size:12px;color:#888;margin-top:16px;">※送信後、店舗より確認のご連絡をする場合があります。</p></div></div>`;
  window.submitGuestBooking=async function(){ const name=$('guestName').value.trim(); const phone=$('guestPhone').value.trim(); const date=$('guestDate').value; const time=$('guestTime').value; const people=$('guestPeople').value; const note=$('guestNote').value.trim(); const purpose=$('guestPurpose').value; const childChair=$('guestChildChair').value; const seatRequest=$('guestSeatRequest').value; if(!name||!phone||!date||!time||!people){ alert('お名前・電話・日付・時間・人数を入力してください。'); return; } const {error}=await supabaseClient.from('bookings').insert([{name,phone,store_code:storeCode,booking_date:date,booking_time:time,people:Number(people),table_no:'',note:buildBookingNote(note,{channel:'line',purpose,childChair,seatRequest}),status:'已预约'}]); if(error){ alert('预约保存失败：'+error.message); return; } document.body.innerHTML=`<div style="min-height:100vh;background:linear-gradient(135deg,#8b0000,#2b0000);padding:24px;font-family:Arial,'Noto Sans JP',sans-serif;"><div style="max-width:520px;margin:80px auto;background:white;border-radius:18px;padding:28px;text-align:center;"><h1 style="color:#8b0000;">预约已提交</h1><p>ありがとうございます。ご予約を受け付けました。</p><p><b>${storeName}</b></p><p>${date} ${time} / ${people}名様</p></div></div>`; };
})();
