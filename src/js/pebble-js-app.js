var MSG = {
  PERIODIC_UPDATE: 0,
  CONFIG: 1
};

// default settings
var config = {
  "URL": "",
  "Key": ""
};
var rules = {};

//Ajax request function
var xhrRequest = function (url, type, apikey, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.setRequestHeader('X-Auth-Token', config.Key);
  xhr.send();
};

//Find rule by id
function findRules(id)
{ 
  if (typeof rules ==='object') 
  {  
    for (var i in rules.rules) {
      if (rules.rules[i].id == id) {
        return rules.rules[i].name;
      }
    }
    return "Err";
  }
}

function getAlerts() {
  var url = config.URL + "/api/v0/alerts";
  xhrRequest(url, 'GET', config.KEY,
    function(responseText) {
      var json = JSON.parse(responseText);
      var body = "";
      
      for (var i in json.alerts) {
        body = body + findRules(json.alerts[i].rule_id) + "\n  " + json.alerts[i].hostname + "\n";
      }
      
      var dictionary = {
        "KEY_TYPE": MSG.PERIODIC_UPDATE,
        "KEY_ALERTCOUNT": json.count,
        "KEY_ALERTS": body
      };
            
      // Send to Pebble
      Pebble.sendAppMessage(dictionary,
        function(e) {
          console.log("Info sent to Pebble successfully!");
        },
        function(e) {
          console.log("Error sending info to Pebble!");
        }
      );
    }      
  );
}

Pebble.addEventListener('ready', 
  function(e) {
    console.log("PebbleKit JS ready!");
    config = JSON.parse(window.localStorage.getItem('pebble-libre-config'));
    console.log(JSON.stringify(config));
    var url = config.URL + "/api/v0/rules";
    xhrRequest(url, 'GET', config.Key,
      function(responseText) {
        rules = JSON.parse(responseText);
      }
    );
    getAlerts();
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log("AppMessage received!");
    config = JSON.parse(window.localStorage.getItem('pebble-libre-config'));
    console.log(JSON.stringify(config));
    var url = config.URL + "/api/v0/rules";
    xhrRequest(url, 'GET', config.Key,
      function(responseText) {
        rules = JSON.parse(responseText);
      }
    );
    getAlerts();
  }                     
);

Pebble.addEventListener("showConfiguration",
  function(e) {
    Pebble.openURL("http://pebble-config.herokuapp.com/config?title=LibreNMS&fields=text_URL,password_Key");
  }
);

Pebble.addEventListener("webviewclosed",
  function(e) {
    var configuration = JSON.parse(e.response);
    window.localStorage.setItem('pebble-libre-config', e.response);
  }
);
