(function (root, factory) {
  var core = null;
  try {
    if (typeof require !== 'undefined') core = require('./core-utils.js');
  } catch (e) { core = null; }
  core = core || root.SMCore || (typeof globalThis !== 'undefined' ? globalThis.SMCore : null);
  var api = factory(core);
  root.SMArchive = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  core = core || {};
  function safeUrl(u) {
    if (core.safeUrl) return core.safeUrl(u);
    if (!u || typeof u !== 'string') return null;
    try { return new URL(u.trim()); } catch (e) { return null; }
  }
  function getHostname(u) {
    if (core.getHostname) return core.getHostname(u);
    var p = safeUrl(u); return p ? p.hostname.toLowerCase() : '';
  }
  function getBaseDomain(u) {
    if (core.getBaseDomain) return core.getBaseDomain(u);
    var h = getHostname(u).replace(/^www\./, '');
    var parts = h.split('.');
    return parts.length <= 2 ? h : parts.slice(-2).join('.');
  }
  function tokenizeTitle(t) {
    if (core.tokenizeTitle) return core.tokenizeTitle(t);
    return String(t || '').toLowerCase().match(/[a-z0-9\u4e00-\u9fff]{2,}/g) || [];
  }

  var CATEGORIES = [
    { id: 'ai', label: 'AI', labelZh: 'AI 人工智能', icon: '🤖', hosts: ['openai.com', 'platform.openai.com', 'chatgpt.com', 'chat.openai.com', 'anthropic.com', 'claude.ai', 'gemini.google.com', 'bard.google.com', 'copilot.microsoft.com', 'huggingface.co', 'perplexity.ai', 'poe.com', 'character.ai', 'midjourney.com', 'stability.ai', 'replicate.com', 'cohere.com', 'mistral.ai', 'groq.com', 'kimi.moonshot.cn', 'doubao.com', 'tongyi.aliyun.com', 'yiyan.baidu.com'], keywords: ['openai', 'chatgpt', 'gpt-4', 'gpt-3', 'Muse', 'gemini', 'copilot', 'llm', 'huggingface', 'perplexity', 'midjourney', 'stable-diffusion', 'stability', 'langchain', 'prompt'], titleKeywords: ['openai', 'chatgpt', 'gpt', 'Muse', 'gemini', 'copilot', 'llm', 'huggingface', 'perplexity', 'midjourney', '机器学习', '人工智能', '大模型'], pathHints: ['/gpt/', '/llm/', '/ai/'] },
    { id: 'dev', label: 'Dev', labelZh: '开发资源', icon: '💻', hosts: ['github.com', 'gist.github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com', 'stackexchange.com', 'npmjs.com', 'pypi.org', 'crates.io', 'pkg.go.dev', 'developer.mozilla.org', 'dev.to', 'codepen.io', 'jsfiddle.net', 'docker.com', 'hub.docker.com', 'kubernetes.io', 'gitbook.io', 'vercel.app', 'netlify.app', 'cloudflare.com', 'digitalocean.com', 'aws.amazon.com', 'azure.microsoft.com', 'gitee.com', 'csdn.net', 'juejin.cn', 'segmentfault.com'], keywords: ['github', 'gitlab', 'stackoverflow', 'npm', 'pip', 'docker', 'kubernetes', 'api', 'sdk', 'pull-request', 'commit'], titleKeywords: ['github', 'gitlab', 'stackoverflow', 'npm', 'docker', 'kubernetes', 'api', 'sdk', '代码', '开源', '编程', '开发', '程序'], pathHints: ['/pull/', '/issues/', '/commit/', '/blob/', '/tree/', '/api/', '/sdk/', '/npm/', '/github/'] },
    { id: 'docs', label: 'Docs', labelZh: '文档资料', icon: '📄', hosts: ['readthedocs.io', 'readthedocs.org', 'gitbook.io', 'notion.site', 'docs.python.org', 'docs.rs', 'hexdocs.pm', 'godoc.org', 'confluence.atlassian.com', 'wiki.archlinux.org', 'wikipedia.org', 'zh.wikipedia.org', 'baike.baidu.com'], keywords: ['readthedocs', 'gitbook', 'confluence', 'wiki'], titleKeywords: ['documentation', 'handbook', 'manual', 'reference', 'wiki', '文档', '手册', '百科', '说明'], pathHints: ['/docs/', '/documentation/', '/wiki/', '/manual/', '/handbook/', '/reference/', '/guide/'] },
    { id: 'design', label: 'Design', labelZh: '设计素材', icon: '🎨', hosts: ['dribbble.com', 'behance.net', 'figma.com', 'sketch.com', 'canva.com', 'adobe.com', 'pinterest.com', 'huaban.com', 'zcool.com.cn'], keywords: ['dribbble', 'behance', 'figma', 'sketch', 'canva', 'photoshop'], titleKeywords: ['design', 'figma', 'dribbble', 'behance', 'ui', 'ux', '设计'], pathHints: ['/design/', '/dribbble/', '/behance/'] },
    { id: 'video', label: 'Video', labelZh: '视频影音', icon: '🎬', hosts: ['youtube.com', 'youtu.be', 'vimeo.com', 'netflix.com', 'twitch.tv', 'bilibili.com', 'youku.com', 'iqiyi.com', 'v.qq.com', 'mgtv.com', 'douyin.com', 'acfun.cn'], keywords: ['youtube', 'vimeo', 'netflix', 'twitch', 'bilibili', 'youku', 'iqiyi'], titleKeywords: ['video', 'youtube', 'vimeo', 'watch', 'live', '视频', '电影', '观看'], pathHints: ['/watch', '/video/', '/embed/', '/live/', '/play/'] },
    { id: 'audio', label: 'Audio', labelZh: '音频播客', icon: '🎧', hosts: ['xiaoyuzhoufm.com', 'spotify.com', 'open.spotify.com', 'music.apple.com', 'podcasts.apple.com', 'soundcloud.com', 'music.youtube.com', 'music.163.com', 'y.qq.com', 'kugou.com', 'kuwo.cn', 'ximalaya.com', 'lizhi.fm', 'podcasts.google.com', 'douban.fm'], keywords: ['spotify', 'soundcloud', 'podcast', 'xiaoyuzhou', 'ximalaya', 'fm'], titleKeywords: ['podcast', 'audio', 'music', 'episode', 'spotify', 'soundcloud', '播客', '音乐', '电台', '节目'], pathHints: ['/episode/', '/podcast/', '/audio/', '/music/', '/fm/'] },
    { id: 'news', label: 'News', labelZh: '新闻资讯', icon: '📰', hosts: ['bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com', 'bloomberg.com', 'thepaper.cn', 'sina.com.cn', 'news.sina.com.cn', 'sohu.com', 'news.sohu.com', 'ifeng.com', 'toutiao.com', 'qq.com', 'news.qq.com', '163.com', 'news.163.com', 'huxiu.com', '36kr.com'], keywords: ['bbc', 'cnn', 'reuters', 'bloomberg', 'guardian'], titleKeywords: ['news', 'breaking', 'headline', 'report', '新闻', '资讯', '报道', '头条', '快讯'], pathHints: ['/news/', '/article/', '/story/'] },
    { id: 'social', label: 'Social', labelZh: '社交社区', icon: '💬', hosts: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'weibo.com', 'zhihu.com', 'douban.com', 'tieba.baidu.com', 't.me', 'telegram.me', 'discord.com', 'slack.com', 'threads.net', 'mastodon.social'], keywords: ['twitter', 'facebook', 'instagram', 'reddit', 'weibo', 'zhihu', 'douban', 'tieba', 'tweet'], titleKeywords: ['tweet', 'reddit', 'weibo', 'zhihu', 'douban', 'post', 'thread', '微博', '知乎', '豆瓣', '贴吧', '社交'], pathHints: ['/status/', '/user/'] },
    { id: 'edu', label: 'Edu', labelZh: '教育学习', icon: '🎓', hosts: ['coursera.org', 'edx.org', 'udemy.com', 'khanacademy.org', 'w3schools.com', 'runoob.com', 'liaoxuefeng.com', 'imooc.com', 'study.163.com', 'ke.qq.com', 'mit.edu', 'stanford.edu', 'harvard.edu', 'icourse163.org', 'bilibili.com'], keywords: ['coursera', 'udemy', 'edx', 'khan', 'course', 'lecture', 'mooc'], titleKeywords: ['course', 'lecture', 'lesson', 'learn', 'study', 'mooc', '课程', '学习', '教育', '课堂', '教程指南'], pathHints: ['/course/', '/learn/', '/lecture/', '/lesson/', '/tutorial/', '/edu/'] },
    { id: 'shopping', label: 'Shopping', labelZh: '购物消费', icon: '🛒', hosts: ['amazon.com', 'amazon.cn', 'ebay.com', 'taobao.com', 'tmall.com', 'jd.com', 'pinduoduo.com', 'pdd.com', 'suning.com', 'dangdang.com', 'smzdm.com', 'dewu.com', 'vip.com', '1688.com', 'aliexpress.com'], keywords: ['amazon', 'ebay', 'taobao', 'tmall', 'jd.com', 'smzdm', 'aliexpress'], titleKeywords: ['shop', 'buy', 'deal', 'discount', 'coupon', '购物', '淘宝', '京东', '优惠', '值得买', '拼多多'], pathHints: ['/product/', '/item/', '/dp/', '/buy/', '/cart/', '/order/', '/goods/'] },
    { id: 'office', label: 'Office', labelZh: '办公工具', icon: '📊', hosts: ['docs.google.com', 'drive.google.com', 'mail.google.com', 'office.com', 'outlook.live.com', 'onedrive.live.com', 'dropbox.com', 'notion.so', 'feishu.cn', 'dingtalk.com', 'docs.qq.com', 'docs.feishu.cn', 'pan.baidu.com', 'aliyundrive.com'], keywords: ['gmail', 'outlook', 'notion', 'dropbox', 'onedrive', 'feishu', 'dingtalk', 'spreadsheet'], titleKeywords: ['sheet', 'office', 'notion', 'drive', 'email', 'slide', '表格', '文档办公', '邮箱', '会议'], pathHints: ['/docs/', '/sheets/', '/drive/', '/mail/', '/calendar/', '/meeting/'] },
    { id: 'game', label: 'Game', labelZh: '游戏娱乐', icon: '🎮', hosts: ['store.steampowered.com', 'steampowered.com', 'epicgames.com', 'ign.com', 'gamespot.com', 'nintendo.com', 'playstation.com', 'xbox.com', '4399.com', '7k7k.com', 'gameres.com', '3dmgame.com', 'ali213.net'], keywords: ['steam', 'epicgames', 'nintendo', 'playstation', 'xbox', 'ign'], titleKeywords: ['game', 'gaming', 'steam', 'playstation', 'xbox', '游戏', '电竞'], pathHints: ['/game/', '/games/', '/play/'] },
    { id: 'finance', label: 'Finance', labelZh: '金融理财', icon: '💰', hosts: ['paypal.com', 'stripe.com', 'alipay.com', 'bankofamerica.com', 'chase.com', 'icbc.com.cn', 'ccb.com', 'abchina.com', 'bankcomm.com', 'xueqiu.com', 'eastmoney.com', '10jqka.com.cn', 'futu5.com', 'tigerbrokers.com'], keywords: ['paypal', 'stripe', 'alipay', 'bank', 'stock', 'fund'], titleKeywords: ['bank', 'finance', 'stock', 'investment', 'fund', 'pay', '银行', '金融', '股票', '基金', '理财', '支付'], pathHints: ['/finance/', '/bank/', '/pay/', '/stock/', '/fund/', '/quote/'] },
    { id: 'travel', label: 'Travel', labelZh: '旅行出行', icon: '✈️', hosts: ['booking.com', 'expedia.com', 'trip.com', 'ctrip.com', 'qunar.com', 'airbnb.com', 'maps.google.com', 'amap.com', 'map.baidu.com', '12306.cn', 'fliggy.com', 'mafengwo.cn', 'dianping.com'], keywords: ['booking', 'expedia', 'airbnb', 'ctrip', 'trip.com', 'qunar'], titleKeywords: ['travel', 'hotel', 'flight', 'booking', 'trip', '旅游', '酒店', '机票', '攻略', '出行'], pathHints: ['/hotel/', '/flight/', '/travel/', '/booking/', '/trip/'] },
    { id: 'other', label: 'Other', labelZh: '其他', icon: '📦', hosts: [], keywords: [], titleKeywords: [], pathHints: [] }
  ];

  var ORDER = {};
  for (var oi = 0; oi < CATEGORIES.length; oi++) ORDER[CATEGORIES[oi].id] = oi;

  // Precomputed indexes for speed.
  var hostMap = new Map();
  var baseMap = new Map();
  var titleKwMap = new Map();
  var urlKwMap = new Map();
  var phraseList = [];
  var pathHintList = [];
  var byId = {};
  for (var ci = 0; ci < CATEGORIES.length; ci++) {
    (function (cat) {
      byId[cat.id] = cat;
      var hs = cat.hosts || [];
      for (var i = 0; i < hs.length; i++) {
        var h = String(hs[i]).toLowerCase().replace(/\.$/, '');
        if (!h) continue;
        if (!hostMap.has(h)) hostMap.set(h, cat.id);
        var b = getBaseDomain('https://' + h);
        if (b && !baseMap.has(b)) baseMap.set(b, cat.id);
      }
      var tk = cat.titleKeywords || [];
      for (var j = 0; j < tk.length; j++) {
        var t = String(tk[j]).toLowerCase();
        if (!t) continue;
        if (/[\s\-_/]/.test(t) || /[\u4e00-\u9fff]/.test(t) && t.length > 2) {
          phraseList.push({ phrase: t, cat: cat.id });
        }
        if (!/[\s]/.test(t)) {
          var arr = titleKwMap.get(t);
          if (!arr) { arr = []; titleKwMap.set(t, arr); }
          if (arr.indexOf(cat.id) < 0) arr.push(cat.id);
        }
      }
      var uk = cat.keywords || [];
      for (var k = 0; k < uk.length; k++) {
        var u2 = String(uk[k]).toLowerCase();
        if (!u2) continue;
        var a2 = urlKwMap.get(u2);
        if (!a2) { a2 = []; urlKwMap.set(u2, a2); }
        if (a2.indexOf(cat.id) < 0) a2.push(cat.id);
      }
      var ph = cat.pathHints || [];
      for (var p = 0; p < ph.length; p++) {
        var hint = String(ph[p]).toLowerCase();
        if (hint) pathHintList.push({ hint: hint, cat: cat.id });
      }
    })(CATEGORIES[ci]);
  }

  var customExact = new Map();

  var W_HOST = 10, W_BASE = 6, W_PATH = 3, W_TITLE = 2, W_URL = 1;
  var MIN_SCORE = 2;

  function normHost(h) {
    h = String(h || '').toLowerCase().replace(/\.$/, '');
    if (h.indexOf('www.') === 0) return h.slice(4);
    return h;
  }

  function lookupBuiltinHost(hostFull) {
    if (!hostFull) return null;
    var h = hostFull.toLowerCase().replace(/\.$/, '');
    var variants = [h];
    var stripped = normHost(h);
    if (stripped !== h) variants.push(stripped);
    for (var v = 0; v < variants.length; v++) {
      if (hostMap.has(variants[v])) return hostMap.get(variants[v]);
    }
    // subdomain walk on stripped form
    var parts = stripped.split('.');
    for (var i = 1; i < parts.length - 1; i++) {
      var suffix = parts.slice(i).join('.');
      if (hostMap.has(suffix)) return hostMap.get(suffix);
    }
    return null;
  }

  function lookupCustom(hostFull) {
    if (!hostFull || customExact.size === 0) return null;
    var h = hostFull.toLowerCase().replace(/\.$/, '');
    if (customExact.has(h)) return customExact.get(h);
    var s = normHost(h);
    if (customExact.has(s)) return customExact.get(s);
    var parts = s.split('.');
    for (var i = 1; i < parts.length - 1; i++) {
      var suffix = parts.slice(i).join('.');
      if (customExact.has(suffix)) return customExact.get(suffix);
    }
    return null;
  }

  function pathTextOf(bm) {
    var p = bm ? bm.path : undefined;
    if (p == null) return '';
    if (Array.isArray(p)) return p.join('/').toLowerCase();
    return String(p).toLowerCase();
  }

  function classify(bookmark, options) {
    var opts = options || {};
    var minScore = opts.minScore != null ? Number(opts.minScore) : MIN_SCORE;
    var bm = bookmark || {};
    var rawTitle = bm.title == null ? '' : String(bm.title);
    var title = rawTitle.length > 500 ? rawTitle.slice(0, 500) : rawTitle;
    var rawUrl = bm.url == null ? '' : String(bm.url);
    var titleLower = title.toLowerCase();
    var urlLower = rawUrl.length > 2000 ? rawUrl.slice(0, 2000).toLowerCase() : rawUrl.toLowerCase();
    var reasons = [];
    var scores = Object.create(null);

    function add(cat, w, reason, cap) {
      var cur = scores[cat] || 0;
      scores[cat] = cur + w;
      if (reason) reasons.push(reason);
    }

    var parsed = rawUrl ? safeUrl(rawUrl.trim()) : null;
    var hostFull = '';
    var pathname = '';
    if (parsed) {
      hostFull = (parsed.hostname || '').toLowerCase().replace(/\.$/, '');
      try { pathname = (parsed.pathname || '').toLowerCase(); } catch (e) { pathname = ''; }
    } else if (rawUrl) {
      var m = rawUrl.toLowerCase().match(/^[a-z0-9+.-]+:\/\/([^/問?#:]+)/);
      if (m) hostFull = m[1].replace(/\.$/, '');
    }
    var folderText = pathTextOf(bm);
    var hostNoWww = hostFull ? normHost(hostFull) : '';

    // 0. custom rules take precedence
    var customCat = lookupCustom(hostFull || hostNoWww);
    if (customCat && byId[customCat]) {
      return { category: customCat, confidence: 0.97, reasons: ['custom host rule: ' + hostFull + ' -> ' + customCat + ' (+12)'] };
    }

    var hostCat = lookupBuiltinHost(hostFull);
    if (hostCat) {
      add(hostCat, W_HOST, 'host match: ' + hostFull + ' -> ' + hostCat + ' (+' + W_HOST + ')');
    } else if (hostFull) {
      var base = getBaseDomain(rawUrl);
      if (base) {
        var bn = normHost(base);
        if (bn && baseMap.has(bn)) {
          var bc = baseMap.get(bn);
          add(bc, W_BASE, 'domain match: ' + bn + ' -> ' + bc + ' (+' + W_BASE + ')');
        }
      }
    }

    // path hints (URL pathname + folder path)
    var hay = pathname + ' ' + folderText;
    if (hay.trim()) {
      var pathAdd = Object.create(null);
      for (var i = 0; i < pathHintList.length; i++) {
        var e = pathHintList[i];
        if (hay.indexOf(e.hint) >= 0) {
          pathAdd[e.cat] = (pathAdd[e.cat] || 0) + W_PATH;
        }
      }
      for (var k in pathAdd) {
        var v = Math.min(pathAdd[k], 6);
        add(k, v, 'path hint -> ' + k + ' (+' + v + ')');
      }
    }

    // title keywords via tokens
    var tokens = title ? tokenizeTitle(title) : [];
    if (tokens && tokens.length) {
      var tAdd = Object.create(null);
      var seen = Object.create(null);
      for (var t = 0; t < tokens.length; t++) {
        var tok = tokens[t];
        if (seen[tok]) continue;
        seen[tok] = 1;
        var cats = titleKwMap.get(tok);
        if (cats) for (var c = 0; c < cats.length; c++) tAdd[cats[c]] = (tAdd[cats[c]] || 0) + W_TITLE;
        var uc = urlKwMap.get(tok);
        // title token equal to a generic url keyword: count only half? keep as title weight capped below
      }
      for (var k2 in tAdd) add(k2, Math.min(tAdd[k2], 6), 'title keyword -> ' + k2 + ' (+' + Math.min(tAdd[k2], 6) + ')');
    }
    // phrase title keywords (multi-word / long CJK)
    if (titleLower) {
      var pAdd = Object.create(null);
      for (var pi = 0; pi < phraseList.length; pi++) {
        var pe = phraseList[pi];
        if (titleLower.indexOf(pe.phrase) >= 0) pAdd[pe.cat] = (pAdd[pe.cat] || 0) + W_TITLE;
      }
      for (var k3 in pAdd) {
        if (scores[k3] != null && scores[k3] >= W_HOST) continue; // don't inflate host winner with phrases
        add(k3, Math.min(pAdd[k3], 4), 'title phrase "' + k3 + '" (+' + Math.min(pAdd[k3], 4) + ')');
      }
    }

    // url keywords via url tokens
    if (urlLower) {
      var utoks = tokenizeTitle(urlLower.slice(0, 1500));
      var uAdd = Object.create(null);
      var useen = Object.create(null);
      for (var ui = 0; ui < utoks.length; ui++) {
        var ut = utoks[ui];
        if (useen[ut]) continue;
        useen[ut] = 1;
        var ucs = urlKwMap.get(ut);
        if (ucs) for (var uc2 = 0; uc2 < ucs.length; uc2++) uAdd[ucs[uc2]] = (uAdd[ucs[uc2]] || 0) + W_URL;
      }
      for (var k4 in uAdd) {
        var uv = Math.min(uAdd[k4], 3);
        // Generic keywords must NOT override a decisive host match:
        if (hostCat && k4 !== hostCat && scores[hostCat] >= W_HOST && (scores[k4] || 0) + uv <= scores[hostCat]) {
          add(k4, uv, 'url keyword -> ' + k4 + ' (+' + uv + ')');
        } else if (!hostCat) {
          add(k4, uv, 'url keyword -> ' + k4 + ' (+' + uv + ')');
        } else if (k4 === hostCat) {
          add(k4, Math.min(uv, 2), 'url keyword -> ' + k4 + ' (+' + Math.min(uv, 2) + ')');
        }
        // else: competing generic keyword vs decisive host -> still record but it cannot win (host=10 > caps)
      }
    }

    var best = 'other';
    var bestScore = scores['other'] || 0;
    var bestOrder = ORDER['other'];
    for (var catId in scores) {
      if (catId === 'other') continue;
      var s = scores[catId];
      var o = ORDER[catId] != null ? ORDER[catId] : 99;
      if (s > bestScore || (s === bestScore && best === 'other' && s > 0)) {
        best = catId; bestScore = s; bestOrder = o;
      } else if (s === bestScore && o < bestOrder) {
        best = catId; bestOrder = o;
      }
    }

    if (!(bestScore >= minScore) || best === 'other') {
      return { category: 'other', confidence: bestScore > 0 ? 0.25 : 0.15, reasons: reasons.length ? reasons : ['no signal; default other'] };
    }
    var conf = Math.min(0.97, 0.45 + bestScore * 0.05);
    return { category: best, confidence: Math.round(conf * 100) / 100, reasons: reasons };
  }

  function classifyAll(bookmarks, options) {
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var groupsMap = Object.create(null);
    var byCategory = {};
    var warnings = [];
    var confSum = 0;
    var unknown = 0;
    for (var i = 0; i < list.length; i++) {
      var bm = list[i] || {};
      if (!bm.url || typeof bm.url !== 'string' || !bm.url.trim()) {
        warnings.push({ index: i, id: bm.id, reason: 'missing url' });
      } else if (!safeUrl(bm.url.trim())) {
        warnings.push({ index: i, id: bm.id, reason: 'malformed url' });
      }
      var r = classify(bm, options);
      confSum += r.confidence;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      if (r.category === 'other' || r.category === 'unknown') unknown++;
      if (!groupsMap[r.category]) groupsMap[r.category] = [];
      groupsMap[r.category].push(bm);
    }
    var groups = [];
    for (var gi = 0; gi < CATEGORIES.length; gi++) {
      var cat = CATEGORIES[gi];
      var items = groupsMap[cat.id];
      if (items && items.length) {
        groups.push({ category: cat.id, label: cat.label, labelZh: cat.labelZh || cat.label, icon: cat.icon, items: items });
      }
    }
    return {
      groups: groups,
      stats: {
        total: list.length,
        byCategory: byCategory,
        unknown: unknown,
        avgConfidence: list.length ? Math.round((confSum / list.length) * 1000) / 1000 : 0
      },
      warnings: warnings
    };
  }

  function hostKeyOf(bm) {
    var u = bm && bm.url != null ? String(bm.url) : '';
    if (!u) return '';
    var b = getBaseDomain(u);
    if (b) return normHost(b);
    var h = getHostname(u);
    return h ? normHost(h) : '';
  }

  function suggestRules(bookmarks, options) {
    var opts = options || {};
    var minCount = opts.minCount != null ? Number(opts.minCount) : 3;
    var minRatio = opts.minRatio != null ? Number(opts.minRatio) : 0.6;
    var list = Array.isArray(bookmarks) ? bookmarks : [];
    var counts = Object.create(null);
    var catVotes = Object.create(null);
    var confSums = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var hk = hostKeyOf(list[i]);
      if (!hk) continue;
      counts[hk] = (counts[hk] || 0) + 1;
      var r = classify(list[i], opts);
      if (!catVotes[hk]) catVotes[hk] = Object.create(null);
      catVotes[hk][r.category] = (catVotes[hk][r.category] || 0) + 1;
      if (!confSums[hk]) confSums[hk] = Object.create(null);
      confSums[hk][r.category] = (confSums[hk][r.category] || 0) + r.confidence;
    }
    var out = [];
    for (var hk2 in counts) {
      if (counts[hk2] < minCount) continue;
      var votes = catVotes[hk2];
      var top = null, topN = 0;
      for (var c in votes) { if (votes[c] > topN) { topN = votes[c]; top = c; } }
      if (!top || top === 'other') continue;
      var ratio = topN / counts[hk2];
      if (ratio < minRatio) continue;
      out.push({ host: hk2, category: top, count: counts[hk2], ratio: Math.round(ratio * 100) / 100, confidence: Math.round((confSums[hk2][top] / topN) * 100) / 100 });
    }
    out.sort(function (a, b) { return b.count - a.count; });
    return out;
  }

  function mergeCustomRules(rules) {
    var entries = [];
    if (!rules) entries = [];
    else if (Array.isArray(rules)) entries = rules;
    else if (typeof rules === 'object') entries = Object.keys(rules).map(function (k) { return { host: k, category: rules[k] }; });
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i] || {};
      var h = normHost(String(e.host || ''));
      var c = String(e.category || '').toLowerCase();
      if (!h || !byId[c] || c === 'other') continue;
      customExact.set(h, c);
    }
    var snapshot = {};
    customExact.forEach(function (v, k) { snapshot[k] = v; });
    return snapshot;
  }

  return {
    CATEGORIES: CATEGORIES,
    classify: classify,
    classifyAll: classifyAll,
    suggestRules: suggestRules,
    mergeCustomRules: mergeCustomRules
  };
});
