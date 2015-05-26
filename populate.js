var request = require("request");
var cheerio = require("cheerio")
var Timeline = require('pebble-api');
var timeline = new Timeline({ apiKey: process.env.API_KEY });

function getSchedule(cb){
  request("http://2015.jsconf.us/schedule.html", function(err,res,html) {
    if (err || res.statusCode != 200) cb(err);
    var $ = cheerio.load(html);
    var schedule = [];
    var currentDate;
    $('#schedule *').each(function(i,element){
      if ($(element).get(0).tagName == "h3") {
        currentDate = $(element).text().split('-')[0];
      }
      if ( $(element).is('h4') && ( 
             $(element).text().includes('AM')
             || $(element).text().includes('PM')
      )){
        var title = $(element).text().replace(/[0-9]{1,2}:.*/gi,'')
        var times = $(element).text().match(/[0-9]{1,2}:[0-9]{2}[AP]M/gi)
        if (times){
          var dateTime = currentDate + ' ' + times[0];
          if (!schedule.hasOwnProperty(dateTime)) schedule[dateTime] = [];
          var duration = times[1] ? getDurationMinutes(times[0],times[1]) : 0;
          schedule[dateTime].push({title:title,duration:duration});
        }
      }
      if ($(element).is('.schedule tr .time')) {
        var dateTime = currentDate + ' ' +$(element).text();
        if (!schedule.hasOwnProperty(dateTime)) schedule[dateTime] = [];
        $(element).nextAll().each(function(j,element){
          schedule[dateTime].push({title:$(element).text(),duration:duration});
        });
      }
    });
    cb(null,schedule);
  });
}

function getDurationMinutes(start,end){
  var timeRegex = /(\d{1,2}):(\d{2})([AP]M)/;
  var parsedStart = timeRegex.exec(start);
  var parsedEnd = timeRegex.exec(end);
  if (!parsedStart || !parsedEnd) return 0;
  var startDate = new Date(
      "1/1/2000 "+parsedStart[1]+":"+parsedStart[2]+" "+parsedStart[3]
  )
  var endDate = new Date(
      "1/1/2000 "+parsedEnd[1]+":"+parsedEnd[2]+" "+parsedEnd[3]
  )
  if (endDate.getHours() < startDate.getHours()) return 0;
  return ((endDate.getHours() * 60) + endDate.getMinutes()) -
         ((startDate.getHours() * 60) + startDate.getMinutes())
}

function parseEventDate(dateString){
  var dateRegex = /([a-zA-Z]+)\s+(\d{2})[th]{0,3},\s+(\d{4})\s+(\d{1,2}):(\d{2})([AP]M)/;
  var parsedDate = dateRegex.exec(dateString);
  if (!parsedDate) return new Error('Date cannot be parsed');
  var month = new Date(parsedDate[1] + "1, 2000").getMonth()
  var day = +parsedDate[2];
  var year = +parsedDate[3];
  var hour = +parsedDate[4];
  var minute = +parsedDate[5];
  if (parsedDate[6] == 'PM' && hour != 12) hour += 12;
  return new Date(year, month, day, hour, minute);
}

getSchedule(function(err,schedule){
  if (err) throw new Error(err);

  var n = 0;
  Object.keys(schedule).forEach(function(dateTime){
    schedule[dateTime].forEach(function(event){
      
      n++;

      var pin = new Timeline.Pin({
        id: 'jsconf2015-schedule' + n,
        time: parseEventDate(dateTime),
        duration: event.duration,
        layout: new Timeline.Pin.Layout({
          type: Timeline.Pin.LayoutType.GENERIC_PIN,
          tinyIcon: Timeline.Pin.Icon.NOTIFICATION_FLAG,
          title: event.title
        })
      });

      timeline.sendSharedPin(['jsconf2015-schedule'], pin, function (err) {
        if (err) { console.log(err); return }
        console.log('Successfully Added Pin ' + pin.id);
      });

    });
  });
});
