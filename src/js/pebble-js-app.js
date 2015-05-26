Pebble.addEventListener("ready",function(e) {                     
  Pebble.timelineSubscribe('jsconf2015-schedule',function () { 
    console.log('Subscribed to jsconf2015-schedule');
  }, function (errorString) { 
    console.log('Error subscribing to topic: ' + errorString);
  });
});
