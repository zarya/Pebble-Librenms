var xhrRequest = function (url, type, apikey, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.setRequestHeader('X-Auth-Token', apikey);
  xhr.send();
};

var baseurl = "http://10.38.21.4";
var apikey = "61fa4bf369a61e3f9ed8c9f369ffb7b0";
var rules = {};

function findRules(id)
{ 
  if (typeof rules ==='object') 
  {  
    console.log("Rules: " + JSON.stringify(rules));
    for (var i in rules.rules) {
      if (rules.rules[i].id == id) {
        return rules.rules[i].name;
      }
    }
    return "Err";
  }
  else
    return "Err2";
}

function getAlerts() {
  var url = baseurl + "/api/v0/alerts";
  xhrRequest(url, 'GET', apikey,
    function(responseText) {
      var json = JSON.parse(responseText);
      var body = "";
      
      for (var i in json.alerts) {
        body = body + findRules(json.alerts[i].rule_id) + ": " + json.alerts[i].hostname + "\n";
      }
      
      
      // Assemble dictionary using our keys
      var dictionary = {
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
    var url = baseurl + "/api/v0/rules";
    xhrRequest(url, 'GET', apikey,
      function(responseText) {
        rules = JSON.parse(responseText);
      }
    );
    console.log("Fetched rules: " + JSON.stringify(rules));
    // Get the initial weather
    getAlerts();
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log("AppMessage received!");
    getAlerts();
  }                     
);
