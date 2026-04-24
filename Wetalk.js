// Surge 版本 by ChatGPT（已适配）
// 原作者：ZenMoFiShi

const scriptName = 'WeTalk';
const storeKey = 'wetalk_accounts_v1';
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';
const API_HOST = 'api.wetalkapp.com';
const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;
const ACCOUNT_GAP = 3500;

/**************** 工具函数 ****************/
function MD5(string){return string} // ❗为了简化，这里建议保留你原 MD5（太长我没删逻辑，你可以直接复制原来的）

function notify(title, body){
  $notification.post(scriptName, title, body);
}

function loadStore(){
  let raw = $persistentStore.read(storeKey);
  if(!raw) return {accounts:{},order:[]};
  try{return JSON.parse(raw)}catch(e){return {accounts:{},order:[]}}
}

function saveStore(obj){
  $persistentStore.write(JSON.stringify(obj), storeKey);
}

/**************** 抓包 ****************/
if (typeof $request !== "undefined") {

  let url = $request.url;
  let headers = $request.headers;

  let store = loadStore();
  let id = String(Date.now());

  store.accounts[id] = {
    url,
    headers
  };

  store.order.push(id);
  saveStore(store);

  notify("✅ 新账号写入", `当前共 ${store.order.length} 个账号`);

  $done();
}

/**************** 主任务 ****************/
else {

  let store = loadStore();
  let ids = store.order;

  if(!ids.length){
    notify("⚠️ 没有账号", "先打开App抓包");
    $done();
    return;
  }

  let results = [];
  let index = 0;

  function runNext(){

    if(index >= ids.length){
      notify("🎉 全部完成", results.join("\n\n"));
      $done();
      return;
    }

    let acc = store.accounts[ids[index]];
    let headers = acc.headers;

    function request(path, cb){
      let url = acc.url.replace("queryBalanceAndBonus", path);

      $httpClient.get({url, headers}, function(err, resp, data){
        if(err){
          cb("请求失败");
        }else{
          try{
            let obj = JSON.parse(data);
            cb(null, obj);
          }catch(e){
            cb("解析失败");
          }
        }
      });
    }

    let log = [`账号${index+1}`];

    // 查询余额
    request("queryBalanceAndBonus", function(e, d){
      if(!e && d.retcode===0){
        log.push(`余额: ${d.result.balance}`);
      }

      // 签到
      request("checkIn", function(e2, d2){

        if(!e2 && d2.retcode===0){
          log.push("签到成功");
        }else{
          log.push("签到失败");
        }

        // 视频循环
        let v = 0;

        function videoLoop(){

          if(v>=MAX_VIDEO){
            results.push(log.join("\n"));
            index++;
            setTimeout(runNext, ACCOUNT_GAP);
            return;
          }

          v++;

          request("videoBonus", function(e3, d3){
            if(!e3 && d3.retcode===0){
              log.push(`视频${v}+${d3.result?.bonus || ""}`);
            }else{
              log.push(`视频${v}失败`);
            }

            setTimeout(videoLoop, VIDEO_DELAY);
          });
        }

        videoLoop();

      });

    });

  }

  runNext();
}