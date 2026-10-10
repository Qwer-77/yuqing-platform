/* 高校舆情监测与预警处置平台 - 交互逻辑（演示数据均为前端模拟） */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ================= 全局数据（模拟） ================= */
  var APP = window.APP = {
    kpis: [
      { lbl: '今日舆情总量', num: 12847, delta: '+12.4%', dir: 'up', note: '较昨日', icon: 'msg' },
      { lbl: '敏感信息数', num: 342, delta: '+8.1%', dir: 'up', note: '较昨日', icon: 'shield' },
      { lbl: '预警事件', num: 18, delta: '待处置 4 起', dir: '', note: '今日累计', icon: 'bell' },
      { lbl: '平均响应时长', num: '26分', delta: '-31.5%', dir: 'down', note: '较上周', icon: 'clock' }
    ],
    trend: {
      days: ['10-04', '10-05', '10-06', '10-07', '10-08', '10-09', '10-10'],
      vol: [8600, 9200, 8800, 10400, 9700, 11500, 12847],
      sens: [6.2, 7.1, 5.8, 8.4, 7.6, 9.8, 11.2]
    },
    senti: [
      { name: '正面', value: 41.8 },
      { name: '中性', value: 46.3 },
      { name: '负面', value: 11.9 }
    ],
    sources: [
      { name: '微博', value: 4230 }, { name: '抖音', value: 3120 }, { name: '校园墙', value: 2460 },
      { name: '百度贴吧', value: 1530 }, { name: '知乎', value: 920 }, { name: '微信公众号', value: 587 }
    ],
    wordcloud: [
      ['食堂卫生', 96, 'neg'], ['期中考试周', 88, 'mut'], ['奖学金评定', 85, 'neg'], ['校园歌手大赛', 80, 'pos'],
      ['宿舍空调安装', 76, 'neu'], ['考研自习室占座', 72, 'neg'], ['校运会报名', 65, 'pos'], ['秋季双选会', 63, 'pos'],
      ['社团纳新', 58, 'pos'], ['图书馆延期开放', 55, 'pos'], ['新食堂试营业', 52, 'neu'], ['校友返校日', 48, 'pos'],
      ['缴费系统故障', 44, 'neg'], ['体育场馆预约', 40, 'neu'], ['名师讲座', 38, 'pos'], ['心理健康月', 34, 'pos'],
      ['充电桩不足', 30, 'neg'], ['教材征订', 28, 'neu'], ['夜跑活动', 26, 'pos'], ['校车班次调整', 22, 'neu']
    ],
    feedTpl: [
      { p: '微博', txt: '转发提醒：| 学校南门修路封闭施工，请同学们绕行东门', s: 'neu' },
      { p: '校园墙', txt: '投稿：| 今晚体育馆校歌手大赛决赛，欢迎来加油！', s: 'pos' },
      { p: '贴吧', txt: '求助：| 三食堂二楼|新开的窗口|好像是预制的，大家怎么看', s: 'neg' },
      { p: '抖音', txt: '实拍：| 秋天的校园也太美了#银杏大道', s: 'pos' },
      { p: '微博', txt: '吐槽：| 选课系统又崩了，|抢课全靠玄学|，教务处能优化下吗', s: 'neg' },
      { p: '知乎', txt: '如何评价|我校新增的人工智能微专业？课程设置看起来不错', s: 'pos' },
      { p: '校园墙', txt: '寻物启事：| 丢失校园卡一张，捡到的同学请联系我，有感谢红包', s: 'neu' },
      { p: '贴吧', txt: '听说|宿舍要调整住宿费标准，|有没有官方通知？求辟谣', s: 'neg' },
      { p: '抖音', txt: '直播间|挂人|：某老师上课纯属念PPT，建议换人#大学生日常', s: 'neg' },
      { p: '公众号', txt: '推文：| 我校学子在全国大学生数学建模竞赛中获一等奖', s: 'pos' },
      { p: '微博', txt: '爆料：| 体育馆预约系统|内部人员|锁场，学生根本约不到', s: 'neg' },
      { p: '知乎', txt: '咨询：| 研究生奖学金评定细则什么时候公布？家人们等急了', s: 'neu' }
    ]
  };

  /* ================= Toast & Modal ================= */
  function toast(msg, type) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    var ic = { ok: '✓', warn: '!', err: '✕', info: 'i' }[type || 'info'];
    el.innerHTML = '<span class="ic" style="font-weight:800;width:16px;text-align:center">' + ic + '</span><span>' + msg + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 2800);
    setTimeout(function () { el.remove(); }, 3300);
  }

  function openModal(title, sub, bodyHtml) {
    $('#mTitle').textContent = title;
    $('#mSub').textContent = sub || '';
    $('#mBody').innerHTML = bodyHtml || '';
    $('#modal').classList.add('show');
  }
  function closeModal() { $('#modal').classList.remove('show'); }
  $('#modalClose').onclick = closeModal;
  $('#modal').onclick = function (e) { if (e.target === this) closeModal(); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ================= 路由 ================= */
  var PAGE_META = {
    overview: ['舆情总览', 'CAMPUS PUBLIC OPINION OVERVIEW'],
    monitor: ['舆情检测', 'SENTIMENT & RISK ANALYSIS'],
    alert: ['预警处置', 'ALERT RESPONSE & HANDLING'],
    trace: ['溯源分析', 'PROPAGATION TRACING'],
    audit: ['审计看板', 'AUDIT DASHBOARD'],
    guide: ['引导演示', 'GUIDED DEMO'],
    about: ['关于系统', 'ABOUT THE PLATFORM']
  };
  var curPage = 'overview';
  function goto(page) {
    if (!PAGE_META[page]) page = 'overview';
    curPage = page;
    $$('.page').forEach(function (p) { p.classList.remove('active'); });
    var pg = $('#page-' + page); if (pg) pg.classList.add('active');
    $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.dataset.page === page); });
    $('#pageTitle').childNodes[0].textContent = PAGE_META[page][0];
    $('#pageSub').textContent = PAGE_META[page][1];
    location.hash = '/' + page;
    $('#sidebar').classList.remove('open'); $('#mask').classList.remove('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.Charts) Charts.show(page);
  }
  $$('.nav-item').forEach(function (n) { n.onclick = function () { goto(n.dataset.page); }; });
  $$('.guide-scene').forEach(function (c) {
    c.onclick = function () {
      goto(c.dataset.goto);
      toast('已进入演示场景', 'info');
    };
  });
  window.addEventListener('hashchange', function () {
    var p = location.hash.replace('#/', '');
    if (p && p !== curPage) goto(p);
  });

  /* 汉堡菜单 */
  $('#hamburger').onclick = function () { $('#sidebar').classList.add('open'); $('#mask').classList.add('show'); };
  $('#mask').onclick = function () { $('#sidebar').classList.remove('open'); $('#mask').classList.remove('show'); };

  /* 时钟 */
  function tick() {
    var d = new Date();
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    $('#clock').textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '  ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  tick(); setInterval(tick, 1000);

  /* ================= 总览：KPI ================= */
  var ICONS = {
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a8 8 0 0 1-8 8H4l2.5-2.5A8 8 0 1 1 21 12Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6l-8-3Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>'
  };
  (function renderKpi() {
    var html = APP.kpis.map(function (k) {
      var deltaCls = k.dir === 'up' ? 'up' : k.dir === 'down' ? 'down' : 'b-muted';
      var deltaTxt = k.dir ? '<span class="delta ' + deltaCls + '">' + k.delta + ' <span style="color:var(--muted);font-weight:400">' + k.note + '</span></span>'
        : '<span class="delta" style="color:var(--muted)">' + k.delta + '</span>';
      return '<div class="card kpi-card"><div class="icon">' + ICONS[k.icon] + '</div>' +
        '<div class="num" data-target="' + k.num + '">0</div><div class="lbl">' + k.lbl + '</div>' + deltaTxt + '</div>';
    }).join('');
    $('#kpiGrid').innerHTML = html;
    /* 数字滚动动画 */
    $$('#kpiGrid .num').forEach(function (el) {
      var raw = el.dataset.target, target = parseFloat(raw), isStr = isNaN(target) || /[^\d]/.test(raw);
      if (isStr) { el.textContent = raw; return; }
      var t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / 1200, 1);
        var v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  })();

  /* ================= 总览：词云 ================= */
  var WC_COLOR = { pos: ['#10d98c', 'rgba(16,217,140,.1)'], neg: ['#ff5470', 'rgba(255,84,112,.1)'], neu: ['#8b98b8', 'rgba(139,152,184,.1)'], mut: ['#a78bfa', 'rgba(167,139,250,.1)'] };
  (function renderWordcloud() {
    var html = APP.wordcloud.map(function (w) {
      var c = WC_COLOR[w[2]];
      var fs = 12 + Math.round(w[1] / 8); // 12~24px
      return '<span class="wc-item" data-w="' + w[0] + '" style="font-size:' + fs + 'px;color:' + c[0] +
        ';background:' + c[1] + ';padding:' + (w[1] > 70 ? '6px 15px' : '4px 11px') + '">' + w[0] + '</span>';
    }).join('');
    $('#wordcloud').innerHTML = html;
    $$('#wordcloud .wc-item').forEach(function (el) {
      el.onclick = function () {
        goto('monitor');
        var ta = $('#inputText');
        ta.value = '【关键词检索】关于「' + el.dataset.w + '」的相关舆情：\n（已带入热点关键词，可直接点击开始检测，或编辑补充上下文）';
        toast('已带入热点词条「' + el.dataset.w + '」', 'ok');
      };
    });
  })();

  /* ================= 总览：实时舆情流 ================= */
  var feedTimer = null, feedOn = true, feedSeq = 0;
  var PLAT_COLOR = { '微博': ['#ff5470', 'rgba(255,84,112,.12)'], '抖音': ['#a78bfa', 'rgba(167,139,250,.12)'], '校园墙': ['#22d3ee', 'rgba(34,211,238,.12)'], '贴吧': ['#ffb020', 'rgba(255,176,32,.12)'], '知乎': ['#4f7cff', 'rgba(79,124,255,.12)'], '公众号': ['#10d98c', 'rgba(16,217,140,.12)'] };
  var S_TAG = { pos: ['<span class="badge b-ok">正面</span>'], neu: ['<span class="badge b-muted">中性</span>'], neg: ['<span class="badge b-danger">负面</span>'] };
  function nowStr() { var d = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; }; return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
  function pushFeed() {
    var tpl = APP.feedTpl[Math.floor(Math.random() * APP.feedTpl.length)];
    var parts = tpl.txt.split('|');
    var box = $('#feed');
    var el = document.createElement('div');
    el.className = 'feed-item';
    var pc = PLAT_COLOR[tpl.p];
    var content = parts.map(function (t, i) { return i === 0 ? t : '<span class="hl">' + t.replace(/^|\|/g, '') + '</span>'; }).join('');
    el.innerHTML = '<div class="fp" style="color:' + pc[0] + ';background:' + pc[1] + '">' + tpl.p.slice(0, 2) + '</div>' +
      '<div style="min-width:0;flex:1"><div class="meta"><b style="color:' + pc[0] + '">' + tpl.p + '</b><span>' + nowStr() + '</span>' + S_TAG[tpl.s][0] + '<span>转评赞 ' + (200 + Math.floor(Math.random() * 9000)) + '</span></div>' +
      '<div class="txt">' + content + '</div></div>';
    box.insertBefore(el, box.firstChild);
    while (box.children.length > 26) box.removeChild(box.lastChild);
    feedSeq++;
  }
  for (var i = 0; i < 6; i++) pushFeed();
  feedTimer = setInterval(pushFeed, 3000);
  $('#feedToggle').onclick = function () {
    feedOn = !feedOn;
    if (feedOn) { feedTimer = setInterval(pushFeed, 3000); this.textContent = '暂停推送'; $('#feedState').textContent = '推送中'; }
    else { clearInterval(feedTimer); this.textContent = '恢复推送'; $('#feedState').textContent = '已暂停'; }
  };

  /* ================= 检测：情感分析引擎（真实本地计算） ================= */
  var LEX = {
    pos: { '满意': 2, '喜欢': 2, '感谢': 2, '点赞': 2, '优秀': 2, '贴心': 2, '暖心': 2, '高效': 2, '方便': 2, '厉害': 2, '精彩': 2, '好评': 3, '支持': 1, '期待': 1, '不错': 1.5, '惊艳': 3, '太棒': 3, '完美': 3, '顺利': 1.5, '幸福': 2, '美观': 1.5, '及时': 1.5, '负责': 2, '热情': 1.5, '加油': 1.5, '获奖': 2, '祝贺': 2, '温暖': 2, '贴心服务': 3 },
    neg: { '失望': 2, '糟糕': 2.5, '差劲': 2.5, '吐槽': 1.5, '投诉': 2, '不满': 2, '崩溃': 2, '恶心': 2.5, '难吃': 2, '太差': 2.5, '敷衍': 2, '拖延': 1.5, '低效': 1.5, '离谱': 2, '无语': 1.5, '愤怒': 3, '气人': 2, '坑人': 2, '抢不到': 1.5, '约不到': 1.5, '又崩': 2, '故障': 1.5, '拖欠': 2, '冷漠': 2, '预制': 1, '念PPT': 1.5, '锁场': 2, '黑幕': 3, '内定': 3 },
    degree: { '非常': 1.8, '特别': 1.8, '极其': 2, '太': 1.6, '超': 1.6, '十分': 1.7, '巨': 1.8, '贼': 1.5, '有点': 0.7, '稍微': 0.6, '比较': 0.8, '略微': 0.6, '真的': 1.3, '简直': 1.6 },
    negation: ['不', '没', '无', '别', '非', '未', '毫不', '从不', '难以'],
    sensitive: [
      { cat: '校园安全', words: ['跳楼', '自杀', '自残', '打架', '斗殴', '持刀', '火灾', '爆炸', '坠楼', '轻生', '伤害', '报复社会'] },
      { cat: '食品卫生', words: ['食物中毒', '变质', '发霉', '蟑螂', '老鼠', '地沟油', '拉肚子', '上吐下泻', '异物', '过期'] },
      { cat: '师德师风', words: ['性骚扰', '骚扰', '辱骂学生', '打击报复', '挂科威胁', '收礼', '吃拿卡要'] },
      { cat: '招生考试', words: ['泄题', '买答案', '替考', '保送内定', '改分', '冒名顶替'] },
      { cat: '谣言误导', words: ['内部消息', '听说要', '紧急转发', '千万别', '求辟谣', '据说', '传疯了', '删帖', '封锁消息'] },
      { cat: '权益诉求', words: ['维权', '讨说法', '集体罢', '联名', '曝光', '举报'] }
    ],
    spread: ['转发', '扩散', '曝光', '疯传', '热搜', '发酵']
  };
  function buildRegex(list) {
    var esc = list.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    return new RegExp('(' + esc.join('|') + ')', 'g');
  }
  var RE = {
    pos: buildRegex(Object.keys(LEX.pos)),
    neg: buildRegex(Object.keys(LEX.neg)),
    deg: buildRegex(Object.keys(LEX.degree)),
    sens: buildRegex(LEX.sensitive.reduce(function (a, c) { return a.concat(c.words); }, [])),
    spread: buildRegex(LEX.spread)
  };
  function wordOf(re, s, i, dict) {
    var m = re.lastIndex; re.lastIndex = 0;
    var matches = s.match(re) || [];
    re.lastIndex = 0;
    return matches;
  }
  /* 单句打分：返回 {score, hits:[{w,cat}], posW, negW} */
  function analyzeSentence(s) {
    var score = 0, hits = [];
    var posHits = s.match(RE.pos) || [], negHits = s.match(RE.neg) || [];
    var degHits = s.match(RE.deg) || [], sensHits = s.match(RE.sens) || [], sprHits = s.match(RE.spread) || [];
    posHits.forEach(function (w) {
      var mult = 1;
      var before = s.slice(Math.max(0, s.indexOf(w) - 4), s.indexOf(w));
      Object.keys(LEX.degree).forEach(function (d) { if (before.indexOf(d) >= 0) mult = Math.max(mult, LEX.degree[d]); });
      LEX.negation.forEach(function (n) { if (before.indexOf(n) >= 0) { mult = -mult * 0.9; } });
      score += LEX.pos[w] * mult;
    });
    negHits.forEach(function (w) {
      var mult = 1;
      var before = s.slice(Math.max(0, s.indexOf(w) - 4), s.indexOf(w));
      Object.keys(LEX.degree).forEach(function (d) { if (before.indexOf(d) >= 0) mult = Math.max(mult, LEX.degree[d]); });
      LEX.negation.forEach(function (n) { if (before.indexOf(n) >= 0) { mult = -mult * 0.9; } });
      score -= LEX.neg[w] * mult;
    });
    sensHits.forEach(function (w) {
      var cat = '其他';
      LEX.sensitive.forEach(function (c) { if (c.words.indexOf(w) >= 0) cat = c.cat; });
      hits.push({ w: w, cat: cat });
    });
    score -= sprHits.length * 0.8;
    return { score: score, hits: hits, posN: posHits.length, negN: negHits.length, sensN: sensHits.length, sprN: sprHits.length };
  }
  function highlightSentence(s) {
    var sensSet = {};
    LEX.sensitive.forEach(function (c) { c.words.forEach(function (w) { sensSet[w] = 1; }); });
    function esc(x) { return x.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    var toks = [];
    Object.keys(LEX.pos).forEach(function (w) { toks.push([w, 'p']); });
    Object.keys(LEX.neg).forEach(function (w) { toks.push([w, 'n']); });
    Object.keys(sensSet).forEach(function (w) { toks.push([w, 's']); });
    toks.sort(function (a, b) { return b[0].length - a[0].length; });
    var html = esc(s);
    toks.forEach(function (t) {
      html = html.split(esc(t[0])).join('<mark class="' + (t[1] === 'n' ? '' : t[1]) + '">' + esc(t[0]) + '</mark>');
    });
    return html;
  }
  var SAMPLES = [
    { t: '⚠ 严重 · 食堂卫生事件', s: '家人们谁懂啊，三食堂的麻辣烫里吃出蟑螂，跟窗口反映了还爱答不理！听说不止一个人吃出异物，有人已经拉肚子了。学校后勤是干什么吃的，这种食堂卫生条件还不查？大家转发扩散，让更多人看到，别再踩坑了！' },
    { t: '⚠ 重大 · 校园安全传闻', s: '听说昨晚东区宿舍楼下有人打架斗殴，还传闻动了刀子，保安半小时才到。到底什么情况？学校也不发个通报，别出了事才想起来处理，求官方辟谣或者说明！' },
    { t: '● 较大 · 缴费系统故障', s: '学费缴纳系统今天又崩了，从早上排队到现在一直显示故障，客服电话也打不通。眼看着截止日就要到了，逾期算谁的责任？请相关部门尽快修复并延长缴费期限，否则只能集体投诉了。' },
    { t: '● 较大 · 奖学金评定争议', s: '奖学金评定结果出来了，我只能说很无语。绩点排名靠前的没评上，反而是有人走关系内定了，评定细则也不公开。希望学院给个说法，评定过程能不能透明一点？真的很失望。' },
    { t: '✓ 一般 · 广告灌水', s: '学弟学妹们看过来，考研辅导班优惠最后三天啦，不过确实有点小贵，大家按需选择。' },
    { t: '✓ 正面 · 校园正能量', s: '今天参加校园歌手大赛决赛，现场真的太精彩了！主办方组织得很顺利，志愿者小姐姐也特别热情贴心，为学生会点赞，期待明年的比赛，祝母校越办越好！' }
  ];
  var modCur = 'text';
  $$('#modTabs .chip').forEach(function (c) {
    c.onclick = function () {
      $$('#modTabs .chip').forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      modCur = c.dataset.mod;
      var ta = $('#inputText');
      if (modCur === 'text') { ta.disabled = false; ta.placeholder = '在此粘贴待检测的舆情文本，如帖子、评论、弹幕内容……'; }
      else {
        ta.disabled = true;
        ta.value = modCur === 'image'
          ? '【图像截图演示】已就绪：帖子截图 1 张（1080×1440）\n引擎将执行：OCR 文字提取 → 图像合成痕迹检测 → 情感与敏感词分析。\n（演示环境使用模拟管道，点击「开始检测」查看模拟报告）'
          : '【音视频演示】已就绪：短视频片段 1 段（00:35）\n引擎将执行：语音转写 → 合成语音检测 → 画面换脸检测 → 情感与敏感词分析。\n（演示环境使用模拟管道，点击「开始检测」查看模拟报告）';
      }
    };
  });
  (function renderSamples() {
    $('#sampleList').innerHTML = SAMPLES.map(function (s, i) {
      return '<div class="sample-item" data-i="' + i + '"><span>' + s.t + '</span><span style="color:var(--accent2)">载入 ›</span></div>';
    }).join('');
    $$('#sampleList .sample-item').forEach(function (el) {
      el.onclick = function () {
        var sp = SAMPLES[+el.dataset.i];
        $('#inputText').disabled = false;
        $$('#modTabs .chip').forEach(function (x) { x.classList.toggle('on', x.dataset.mod === 'text'); });
        modCur = 'text';
        $('#inputText').value = sp.s;
        toast('样例已载入：' + sp.t, 'info');
      };
    });
  })();
  $('#btnClear').onclick = function () {
    $('#inputText').value = ''; $('#inputText').disabled = false;
    $('#resultBody').style.display = 'none'; $('#resultEmpty').style.display = 'block';
    $$('#pipeline .pstep').forEach(function (p) { p.classList.remove('done'); });
  };
  function riskOf(score, sensTotal, sprN, len) {
    var density = len ? sensTotal / Math.max(len, 40) : 0;
    var risk = 12 + Math.max(0, -score) * 3.2 + sensTotal * 14 + sprN * 4 + Math.min(density * 260, 18);
    return Math.max(4, Math.min(98, Math.round(risk)));
  }
  $('#btnAnalyze').onclick = function () {
    var btn = this;
    var text = $('#inputText').value.trim();
    if (!text) { toast('请输入待检测文本或选择样例', 'warn'); return; }
    btn.disabled = true; btn.textContent = '检测中…';
    var steps = $$('#pipeline .pstep');
    steps.forEach(function (p) { p.classList.remove('done'); });
    var si = 0;
    var iv = setInterval(function () {
      if (si > 0) steps[si - 1].classList.add('done');
      if (si >= steps.length) {
        clearInterval(iv);
        btn.disabled = false; btn.textContent = '开始检测';
        renderResult(text);
        return;
      }
      si++;
    }, 320);
  };
  function renderResult(text) {
    var sentences = text.split(/[。！？!?；;\n]+/).filter(function (s) { return s.trim().length > 1; });
    if (!sentences.length) sentences = [text];
    var total = 0, allHits = [], posTotal = 0, negTotal = 0, sprTotal = 0;
    var sentResults = sentences.map(function (s) {
      var r = analyzeSentence(s);
      total += r.score; allHits = allHits.concat(r.hits);
      posTotal += r.posN; negTotal += r.negN; sprTotal += r.sprN;
      return { s: s, r: r };
    });
    var len = text.length;
    var risk = riskOf(total, allHits.length, sprTotal, len);
    var level, levelCls, advice;
    if (risk < 25) { level = '低风险'; levelCls = 'b-ok'; advice = '内容风险较低，属常规表达。可纳入日常监测样本库，无需特别处置；若为咨询求助类内容，可转交相关部门回应。'; }
    else if (risk < 50) { level = '中风险'; levelCls = 'b-warn'; advice = '存在一定负面情绪或诉求。建议 24 小时内由责任部门核实情况，通过评论区或私信进行沟通疏导，防止情绪积累升级。'; }
    else if (risk < 75) { level = '高风险'; levelCls = 'b-danger'; advice = '出现明确敏感指向或较强负面情绪，已具备扩散条件。建议立即签收预警，启动核查，2 小时内形成研判意见，同步准备回应口径，并密切关注转发量变化。'; }
    else { level = '严重风险'; levelCls = 'b-danger'; advice = '涉及敏感事件且带有明显扩散动员特征，符合重大舆情要件。建议：① 立即上报党委宣传部与分管校领导；② 1 小时内线上拦截溯源、线下核实处置；③ 视情发布官方通报，堵住谣言空间；④ 对首发账号依规沟通处理。'; }

    $('#resultEmpty').style.display = 'none';
    $('#resultBody').style.display = 'block';
    /* 分数动画 */
    var numEl = $('#riskScore'), cur = 0, t0 = null;
    numEl.style.color = risk < 25 ? 'var(--ok)' : risk < 50 ? 'var(--warn)' : 'var(--danger)';
    function anim(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 900, 1); cur = Math.round(risk * p); numEl.textContent = cur; if (p < 1) requestAnimationFrame(anim); }
    requestAnimationFrame(anim);
    var lv = $('#riskLevel'); lv.className = 'badge ' + levelCls; lv.textContent = level;
    $('#modTag').textContent = modCur === 'text' ? '文本舆情' : modCur === 'image' ? '图像截图（模拟）' : '音视频（模拟）';
    $('#costTime').textContent = (180 + Math.floor(Math.random() * 400)) + ' ms';
    $('#statLen').textContent = len + ' 字 / ' + sentences.length + ' 句';
    $('#statHit').textContent = allHits.length + ' 处';
    /* 情感条：正面=score相关，负面 */
    var posRatio = Math.max(0, Math.min(60, 34 + total * 2.2));
    var negRatio = Math.max(0, Math.min(60, 34 - total * 2.2));
    if (posRatio + negRatio > 100) { var k = 100 / (posRatio + negRatio); posRatio *= k; negRatio *= k; }
    var neuRatio = 100 - posRatio - negRatio;
    $('#sentiBar').innerHTML =
      '<div style="width:' + posRatio + '%;background:var(--ok)"></div>' +
      '<div style="width:' + neuRatio + '%;background:var(--bg3)"></div>' +
      '<div style="width:' + negRatio + '%;background:var(--danger)"></div>';
    $('#sentiLegend').innerHTML =
      '<span><i style="background:var(--ok)"></i>正面 ' + posRatio.toFixed(1) + '%</span>' +
      '<span><i style="background:var(--bg3);border:1px solid var(--rule2)"></i>中性 ' + neuRatio.toFixed(1) + '%</span>' +
      '<span><i style="background:var(--danger)"></i>负面 ' + negRatio.toFixed(1) + '%</span>';
    /* 命中列表 */
    var catColor = { '校园安全': 'b-danger', '食品卫生': 'b-warn', '师德师风': 'b-purple', '招生考试': 'b-info', '谣言误导': 'b-danger', '权益诉求': 'b-warn', '其他': 'b-muted' };
    $('#sensBlock').style.display = allHits.length ? 'block' : 'none';
    $('#hitList').innerHTML = allHits.length
      ? allHits.map(function (h) {
        return '<div class="hit-item"><span class="badge ' + catColor[h.cat] + '">' + h.cat + '</span><span>命中关键词</span><span class="w">「' + h.w + '」</span></div>';
      }).join('')
      : '<div style="font-size:12.5px;color:var(--muted)">未命中敏感词库</div>';
    /* 分句 */
    $('#sentenceList').innerHTML = sentResults.map(function (sr) {
      var cls = 's-sens', tag = ['<span class="badge b-warn">含敏感</span>'];
      if (sr.r.sensN === 0) {
        if (sr.r.score <= -1.5) { cls = 's-neg'; tag = ['<span class="badge b-danger">负面</span>']; }
        else if (sr.r.score >= 1.5) { cls = 's-pos'; tag = ['<span class="badge b-ok">正面</span>']; }
        else { cls = ''; tag = ['<span class="badge b-muted">中性</span>']; }
      }
      return '<div class="sentence ' + cls + '"><div style="margin-bottom:3px">' + tag[0] +
        ' <span style="font-size:11px;color:var(--muted);font-family:var(--mono)">情感值 ' + (sr.r.score > 0 ? '+' : '') + sr.r.score.toFixed(1) + '</span></div>' +
        '<div>' + highlightSentence(sr.s) + '</div></div>';
    }).join('');
    $('#adviceBox').innerHTML = '<span class="badge ' + levelCls + '" style="margin-right:8px">建议</span>' + advice;
    toast('检测完成：' + level + '（评分 ' + risk + '）', risk >= 50 ? 'err' : risk >= 25 ? 'warn' : 'ok');
  }

  /* ================= 预警处置 ================= */
  var ALERTS = [
    { id: 'YJ-20261010-018', t: '网传「三食堂麻辣烫吃出蟑螂」引发关注', plat: '校园墙 → 微博', time: '10-10 09:41', level: 'red', levelTxt: '特大', status: 'pending', senti: -3.8, mentions: 4820, growth: '+320/h', dept: '后勤保障处', desc: '校园墙帖文 2 小时内转发至微博同城热搜，抖音出现配视频，评论区出现「再也不去食堂」等扩散性言论，需立即响应。', records: [] },
    { id: 'YJ-20261010-017', t: '宿舍调整收费标准的未经证实消息', plat: '百度贴吧', time: '10-10 08:15', level: 'orange', levelTxt: '重大', status: 'doing', senti: -2.1, mentions: 1360, growth: '+85/h', dept: '学生工作部', desc: '贴吧流传「明年宿舍费上调 40%」截图，无官方来源。已有学生在评论区询问，需辟谣或说明。', records: [{ tm: '08:31', txt: '学工部值班老师签收预警' }, { tm: '09:02', txt: '核实：财务处今年无调费计划，判定为不实信息' }] },
    { id: 'YJ-20261009-016', t: '奖学金评定细则透明度质疑', plat: '知乎 / 校园墙', time: '10-09 21:20', level: 'orange', levelTxt: '重大', status: 'doing', senti: -2.6, mentions: 2080, growth: '+45/h', dept: '学生工作部 · 相关学院', desc: '多名学生质疑评定过程不公开、存在「内定」，出现「走关系」等指控性表述，学院需公开评定依据。', records: [{ tm: '21:40', txt: '学院副书记签收' }, { tm: '22:15', txt: '约谈发帖学生了解诉求' }, { tm: '次日 10:00', txt: '组织召开评定说明会' }] },
    { id: 'YJ-20261009-015', t: '体育馆预约「锁场」爆料', plat: '微博', time: '10-09 18:03', level: 'yellow', levelTxt: '较大', status: 'doing', senti: -1.9, mentions: 940, growth: '+30/h', dept: '体育部', desc: '用户爆料场馆被「内部锁场」，附预约系统截图。体育部需核查预约后台记录并回应。', records: [{ tm: '18:30', txt: '体育部签收并调取预约日志' }] },
    { id: 'YJ-20261009-014', t: '选课系统崩溃吐槽集中出现', plat: '微博 / 校园墙', time: '10-09 12:40', level: 'yellow', levelTxt: '较大', status: 'done', senti: -1.5, mentions: 1720, growth: '已回落', dept: '信息化办公室', desc: '选课高峰期系统两次中断，吐槽帖集中出现。信息办已扩容并发布致歉说明。', records: [{ tm: '12:55', txt: '信息办签收' }, { tm: '13:40', txt: '系统扩容恢复，发布《致歉与补偿公告》' }, { tm: '10-09 20:00', txt: '舆情热度回落，办结归档' }] },
    { id: 'YJ-20261008-013', t: '「降分录取内部指标」不实信息', plat: '抖音 / 微博', time: '10-08 15:22', level: 'red', levelTxt: '特大', status: 'done', senti: -3.2, mentions: 12600, growth: '已回落', dept: '招生办公室 · 党委宣传部', desc: '高考季旧谣变种，声称可「花钱买内部指标」，两条短视频累计播放 12 万+。已联动平台辟谣并报警备案。', records: [{ tm: '15:40', txt: '宣传部签收，启动重大舆情预案' }, { tm: '16:30', txt: '官微发布辟谣声明' }, { tm: '17:00', txt: '向平台提交谣言投诉，下架 2 条视频' }, { tm: '10-10 09:00', txt: '热度归零，办结归档并纳入案例库' }] },
    { id: 'YJ-20261010-019', t: '咨询：考研自习室开放时间', plat: '校园墙', time: '10-10 10:02', level: 'blue', levelTxt: '一般', status: 'pending', senti: -0.3, mentions: 210, growth: '+12/h', dept: '图书馆', desc: '学生集中咨询自习室 24 小时开放安排，情绪平稳，属常规诉求汇聚，正常回应即可。', records: [] }
  ];
  var L_COLOR = { red: 'b-danger', orange: 'b-warn', yellow: 'b-info', blue: 'b-ok' };
  var S_TXT = { pending: ['待签收', 'b-muted'], doing: ['处置中', 'b-warn'], done: ['已办结', 'b-ok'] };
  var STEPS = ['签收', '研判', '上报', '处置', '办结'];
  var alertFilter = { level: 'all', status: 'all' };
  function stepOf(a) { return a.status === 'pending' ? 0 : a.status === 'doing' ? Math.min(3, a.records.length) : 5; }
  function renderAlerts() {
    var list = ALERTS.filter(function (a) {
      return (alertFilter.level === 'all' || a.level === alertFilter.level) &&
        (alertFilter.status === 'all' || a.status === alertFilter.status);
    });
    $('#alertList').innerHTML = list.length ? list.map(function (a) {
      var st = S_TXT[a.status], prog = stepOf(a);
      var ops = '';
      if (a.status === 'pending') ops = '<button class="btn sm primary" data-op="sign" data-id="' + a.id + '">签收预警</button>';
      else if (a.status === 'doing') ops = '<button class="btn sm primary" data-op="handle" data-id="' + a.id + '">处置反馈</button><button class="btn sm" data-op="close" data-id="' + a.id + '">办结归档</button>';
      else ops = '<button class="btn sm ghost" data-op="view" data-id="' + a.id + '">查看归档</button>';
      ops += '<button class="btn sm ghost" data-op="view" data-id="' + a.id + '">详情</button>';
      var stepsHtml = STEPS.map(function (s, i) {
        return '<div class="step ' + (i < prog ? 'done' : '') + '"><div class="bar"></div><div class="sl">' + s + '</div></div>';
      }).join('');
      return '<div class="alert-item"><div class="top"><span class="badge ' + L_COLOR[a.level] + '">' + a.levelTxt + '</span>' +
        '<h4>' + a.t + '</h4><span class="badge ' + st[1] + '">' + st[0] + '</span></div>' +
        '<div class="desc">' + a.desc + '</div>' +
        '<div class="stats"><span>编号 <b>' + a.id + '</b></span><span>来源 <b>' + a.plat + '</b></span><span>时间 <b>' + a.time + '</b></span>' +
        '<span>涉及 <b>' + a.mentions.toLocaleString() + '</b> 条</span><span>趋势 <b style="color:' + (a.growth === '已回落' || a.growth === '+12/h' ? 'var(--ok)' : 'var(--danger)') + '">' + a.growth + '</b></span>' +
        '<span>情感值 <b style="color:var(--danger)">' + a.senti.toFixed(1) + '</b></span></div>' +
        '<div class="stepper">' + stepsHtml + '</div><div class="ops">' + ops + '</div></div>';
    }).join('') : '<div class="card" style="text-align:center;color:var(--muted);padding:40px">暂无符合条件的预警</div>';
    $$('#alertList [data-op]').forEach(function (b) {
      b.onclick = function () {
        var a = ALERTS.find(function (x) { return x.id === b.dataset.id; });
        var op = b.dataset.op;
        if (op === 'sign') {
          a.status = 'doing'; a.records.push({ tm: nowStr(), txt: '责任部门（' + a.dept + '）签收预警，进入研判' });
          toast('预警已签收，请 30 分钟内完成研判', 'ok');
        } else if (op === 'handle') {
          openModal('处置反馈 · ' + a.id, a.t, handleForm(a));
          return;
        } else if (op === 'close') {
          if (a.records.filter(function (r) { return r.op; }).length === 0 && a.records.length < 2) {
            toast('请先完成至少一次处置反馈再办结', 'warn'); return;
          }
          a.status = 'done'; a.growth = '已回落';
          a.records.push({ tm: nowStr(), txt: '办结归档，纳入案例库', op: true });
          toast('预警已办结归档', 'ok');
        } else if (op === 'view') { openModal('预警详情 · ' + a.id, a.t, detailHtml(a)); return; }
        renderAlerts(); renderFunnel();
      };
    });
    renderFunnel();
  }
  function handleForm(a) {
    return '<div class="kv"><span class="k">当前状态</span><span class="v">处置中（' + a.records.length + ' 条记录）</span></div>' +
      '<textarea id="handleTxt" placeholder="填写处置措施与进展，如：已联系当事学生核实情况，后勤处当日完成后厨检查……" style="margin:12px 0"></textarea>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn ghost" onclick="document.getElementById(\'modal\').classList.remove(\'show\')">取消</button>' +
      '<button class="btn primary" id="handleOk">提交处置记录</button></div>';
  }
  function detailHtml(a) {
    var st = S_TXT[a.status];
    var recs = a.records.length
      ? a.records.map(function (r) {
        return '<div class="log-item"><span class="lt">' + r.tm + '</span><span class="lv"><span class="badge ' + (r.op ? 'b-ok' : 'b-info') + '">' + (r.op ? '办结' : '进展') + '</span></span><span class="lc">' + r.txt + '</span></div>';
      }).join('')
      : '<div style="color:var(--muted);font-size:12.5px;padding:6px 0">暂无处置记录</div>';
    return '<div class="kv"><span class="k">预警等级</span><span class="v"><span class="badge ' + L_COLOR[a.level] + '">' + a.levelTxt + '</span></span></div>' +
      '<div class="kv"><span class="k">状态</span><span class="v"><span class="badge ' + st[1] + '">' + st[0] + '</span></span></div>' +
      '<div class="kv"><span class="k">责任部门</span><span class="v">' + a.dept + '</span></div>' +
      '<div class="kv"><span class="k">来源平台</span><span class="v">' + a.plat + '</span></div>' +
      '<div class="kv"><span class="k">涉及信息量</span><span class="v">' + a.mentions.toLocaleString() + ' 条（' + a.growth + '）</span></div>' +
      '<div class="kv"><span class="k">平均情感值</span><span class="v" style="color:var(--danger)">' + a.senti.toFixed(1) + '</span></div>' +
      '<div style="margin-top:14px" class="card-title">处置记录</div>' + recs;
  }
  $$('#page-alert .chip[data-f]').forEach(function (c) {
    c.onclick = function () {
      $$('[data-f="' + c.dataset.f + '"]').forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      alertFilter[c.dataset.f] = c.dataset.v;
      renderAlerts();
    };
  });
  function renderFunnel() {
    var counts = { pending: 0, doing: 0, done: 0 };
    ALERTS.forEach(function (a) { counts[a.status]++; });
    var total = ALERTS.length;
    var items = [
      ['待签收', counts.pending, 'var(--danger)'],
      ['处置中', counts.doing, 'var(--warn)'],
      ['已办结', counts.done, 'var(--ok)']
    ];
    $('#funnel').innerHTML = items.map(function (it, i) {
      var pct = Math.round(it[1] / total * 100);
      return '<div class="funnel-step"><div class="fn" style="color:' + it[2] + ';background:color-mix(in srgb,' + it[2] + ' 12%,transparent);border:1px solid ' + it[2] + '">' + (i + 1) + '</div>' +
        '<div class="bar-wrap"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>' + it[0] + '</span><b>' + it[1] + ' 起</b></div>' +
        '<div class="bar"><i style="width:' + pct + '%;background:' + it[2] + '"></i></div></div></div>';
    }).join('');
  }
  renderAlerts();
  /* 弹窗内提交处置（事件委托，因弹窗动态渲染） */
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'handleOk') {
      var id = $('#mTitle').textContent.split('· ')[1];
      var a = ALERTS.find(function (x) { return x.id === id; });
      var txt = $('#handleTxt').value.trim();
      if (!txt) { toast('请填写处置措施', 'warn'); return; }
      a.records.push({ tm: nowStr(), txt: txt, op: true });
      closeModal();
      renderAlerts();
      toast('处置记录已提交', 'ok');
    }
  });

  /* ================= 溯源分析 ================= */
  var SCENES = [
    {
      id: 'canteen', name: '食堂卫生事件', risk: '红色 · 特大',
      info: [
        ['事件定性', '食品安全类负面舆情'],
        ['首发时间', '10-10 09:12'],
        ['首发平台', '校园墙（匿名投稿）'],
        ['全网信息量', '4,820 条（仍在上升）'],
        ['情感均值', '-3.8（强烈负面）'],
        ['峰值预测', '今日 14:00 前后']
      ],
      timeline: [
        { tm: '09:12', t: '匿名学生在校园墙发帖', d: '「三食堂麻辣烫吃出蟑螂」，配图 2 张，1 小时内评论 300+', c: 'danger' },
        { tm: '10:05', t: '贴吧转载发酵', d: '截图被转载至校区吧，出现「后勤不作为」等评论', c: 'warn' },
        { tm: '11:30', t: '微博本地博主扩散', d: '本地校园博主转发并加话题 #某高校食堂卫生#，进入同城热搜第 9 位', c: 'danger' },
        { tm: '12:40', t: '抖音短视频传播', d: '学生发布后厨排队实拍视频，播放量 8.6 万，弹幕出现引导性言论', c: 'danger' },
        { tm: '13:20', t: '校方介入回应', d: '后勤保障处封存留样并约谈承包企业，官微发布核查通报', c: 'ok' },
        { tm: '15:00', t: '热度回落', d: '通报发布后负面占比由 78% 降至 31%，事件转入跟踪观察', c: 'ok' }
      ],
      nodes: [
        ['校园墙用户「小行星」', '校园墙', '首发源头', '-', '发帖 1', '98', '已约谈核实'],
        ['本地校园博主「XX高校爆料君」', '微博', '自媒体', '12.6万', '转发 2,340', '91', '已私信沟通'],
        ['抖音用户「同学小王」', '抖音', '普通学生', '3,200', '播放 8.6万', '76', '正常监控'],
        ['校区吧吧友「路过14楼」', '百度贴吧', '普通学生', '860', '转发 410', '52', '正常监控'],
        ['校官方微博', '微博', '官方回应', '8.9万', '通报 1 篇', '88', '已发布通报'],
        ['后勤保障处', '线下', '处置部门', '-', '约谈企业', '-', '处置完成']
      ],
      graph: {
        center: '校园墙首发帖',
        chains: [
          ['贴吧转载 ×410', '普通', 410], ['微博博主扩散 ×2,340', '关键', 2340], ['抖音视频 ×8.6万', '关键', 8600],
          ['同学群聊转发 ×1,900', '普通', 1900]
        ],
        official: '官微通报回应'
      },
      advice: '① 2 小时内发布首次通报：已封存留样、约谈承包企业、启动全面检查，并公布监督电话；② 当日公示后厨检查影像，用事实对冲「老鼠/蟑螂」类猜测；③ 对首发账号依规沟通核实，防止二次爆料；④ 一周内公示整改结果（如窗口停业整顿、供应商更换），形成处置闭环叙事。'
    },
    {
      id: 'dorm', name: '宿舍调整争议', risk: '橙色 · 重大',
      info: [
        ['事件定性', '学生权益类争议舆情'],
        ['首发时间', '10-10 08:15'],
        ['首发平台', '百度贴吧'],
        ['全网信息量', '1,360 条'],
        ['情感均值', '-2.1（明显负面）'],
        ['风险点', '不实截图 + 集体化表达']
      ],
      timeline: [
        { tm: '08:15', t: '贴吧出现调费截图', d: '「明年宿舍费上调 40%」无公章、无来源，但格式逼真', c: 'warn' },
        { tm: '09:00', t: '多群转发', d: '截图在 20+ 个学生群传播，出现「联名反对」接龙', c: 'danger' },
        { tm: '10:30', t: '学工部核实', d: '财务处确认本年度无调费计划，判定不实', c: 'ok' },
        { tm: '11:00', t: '官方澄清', d: '学工部通过辅导员矩阵与官微同步澄清', c: 'ok' }
      ],
      nodes: [
        ['贴吧用户「匿名2026」', '百度贴吧', '首发源头', '-', '发帖 1', '85', '已溯源核实'],
        ['群聊节点（20+ 群）', '微信/QQ', '关键扩散', '-', '覆盖 6,000+', '72', '辅导员群内澄清'],
        ['校园墙转发', '校园墙', '普通转发', '-', '转发 130', '45', '正常监控'],
        ['学生工作部', '线下', '官方回应', '-', '澄清 1 篇', '80', '已发布澄清']
      ],
      graph: {
        center: '贴吧不实截图',
        chains: [['微信群转发 ×20群', '关键', 6000], ['QQ群转发 ×9群', '普通', 2700], ['校园墙转帖 ×130', '普通', 130]],
        official: '学工部澄清说明'
      },
      advice: '① 谣言类信息黄金处置期为 4 小时：由学工部联合财务处发布联合说明，明确「无调费计划」；② 借助辅导员进入群聊矩阵定向澄清，比公开通报更精准；③ 对伪造公章截图溯源，情节严重的移交保卫处；④ 复盘截图流传路径，完善「官方通知统一出口」机制。'
    },
    {
      id: 'admission', name: '招生不实信息', risk: '红色 · 特大',
      info: [
        ['事件定性', '招生类谣言（旧谣新传）'],
        ['首发时间', '10-08 15:22'],
        ['首发平台', '抖音'],
        ['全网信息量', '12,600 条'],
        ['情感均值', '-3.2（强烈负面）'],
        ['风险点', '涉钱涉诈 · 损害学校声誉']
      ],
      timeline: [
        { tm: '15:22', t: '抖音发布「内部指标」视频', d: '声称「花钱可买降分录取名额」，2 小时播放 5 万', c: 'danger' },
        { tm: '16:00', t: '微博二次发酵', d: '教育营销号搬运，附「成功案例」聊天记录', c: 'danger' },
        { tm: '16:30', t: '官微辟谣', d: '招办发布声明：招生录取无任何收费环节', c: 'ok' },
        { tm: '17:00', t: '平台联动处置', d: '向平台提交谣言投诉，2 条视频下架，账号限流', c: 'ok' },
        { tm: '次日 09:00', t: '热度归零', d: '搜索指数回落至基线，转入案例库', c: 'ok' }
      ],
      nodes: [
        ['抖音账号「升学规划-老李」', '抖音', '首发源头', '45万', '播放 5.2万', '95', '视频下架+账号限流'],
        ['微博营销号「教育观察V」', '微博', '关键扩散', '28万', '转发 1,120', '84', '已投诉删除'],
        ['家长群转发（30+ 群）', '微信', '关键扩散', '-', '覆盖 1.2万', '68', '招办进群答疑'],
        ['招生办公室', '官方', '官方回应', '-', '声明 1 篇', '90', '已发布声明'],
        ['属地网信部门', '监管', '协同处置', '-', '-', '-', '已报备']
      ],
      graph: {
        center: '抖音谣言视频',
        chains: [['微博营销号搬运 ×1,120', '关键', 1120], ['家长群转发 ×30群', '关键', 12000], ['贴吧讨论 ×640', '普通', 640]],
        official: '招办辟谣声明'
      },
      advice: '① 涉招生谣言直接触碰「钱与前途」两大敏感点，须 1 小时内启动重大舆情预案；② 联合属地网信、平台方对首发账号处置并固定证据，涉嫌诈骗的移送公安；③ 官微声明同步推送至新生群、家长群，阻断「信息茧房」；④ 每年招录季前置发布「防诈指南」，压缩谣言生存空间。'
    },
    {
      id: 'positive', name: '毕业典礼正能量传播', risk: '蓝色 · 正面',
      info: [
        ['事件定性', '正面形象传播（对照场景）'],
        ['首发时间', '06-22 10:00'],
        ['首发平台', '抖音'],
        ['全网信息量', '28,400 条'],
        ['情感均值', '+4.6（强烈正面）'],
        ['传播价值', '可复制的高校品牌叙事']
      ],
      timeline: [
        { tm: '10:00', t: '抖音首发「校长拨穗」视频', d: '为听障毕业生手语致辞片段，播放 2 小时破 50 万', c: 'ok' },
        { tm: '13:00', t: '微博热搜', d: '#校长为听障学生学手语# 登上同城热搜第 2 位', c: 'ok' },
        { tm: '18:00', t: '媒体跟进', d: '人民网、中国青年报官微转发报道', c: 'ok' },
        { tm: '次日', t: '长尾传播', d: '招生咨询量环比上升 42%，形成品牌外溢', c: 'ok' }
      ],
      nodes: [
        ['校园融媒体中心', '抖音', '官方首发', '15万', '播放 320万', '96', '内容沉淀'],
        ['人民网官方微博', '微博', '媒体放大', '1.2亿', '转发 8,600', '99', '正向引用'],
        ['毕业生转发矩阵', '多平台', '自发扩散', '-', '转发 2.1万', '78', '情感正向'],
        ['中国青年报', '微博', '媒体报道', '6,800万', '报道 1 篇', '92', '正向引用']
      ],
      graph: {
        center: '毕业典礼手语致辞',
        chains: [['微博热搜 ×8,600', '关键', 8600], ['媒体跟进报道', '官方', 4200], ['毕业生自发转发 ×2.1万', '普通', 21000]],
        official: '媒体正向报道'
      },
      advice: '本场景为正面传播对照：① 校园重大仪式应预设「可传播瞬间」（如手语致辞、师长寄语），由融媒体中心储备素材；② 正面内容 24 小时黄金期内主动对接媒体放大；③ 将热度导流至招生咨询、校友捐赠等转化场景；④ 沉淀为品牌叙事案例库，用于应对负面舆情时的形象对冲。'
    }
  ];
  var scnCur = SCENES[0];
  (function initScenes() {
    $('#scnTabs').innerHTML = SCENES.map(function (s, i) {
      return '<button class="chip ' + (i === 0 ? 'on' : '') + '" data-i="' + i + '">' + s.name + '</button>';
    }).join('');
    $$('#scnTabs .chip').forEach(function (c) {
      c.onclick = function () {
        $$('#scnTabs .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        scnCur = SCENES[+c.dataset.i];
        renderScene();
      };
    });
    renderScene();
  })();
  function renderScene() {
    var s = scnCur;
    window.APP._scn = s;
    $('#scnInfo').innerHTML = s.info.map(function (kv) {
      return '<div class="kv"><span class="k">' + kv[0] + '</span><span class="v">' + kv[1] + '</span></div>';
    }).join('');
    $('#scnTimeline').innerHTML = s.timeline.map(function (t, i) {
      var cls = t.c === 'ok' ? '' : 'mute';
      var color = t.c === 'ok' ? 'var(--ok)' : t.c === 'danger' ? 'var(--danger)' : 'var(--warn)';
      return '<div class="tl-item ' + cls + '"><div class="node" style="' + (t.c === 'ok' ? 'border-color:var(--ok);box-shadow:0 0 10px rgba(16,217,140,.5)' : t.c === 'danger' ? 'border-color:var(--danger);box-shadow:0 0 10px rgba(255,84,112,.5)' : '') + '"></div>' +
        '<div class="tt"><span style="font-family:var(--mono);font-size:12px;color:' + color + '">' + t.tm + '</span>' + t.t + '</div>' +
        '<div class="td">' + t.d + '</div><div class="detail">阶段说明：该节点 ' + t.d + ' 可点击时间轴上方任意节点展开复核。</div></div>';
    }).join('');
    $$('#scnTimeline .tl-item').forEach(function (el) {
      el.onclick = function () { el.classList.toggle('open'); };
    });
    $('#scnAdvice').innerHTML = '<div class="card" style="box-shadow:none;background:rgba(79,124,255,.06);border-color:rgba(79,124,255,.25)">' + s.advice + '</div>';
    $('#nodeTable tbody').innerHTML = s.nodes.map(function (n) {
      var typeCls = n[2] === '首发源头' ? 'b-danger' : n[2] === '官方回应' || n[2] === '官方' || n[2] === '处置部门' || n[2] === '官方首发' || n[2] === '协同处置' ? 'b-ok' : n[2] === '关键扩散' || n[2] === '自媒体' ? 'b-warn' : n[2] === '媒体放大' || n[2] === '媒体报道' ? 'b-purple' : 'b-muted';
      var inf = parseFloat(n[5]);
      return '<tr><td><b>' + n[0] + '</b></td><td>' + n[1] + '</td><td><span class="badge ' + typeCls + '">' + n[2] + '</span></td>' +
        '<td style="font-family:var(--mono)">' + n[3] + '</td><td style="font-family:var(--mono)">' + n[4] + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;border-radius:4px;background:var(--bg3)"><div style="width:' + inf + '%;height:100%;border-radius:4px;background:' + (inf >= 85 ? 'var(--danger)' : inf >= 60 ? 'var(--warn)' : 'var(--accent)') + '"></div></div><span style="font-family:var(--mono);font-size:12px">' + n[5] + '</span></div></td>' +
        '<td>' + n[6] + '</td></tr>';
    }).join('');
    if (window.Charts) Charts.refreshGraph(scnCur);
  }

  /* ================= 审计看板 ================= */
  var AUDIT = [
    ['10-10 09:41', '三食堂食品卫生舆情', '特大', '后勤保障处', '封存留样 + 通报回应', '处置中'],
    ['10-10 08:31', '宿舍调费不实信息', '重大', '学生工作部', '群矩阵澄清 + 截图溯源', '处置中'],
    ['10-09 12:55', '选课系统中断吐槽', '较大', '信息化办公室', '系统扩容 + 致歉公告', '已办结'],
    ['10-09 21:40', '奖学金评定质疑', '重大', '相关学院', '评定说明会 + 细则公开', '处置中'],
    ['10-08 15:40', '招生内部指标谣言', '特大', '党委宣传部', '辟谣声明 + 平台联动', '已办结'],
    ['10-07 16:20', '体育馆预约锁场爆料', '较大', '体育部', '后台核查 + 规则优化', '已办结'],
    ['10-06 10:15', '论坛违规广告清理', '一般', '网信办', '删除 42 条 + 账号警告', '已办结'],
    ['10-05 14:02', '食堂调价咨询集中', '一般', '后勤保障处', '价格公示回应', '已办结']
  ];
  var LOGS = [
    ['10:12:36', 'danger', '系统', '捕获红色预警 YJ-20261010-018，自动推送至宣传部值班群'],
    ['10:10:02', 'info', '系统', '完成第 288 轮全平台采集，新增信息 1,247 条'],
    ['09:58:44', 'warn', 'NLP引擎', '「宿舍费上调」话题负面占比连续 3 轮超阈值（46%）'],
    ['09:41:20', 'danger', '系统', '触发四级红色预警规则：敏感词「蟑螂」+ 扩散词「转发」+ 增速异常'],
    ['09:31:08', 'info', '值班员·宣', '签收预警 YJ-20261010-018'],
    ['09:02:17', 'info', '学工部·王', '提交研判记录：宿舍调费信息判定不实'],
    ['08:45:30', 'warn', '系统', '抖音「降分录取」旧谣出现二次传播苗头，已加强监控'],
    ['08:20:11', 'info', '系统', '完成第 287 轮全平台采集，新增信息 986 条'],
    ['07:55:42', 'danger', '账号安全', '监测到 3 个匿名批量发帖账号，行为特征疑似水军，已标记'],
    ['07:30:05', 'info', '值班员·宣', '早班交接：夜间无预警升级，3 起一般预警持续观察']
  ];
  (function initAudit() {
    var lvCls = { '特大': 'b-danger', '重大': 'b-warn', '较大': 'b-info', '一般': 'b-muted' };
    $('#auditTable tbody').innerHTML = AUDIT.map(function (r) {
      var resCls = r[5] === '已办结' ? 'b-ok' : 'b-warn';
      return '<tr><td style="font-family:var(--mono);font-size:12px">' + r[0] + '</td><td><b>' + r[1] + '</b></td>' +
        '<td><span class="badge ' + lvCls[r[2]] + '">' + r[2] + '</span></td><td>' + r[3] + '</td><td>' + r[4] + '</td>' +
        '<td><span class="badge ' + resCls + '">' + r[5] + '</span></td></tr>';
    }).join('');
    var lvMap = { info: ['b-info', '信息'], warn: ['b-warn', '警告'], danger: ['b-danger', '危险'] };
    function renderLogs(lv) {
      $('#logList').innerHTML = LOGS.filter(function (l) { return lv === 'all' || l[1] === lv; }).map(function (l) {
        return '<div class="log-item"><span class="lt">' + l[0] + '</span><span class="lv"><span class="badge ' + lvMap[l[1]][0] + '">' + lvMap[l[1]][1] + '</span></span>' +
          '<span class="lc"><b style="margin-right:6px">' + l[2] + '</b>' + l[3] + '</span></div>';
      }).join('');
    }
    renderLogs('all');
    $$('#logFilter .chip').forEach(function (c) {
      c.onclick = function () {
        $$('#logFilter .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on'); renderLogs(c.dataset.lv);
      };
    });
  })();

  /* 启动 */
  var initPage = location.hash.replace('#/', '') || 'overview';
  goto(initPage);
})();
