// PingMe for Surge - Multi Account
// 用法：
// 1. 安装模块，开启 MITM
// 2. 每登录/切换一个账号，打开一次 PingMe 触发 queryBalanceAndBonus
// 3. 脚本会自动保存多个账号
// 4. cron 运行时会依次执行所有账号

const scriptName = "PingMe";
const storeKey = "pingme_multi_accounts_v1";

const SECRET = "0fOiukQq7jXZV2GRi9LGlO";
const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;

function notify(subtitle, body) {
  $notification.post(scriptName, subtitle, body);
}

function done(value = {}) {
  $done(value);
}

function log(msg) {
  console.log(`[${scriptName}] ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(options) {
  return new Promise((resolve, reject) => {
    $httpClient.get(options, (error, response, data) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          status: response ? response.status : 0,
          headers: response ? response.headers : {},
          body: data || ""
        });
      }
    });
  });
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function safeDecode(v) {
  try {
    return decodeURIComponent(v);
  } catch (e) {
    return v;
  }
}

function parseRawQuery(url) {
  const query = (url.split("?")[1] || "").split("#")[0];
  const rawMap = {};
  query.split("&").forEach(pair => {
    if (!pair) return;
    const idx = pair.indexOf("=");
    if (idx < 0) return;
    const k = pair.slice(0, idx);
    const v = pair.slice(idx + 1);
    rawMap[k] = v;
  });
  return rawMap;
}

function cloneHeaders(headers) {
  const out = {};
  Object.keys(headers || {}).forEach(k => {
    out[k] = headers[k];
  });
  return out;
}

function getUTCSignDate() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}

function getAccountId(capture) {
  const p = capture.paramsRaw || {};
  const email = safeDecode(p.email || "").trim().toLowerCase();
  const callpin = safeDecode(p.callpin || "").trim();
  const phone = safeDecode(p.phone || "").trim();
  return email || callpin || phone || `acc_${Date.now()}`;
}

function getAccountName(capture) {
  const p = capture.paramsRaw || {};
  return (
    safeDecode(p.email || "").trim() ||
    safeDecode(p.phone || "").trim() ||
    safeDecode(p.callpin || "").trim() ||
    "未知账号"
  );
}

function readAccounts() {
  const raw = $persistentStore.read(storeKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeAccounts(accounts) {
  return $persistentStore.write(JSON.stringify(accounts), storeKey);
}

function upsertAccount(capture) {
  const accounts = readAccounts();
  const accountId = getAccountId(capture);
  const accountName = getAccountName(capture);

  const item = {
    id: accountId,
    name: accountName,
    capture,
    updatedAt: new Date().toISOString()
  };

  const index = accounts.findIndex(x => x.id === accountId);
  if (index >= 0) {
    accounts[index] = item;
  } else {
    accounts.push(item);
  }

  const ok = writeAccounts(accounts);
  return {
    ok,
    count: accounts.length,
    isUpdate: index >= 0,
    name: accountName
  };
}

function MD5(string) {
  function RotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function AddUnsigned(lX, lY) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xC0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | (~z)); }
  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function ConvertToWordArray(str) {
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1).fill(0);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] |= str.charCodeAt(lByteCount) << lBytePosition;
      lByteCount++;
    }
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] |= 0x80 << lBytePosition;
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function WordToHex(lValue) {
    let WordToHexValue = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      const temp = "0" + lByte.toString(16);
      WordToHexValue += temp.substr(temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  const x = ConvertToWordArray(string);
  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;

    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);

    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }

  return (WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d)).toLowerCase();
}

function buildSignedParamsRaw(capture) {
  const params = {};
  Object.keys(capture.paramsRaw || {}).forEach(k => {
    if (k !== "sign" && k !== "signDate") {
      params[k] = safeDecode(capture.paramsRaw[k]);
    }
  });

  params.signDate = getUTCSignDate();

  const signBase = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("&");

  params.sign = MD5(signBase + SECRET);
  return params;
}

function buildUrl(path, capture) {
  const params = buildSignedParamsRaw(capture);
  const qs = Object.keys(params)
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join("&");
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

function buildHeaders(capture) {
  const headers = cloneHeaders(capture.headers || {});
  delete headers["Content-Length"];
  delete headers["content-length"];
  delete headers[":authority"];
  delete headers[":method"];
  delete headers[":path"];
  delete headers[":scheme"];
  headers["Host"] = "api.pingmeapp.net";
  headers["Accept"] = headers["Accept"] || "application/json";
  return headers;
}

async function fetchApi(path, capture, headers) {
  const url = buildUrl(path, capture);
  log(`Request => ${url.split("?")[0]}`);
  return await httpGet({
    url,
    headers,
    timeout: 15
  });
}

async function runOneAccount(item, index) {
  const capture = item.capture;
  const headers = buildHeaders(capture);
  const name = item.name || `账号${index + 1}`;
  const msgs = [];

  msgs.push(`== 账号 ${index + 1} ==`);
  msgs.push(`👤 ${name}`);

  try {
    try {
      const res = await fetchApi("queryBalanceAndBonus", capture, headers);
      const d = safeJsonParse(res.body);
      if (d && d.retcode === 0) {
        msgs.push(`💰 余额：${d.result.balance} Coins`);
      } else {
        msgs.push(`⚠️ 查询：${d ? d.retmsg : "返回解析失败"}`);
      }
    } catch (e) {
      msgs.push(`❌ 查询失败：${String(e)}`);
    }

    try {
      const res = await fetchApi("checkIn", capture, headers);
      const d = safeJsonParse(res.body);
      if (d && d.retcode === 0) {
        msgs.push(`✅ 签到：${(d.result?.bonusHint || d.retmsg || "成功").replace(/\n/g, " ")}`);
      } else {
        msgs.push(`⚠️ 签到：${d ? d.retmsg : "返回解析失败"}`);
      }
    } catch (e) {
      msgs.push(`❌ 签到失败：${String(e)}`);
    }

    for (let i = 1; i <= MAX_VIDEO; i++) {
      await sleep(i === 1 ? 1500 : VIDEO_DELAY);
      try {
        const res = await fetchApi("videoBonus", capture, headers);
        const d = safeJsonParse(res.body);
        if (d && d.retcode === 0) {
          msgs.push(`🎬 视频${i}：+${d.result?.bonus || "?"} Coins`);
        } else {
          const tip = d ? d.retmsg : "返回解析失败";
          msgs.push(`⏸ 视频${i}：${tip}`);
          if (/验证码|captcha|verify/i.test(tip)) {
            msgs.push(`🛑 需要人工验证，停止该账号视频任务`);
          }
          break;
        }
      } catch (e) {
        msgs.push(`❌ 视频${i}失败：${String(e)}`);
        break;
      }
    }

    try {
      const res = await fetchApi("queryBalanceAndBonus", capture, headers);
      const d = safeJsonParse(res.body);
      if (d && d.retcode === 0) {
        msgs.push(`💰 最新余额：${d.result.balance} Coins`);
      }
    } catch (e) {}

    return `[PingMe] 账号 ${index + 1} 执行完毕：\n${msgs.join("\n")}`;
  } catch (e) {
    msgs.push(`❌ 账号异常：${String(e)}`);
    return `[PingMe] 账号 ${index + 1} 执行异常：\n${msgs.join("\n")}`;
  }
}

async function runTask() {
  const accounts = readAccounts();
  if (!accounts.length) {
    notify("⚠️ 未抓到账号参数", "先切换账号并打开 PingMe 触发一次 queryBalanceAndBonus");
    return;
  }

  const blocks = [];
  for (let i = 0; i < accounts.length; i++) {
    const text = await runOneAccount(accounts[i], i);
    blocks.push(text);
  }

  const finalText = blocks.join("\n\n");
  notify(`全部任务完成（共 ${accounts.length} 个账号）`, finalText);
}

function captureRequest() {
  const capture = {
    url: $request.url,
    paramsRaw: parseRawQuery($request.url),
    headers: cloneHeaders($request.headers || {})
  };

  const result = upsertAccount(capture);

  if (result.ok) {
    notify(
      result.isUpdate ? "✅ 账号参数已更新" : "✅ 新账号参数已保存",
      `${result.name}\n当前共 ${result.count} 个账号`
    );
    log(`capture saved: ${result.name}, total=${result.count}`);
  } else {
    notify("❌ 参数保存失败", "请检查 Surge 持久化存储");
  }
}

(async () => {
  try {
    if (typeof $request !== "undefined") {
      captureRequest();
      done({});
      return;
    }

    await runTask();
    done({});
  } catch (e) {
    notify("❌ 脚本异常", String(e));
    done({});
  }
})();