/*jshint multistr: true */
var ConfigPage = '\
<!DOCTYPE html> \
<html> \
  <head>\
    <meta name="viewport" content="width=device-width, initial-scale=1">\
    <style>\
      body { background-color: black; text-align: center; color: white }\
      h1 { margin: 0 }\
      small { color: gray }\
      a { color: white }\
      input { height: 1.5em; font-size: 1.2em; font-weight: bold }\
      .text { width: 93%; margin: 0.5em; text-align: center }\
      .submit { width: 93%; margin: 0.4em }\
      .param { display: inline-table; width: 95%; height: 3em }\
      .label,.checkbox { display: table-cell; vertical-align: middle }\
      .label { text-align: left }\
      .checkbox { text-align: right; width: 1.5em; height: 1.5em }\
      .example { width: 75%; display: inline-block; text-align: left; font-size: 0.6em }\
    </style>\
    <script>\
      var config = _CONFIG_;\
      function put_config() {\
        for (var param in config) {\
          var element = document.getElementById(param);\
          if (element) {\
            if (typeof config[param] === "boolean") {\
              element.checked = config[param];\
            } else {\
              element.value = config[param];\
            }\
          }\
        }\
      }\
      function get_config() {\
        var form = document.getElementById("config_form");\
        for (config = {}, i = 0; i < form.length ; i++) {\
          id = form[i].id;\
          if (id != "save") {\
            if (form[i].type === "checkbox") {\
              config[id] = form[i].checked;\
            } else {\
              config[id] = form[i].value;\
            }\
          }\
        }\
        return window.location.href = "pebblejs://close#" + encodeURIComponent(JSON.stringify(config));\
      }\
      function toggle_visibility(id) {\
        var e = document.getElementById(id);\
        if(e.style.display == "block")\
          e.style.display = "none";\
        else\
          e.style.display = "block";\
      }\
    </script>\
  </head>\
  <body onload="put_config();">\
    <h1>LibreNMS</h1>\
    <small>v1.1, by zarya</small>\
    <hr size="1" />\
    <form action="javascript: get_config();" id="config_form">\
      Server URL\
      <input type="text" id="URL" class="text" value="" placeholder="your URL here">\
      <hr size="1" />\
      <span>Server auth</span>\
      <div id="auth">\
      API Key\
      <input type="password" id="Key" class="text" value="">\
      </div>\
      <input type="submit" id="save" class="submit" value="save and apply">\
    </form>\
  </body>\
</html><!--.html';

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
    //Pebble.openURL("http://pebble-config.herokuapp.com/config?title=LibreNMS&fields=text_URL,password_Key");
    config = JSON.parse(window.localStorage.getItem('pebble-libre-config'));
    Pebble.openURL('data:text/html,'+encodeURI(ConfigPage.replace('_CONFIG_', JSON.stringify(config), 'g')));
    console.log(ConfigPage.replace('_CONFIG_', JSON.stringify(config), 'g'));
  }
);

Pebble.addEventListener("webviewclosed",
  function(e) {
    window.localStorage.setItem('pebble-libre-config', e.response);
    config = JSON.parse(e.response);
    getAlerts();
  }
);


