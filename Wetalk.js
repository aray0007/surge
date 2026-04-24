// ===== WeTalk Surge Script 修复版 =====

const scriptName = "WeTalk";
const storeKey = "wetalk_account";

function notify(title, msg){
  $notification.post(scriptName, title, msg);
}

// ===== 存储 =====
function getData(){
  let raw = $persistentStore.read(storeKey);
  return raw ? JSON.parse(raw) : {};
}

function setData(obj){
  $persistentStore.write(JSON.stringify(obj), storeKey);
}

// ===== 抓包 =====
function capture(){
  let data = getData();

  data.url = $request.url;
  data.headers = $request.headers;

  setData(data);

  notify("✅ 抓包成功", "账号已保存");
  $done({});
}

// ===== 请求封装 =====
function get(url, headers, cb){
  $httpClient.get({url, headers}, function(err, resp, body){
    if(err){
      cb(err);
    }else{
      try{
        cb(null, JSON.parse(body));
      }catch(e){
        cb("解析失败");
      }
    }
  });
}

// ===== 主任务 =====
function run(){

  let data = getData();

  if(!data.url){
    notify("⚠️ 未抓到账号", "请先打开App");
    $done();
    return;
  }

  let headers = data.headers;

  function api(path, cb){
    let url = data.url.replace("queryBalanceAndBonus", path);
    get(url, headers, cb);
  }

  let log = [];

  // 查询余额
  api("queryBalanceAndBonus", function(e, d){

    if(!e && d.retcode===0){
      log.push("💰余额："+d.result.balance);
    }

    // 签到
    api("checkIn", function(e2, d2){

      if(!e2 && d2.retcode===0){
        log.push("✅签到成功");
      }else{
        log.push("⚠️签到失败");
      }

      // 视频循环
      let i = 0;

      function video(){

        if(i >= 5){
          finish();
          return;
        }

        i++;

        api("videoBonus", function(e3, d3){

          if(!e3 && d3.retcode===0){
            log.push(`🎬视频${i} +${d3.result?.bonus || ""}`);
          }else{
            log.push(`❌视频${i}失败`);
          }

          setTimeout(video, 8000);
        });
      }

      video();
    });

  });

  function finish(){

    api("queryBalanceAndBonus", function(e4, d4){

      if(!e4 && d4.retcode===0){
        log.push("💰最新："+d4.result.balance);
      }

      notify("🎉完成", log.join("\n"));
      $done();
    });
  }
}

// ===== 入口 =====
if(typeof $request !== "undefined"){
  capture();
}else{
  run();
}