/* 图表模块 —— 基于 Apache ECharts（github.com/apache/echarts, Apache-2.0） */
(function () {
  'use strict';
  var css = getComputedStyle(document.documentElement);
  var accent = css.getPropertyValue('--accent').trim();
  var accent2 = css.getPropertyValue('--accent2').trim();
  var ink = css.getPropertyValue('--ink').trim();
  var muted = css.getPropertyValue('--muted').trim();
  var rule = css.getPropertyValue('--rule').trim();
  var ok = css.getPropertyValue('--ok').trim();
  var warn = css.getPropertyValue('--warn').trim();
  var danger = css.getPropertyValue('--danger').trim();
  var purple = css.getPropertyValue('--purple').trim();

  var registry = {};   // id -> echarts instance
  var built = {};      // page -> bool

  function make(id, optionFn) {
    return function () {
      var el = document.getElementById(id);
      if (!el || registry[id]) { if (registry[id]) registry[id].resize(); return; }
      var chart = echarts.init(el, null, { renderer: 'svg' });
      chart.setOption(optionFn());
      registry[id] = chart;
      window.addEventListener('resize', function () { chart.resize(); });
    };
  }

  var APP = window.APP || {};

  /* ---- 总览：7 日趋势（柱 + 折线双轴） ---- */
  var trendChart = make('chartTrend', function () {
    return {
      tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 } },
      legend: { data: ['舆情总量', '敏感信息占比'], textStyle: { color: muted, fontSize: 11 }, top: 0, itemWidth: 14, itemHeight: 9 },
      grid: { left: 54, right: 50, top: 36, bottom: 26 },
      xAxis: { type: 'category', data: APP.trend.days, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 11 } },
      yAxis: [
        { type: 'value', name: '条', nameTextStyle: { color: muted }, splitLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 11 } },
        { type: 'value', name: '%', nameTextStyle: { color: muted }, min: 0, max: 15, splitLine: { show: false }, axisLabel: { color: muted, fontSize: 11 } }
      ],
      series: [
        {
          name: '舆情总量', type: 'bar', data: APP.trend.vol, barWidth: '38%',
          itemStyle: { borderRadius: [5, 5, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: accent }, { offset: 1, color: 'rgba(79,124,255,.25)' }]) }
        },
        {
          name: '敏感信息占比', type: 'line', yAxisIndex: 1, data: APP.trend.sens, smooth: true,
          lineStyle: { color: danger, width: 2.5 }, itemStyle: { color: danger, borderColor: '#101a33', borderWidth: 2 },
          symbolSize: 8, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(255,84,112,.28)' }, { offset: 1, color: 'rgba(255,84,112,0)' }]) }
        }
      ]
    };
  });

  /* ---- 总览：情感分布环形图 ---- */
  var sentiChart = make('chartSenti', function () {
    return {
      tooltip: { trigger: 'item', appendToBody: true, formatter: '{b}：{c}%（{d}%）', backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 } },
      legend: { bottom: 6, textStyle: { color: muted, fontSize: 12 }, itemWidth: 14, itemHeight: 9 },
      series: [{
        type: 'pie', radius: ['48%', '70%'], center: ['50%', '46%'],
        label: { show: true, position: 'center', formatter: '11.9%\n负面占比', color: ink, fontSize: 15, fontWeight: 700, lineHeight: 20 },
        itemStyle: { borderColor: '#0a0f1e', borderWidth: 3 },
        data: [
          { name: '正面', value: APP.senti[0].value, itemStyle: { color: ok } },
          { name: '中性', value: APP.senti[1].value, itemStyle: { color: 'rgba(139,152,184,.45)' } },
          { name: '负面', value: APP.senti[2].value, itemStyle: { color: danger } }
        ]
      }]
    };
  });

  /* ---- 总览：平台声量横向条形 ---- */
  var sourceChart = make('chartSource', function () {
    var names = APP.sources.map(function (s) { return s.name; }).reverse();
    var vals = APP.sources.map(function (s) { return s.value; }).reverse();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 }, formatter: '{b}：{c} 条' },
      grid: { left: 90, right: 40, top: 10, bottom: 24 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 11 } },
      yAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: rule } }, axisLabel: { color: ink, fontSize: 12 } },
      series: [{
        type: 'bar', data: vals, barWidth: 16,
        label: { show: true, position: 'right', color: muted, fontSize: 11, fontFamily: 'Consolas' },
        itemStyle: { borderRadius: [0, 8, 8, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: accent }, { offset: 1, color: accent2 }]) }
      }]
    };
  });

  /* ---- 溯源：传播关系力导向图 ---- */
  var graphChart = make('chartGraph', function () {
    var s = (window.APP._scn) || null;
    return buildGraph(window.APP._scn);
  });

  function buildGraph(scene) {
    if (!scene) return { series: [] };
    var cats = [
      { name: '首发源头', itemStyle: { color: danger } },
      { name: '关键扩散', itemStyle: { color: warn } },
      { name: '普通转发', itemStyle: { color: accent } },
      { name: '官方节点', itemStyle: { color: ok } }
    ];
    var catIdx = { '首发源头': 0, '关键': 1, '普通': 2, '官方': 3 };
    var nodes = [{ name: scene.center, symbolSize: 62, category: 0, value: '首发', label: { show: true, fontSize: 11 } }];
    var links = [];
    scene.chains.forEach(function (c, i) {
      nodes.push({ name: c[0], symbolSize: c[2] > 5000 ? 46 : c[2] > 1000 ? 36 : 26, category: catIdx[c[1]] != null ? catIdx[c[1]] : 2, value: c[2] });
      links.push({ source: scene.center, target: c[0], value: c[2], lineStyle: { width: c[2] > 5000 ? 3.5 : c[2] > 1000 ? 2.4 : 1.4, color: 'source', opacity: .45, curveness: .25 } });
      links.push({ source: c[0], target: scene.official, lineStyle: { width: 1.2, color: ok, opacity: .35, type: 'dashed', curveness: .2 } });
    });
    nodes.push({ name: scene.official, symbolSize: 54, category: 3, itemStyle: { color: ok, borderColor: 'rgba(16,217,140,.6)', borderWidth: 2 }, label: { show: true, color: ok } });
    return {
      tooltip: { appendToBody: true, backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 }, formatter: function (p) { return p.dataType === 'node' ? '<b>' + p.name + '</b>' + (p.value != null && !isNaN(p.value) ? '<br>传播量：' + Number(p.value).toLocaleString() : '') : p.data.source + ' → ' + p.data.target; } },
      legend: { data: cats.map(function (c) { return c.name; }), textStyle: { color: muted, fontSize: 11 }, bottom: 0, itemWidth: 14, itemHeight: 9 },
      series: [{
        type: 'graph', layout: 'force', roam: true, draggable: true,
        categories: cats,
        force: { repulsion: 520, edgeLength: [110, 200], gravity: .12 },
        label: { show: true, color: ink, fontSize: 11, formatter: function (p) { return p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name; } },
        lineStyle: { color: 'source', opacity: .4, curveness: .2 },
        emphasis: { focus: 'adjacency', lineStyle: { width: 4 } },
        data: nodes, links: links
      }]
    };
  }

  /* ---- 审计：各院系舆情量 ---- */
  var deptChart = make('chartDept', function () {
    var depts = ['计算机学院', '经济管理学院', '外国语学院', '机械工程学院', '化学学院', '文学院', '法学院', '艺术学院', '数学学院', '物理学院'];
    var vals = [186, 152, 138, 124, 110, 96, 88, 74, 66, 52];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 } },
      grid: { left: 86, right: 36, top: 10, bottom: 24 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: rule } }, axisLabel: { color: muted, fontSize: 11 } },
      yAxis: { type: 'category', data: depts.slice().reverse(), axisLine: { lineStyle: { color: rule } }, axisLabel: { color: ink, fontSize: 11.5 } },
      series: [{
        type: 'bar', data: vals.slice().reverse(), barWidth: 12,
        itemStyle: { borderRadius: [0, 7, 7, 0], color: function (p) { return new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: 'rgba(79,124,255,.9)' }, { offset: 1, color: p.value > 150 ? danger : p.value > 110 ? warn : accent2 }]); } }
      }]
    };
  });

  /* ---- 审计：预警类型玫瑰图 ---- */
  var typeChart = make('chartType', function () {
    return {
      tooltip: { trigger: 'item', appendToBody: true, backgroundColor: '#101a33', borderColor: 'rgba(139,152,184,.3)', textStyle: { color: ink, fontSize: 12 }, formatter: '{b}：{c} 起（{d}%）' },
      legend: { bottom: 0, textStyle: { color: muted, fontSize: 11 }, itemWidth: 13, itemHeight: 9 },
      series: [{
        type: 'pie', roseType: 'radius', radius: ['22%', '68%'], center: ['50%', '44%'],
        itemStyle: { borderColor: '#0a0f1e', borderWidth: 2, borderRadius: 5 },
        label: { color: muted, fontSize: 11 },
        data: [
          { name: '后勤服务', value: 34, itemStyle: { color: accent } },
          { name: '学业管理', value: 26, itemStyle: { color: accent2 } },
          { name: '食品卫生', value: 18, itemStyle: { color: warn } },
          { name: '校园安全', value: 12, itemStyle: { color: danger } },
          { name: '招生考试', value: 9, itemStyle: { color: purple } },
          { name: '其他', value: 14, itemStyle: { color: 'rgba(139,152,184,.5)' } }
        ]
      }]
    };
  });

  var PAGE_MAP = {
    overview: [trendChart, sentiChart, sourceChart],
    trace: [function () { if (registry['chartGraph']) { registry['chartGraph'].setOption(buildGraph(window.APP._scn)); registry['chartGraph'].resize(); } else graphChart(); }],
    audit: [deptChart, typeChart]
  };

  window.Charts = {
    show: function (page) {
      (PAGE_MAP[page] || []).forEach(function (fn) { try { fn(); } catch (e) { console.error('[Charts]', page, e); } });
    },
    refreshGraph: function (scene) {
      window.APP._scn = scene;
      if (registry['chartGraph']) { registry['chartGraph'].setOption(buildGraph(scene)); registry['chartGraph'].resize(); }
      else { graphChart(); }
    }
  };

  /* charts.js 晚于 app.js 加载：初始化当前已激活页面的图表 */
  (function () {
    var active = document.querySelector('.page.active');
    if (active) window.Charts.show(active.id.replace('page-', ''));
  })();
})();
