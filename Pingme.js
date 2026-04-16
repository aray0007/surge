const KEY = "pingme_test_capture";

function notify(title, subtitle, body) {
  $notification.post(title, subtitle, body);
}

function done(v = {}) {
  $done(v);
}

if (typeof $request !== "undefined") {
  const url = $request.url || "";
  const headers = $request.headers || {};

  $persistentStore.write(JSON.stringify({
    url,
    headers
  }), KEY);

  notify("PingMe 抓包命中", "说明 http-request 已触发", url);
  done({});
} else {
  const data = $persistentStore.read(KEY);
  notify("PingMe 测试", data ? "已抓到请求" : "还没抓到请求", data || "无数据");
  done({});
}