/**
* datetime-js v4.0.0
* A lightweight javascript date object to custom string presentation converter.
* (c) 2019 Helcon Mabesa
* ISC
**/
var DateTime = (function(){

    var App = function(date, formatStr) {

        var obj = {
            // date
            month: date.getUTCMonth(),
            day: date.getDay(),
            year: date.getFullYear(),
            "date": date.getDate(),
            // time
            hour: date.getHours(),
            minutes: date.getMinutes(),
            seconds: date.getSeconds(),
            ampm: (date.getHours()<12) ? "am" : "pm",

            fullStr: date.toString()
        };

        var replace = [

            ["%m", (obj.month < 9) ? ("0" + (obj.month + 1)) : (obj.month + 1)],
            ["%M:s", getUTCMonthString(obj.month,"short")],
            ["%M", getUTCMonthString(obj.month)],

            ["%d:o", ordinalSuffix(obj.date)],
            ["%d", (obj.date<10) ? ("0" + toStr(obj.date)) : toStr(obj.date)],
            ["%D:s", getDayString(obj.day,"short")],
            ["%D", getDayString(obj.day)],

            ["%Y:r", romanNumerals(obj.year)],
            ["%Y", obj.year],
            ["%y", toStr(obj.year).substr(2)],

            ["%h", prefixZero(
                (function(){
                    var val = (obj.hour>12) ? (obj.hour-12) : obj.hour;
                    val = (val === 0) ? 12 : val;
                    return val;
                }())
            )],

            ["%H", prefixZero(obj.hour)],
            ["%i", prefixZero(obj.minutes)],
            ["%s", prefixZero(obj.seconds)],

            ["%ampm", obj.ampm],
            ["%AMPM", (obj.ampm).toUpperCase()],
            ["%AmPm", ((obj.ampm).charAt(0)).toUpperCase() + (obj.ampm).charAt(1)]

        ];

        if (typeof formatStr !== "string" || !formatStr) {

            formatStr = obj.fullStr;

        } else {

            for (var i = 0; i < replace.length; i++) {
                var item = replace[i],
                    fmt = item[0],
                    val = item[1],
                    re = new RegExp(fmt, 'g');

                formatStr = formatStr.replace(re, val);
            }

        }

        return formatStr;

    };

    var ordinalSuffix = function(n) {
        n = (n || "").toString();
        if (n.length < 1) { return n; }

        var s = "",
            num = parseInt(n, 10),
            tens = (num > 99) ? parseInt(n.slice(n.length-2), 10) : (num < 20) ? num : false;

        if (tens >= 11 && tens < 20) {
            s = "th";
        } else {
            var lastDigit = parseInt(n.charAt(n.length-1), 10);

            switch (lastDigit) {
                case 1: s = "st";break;
                case 2: s = "nd";break;
                case 3: s = "rd";break;
                default: s = "th";break;
            }

        }

        return (n + s);
    };

    var romanNumerals = function(n) {

        n = parseInt(n, 10);

        var numerals = [
            ["M", 1000],
            ["CM", 900],
            ["D", 500],
            ["CD", 400],
            ["C", 100],
            ["XC", 90],
            ["L", 50],
            ["XL", 40],
            ["X", 10],
            ["IX", 9],
            ["V", 5],
            ["IV", 4],
            ["I", 1]
        ];

        var i, arr = [];
        for (i = 0; i < numerals.length; i++) {
            var item = numerals[i],
                rn = item[0],
                val = item[1];

            while (n >= val) {
                arr.push(rn);
                n = n - val;
            }

        }

        return arr.join("");
    };

    // Return week days string
    var getDayString = function(n, type) {
        var day = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
            ret = day[n];

        if (type==="short") {
            ret = ret.slice(0,3);
        }

        return ret;
    };

    // Return month string
    var getUTCMonthString = function(n, type) {
        var month = ["January","February","March","April","May","June","July","August","September","October","November","December"],
            ret = month[n] || "";

        if (type === "short") {
            ret = ret.slice(0,3);
        }

        return ret;
    };

    // prefix 0
    var prefixZero = function(val) {
        return (val < 10) ? ("0" + toStr(val)) : val;
    };

    // to string
    var toStr = function(val) {
        val = (!isNaN(val)) ? val : "";
        return val.toString();
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = App;
    }

    return App;

}());
