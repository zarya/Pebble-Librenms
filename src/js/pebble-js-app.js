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


function getAlertRules() {
  // Construct URL
  var url = baseurl + "/api/v0/alerts";

  // Send request to OpenWeatherMap
  xhrRequest(url, 'GET', apikey,
    function(responseText) {
      var json = JSON.parse(responseText);
      var body = "";
      
      for (var i in json.alerts) {
        body = body + json.alerts[i].hostname + "\n";
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

// Listen for when the watchface is opened
Pebble.addEventListener('ready', 
  function(e) {
    console.log("PebbleKit JS ready!");

    // Get the initial weather
    getAlertRules();
  }
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log("AppMessage received!");
    getAlertRules();
  }                     
);
