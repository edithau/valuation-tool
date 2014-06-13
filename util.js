/* for IE before 9 */
if (!Array.prototype.indexOf)
  {

       Array.prototype.indexOf = function(searchElement /*, fromIndex */)

    {


    'use strict';

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0)
    {
      n = Number(arguments[1]);
      if (n !== n)
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

    var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);

    for (; k < len; k++)
    {
      if (k in t && t[k] === searchElement)
        return k;
    }
    return -1;
  };
}


Object.keys = Object.keys || (function() {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !{toString: null}.propertyIsEnumerable('toString'),
        DontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
        ],
        DontEnumsLength = DontEnums.length;

    return function(o) {
        if (typeof o != 'object' && typeof o != 'function' || o === null)
            throw new TypeError('Object.keys called on a non-object');

        var result = [];
        for (var name in o) {
            if (hasOwnProperty.call(o, name))
                result.push(name);
        }

        if (hasDontEnumBug) {
            for (var i = 0; i < DontEnumsLength; i++) {
                if (hasOwnProperty.call(o, DontEnums[i]))
                    result.push(DontEnums[i]);
            }
        }

        return result;
    };
})();


/* strip off unwanted chars from an input field */
function sanitize(str) {
    str = str.replace(/[<>:]/gi, '');
    var temp = document.createElement('div');
    temp.innerHTML = str;
    return temp.textContent || temp.innerText;
}


// XXX need to mergewith portData.js
function getPerfQuotesUrl(symbol) {
    var perfQuotesUrl = 'http://query.yahooapis.com/v1/public/yql?q=select%20col1%2C%20col2%2C%20col3%2C%20col4%2C%20col6%2C%20col13%2C%20col14%20from%20csv%20where%20url%20%3D%20' +
						'"http%3A%2F%2Ffinviz.com%2Fexport.ashx%3Fv%3D141%26t%3DSYMBOL"&format=json&callback=';
    perfQuotesUrl = perfQuotesUrl.replace(/SYMBOL/g, symbol);

    return perfQuotesUrl;
}

// XXX need to merge with fillQuotes portData.js
function parsePerfQuotes(symbol, data) {
    var retVal = [];
	if (data.query.results != null) {
		for (var i = 1; i < data.query.results.row.length; i++) {
			row = data.query.results.row[i];
/*			row.col2 = row.col2.replace(/%/,'');
			row.col3 = row.col3.replace(/%/,'');
			row.col4 = row.col4.replace(/%/,'');
			row.col6 = row.col6.replace(/%/,'');
			row.col14 = row.col14.replace(/%/,''); */
			retVal[i - 1] = {symbol: row.col1, currentPrice: row.col13, change: row.col14, changeW: row.col2, changeM: row.col3, changeQ: row.col4, changeY: row.col6};
		}
	}

    return retVal;
}



// construct url to retrieve 20Y historic quotes from yahoo finance
function getHistQuotesUrl(dataDuration) {
	var date = new Date();
	var comparisonDataStartDate = new Date(date.getFullYear() - dataDuration, date.getMonth(), date.getDate());
	histQuotesUrl = 'http://query.yahooapis.com/v1/public/yql?q=select%20col0%2C%20col1%2C%20col6%20from%20csv%20where%20url%3D' +
		'"http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3DSYMBOL%26amp%3Ba%3D_MM%26amp%3Bb%3D_DD%26amp%3Bc%3D_YY%26amp%3Bg%3Dm"%20or%20url%3D' +
		'"http%3A%2F%2Fichart.finance.yahoo.com%2Ftable.csv%3Fs%3DSYMBOL%26amp%3Ba%3D_MM%26amp%3Bb%3D_DD%26amp%3Bc%3D_YY%26amp%3Bg%3Dv"&format=json&callback=';
	histQuotesUrl = histQuotesUrl.replace(/_DD/g, comparisonDataStartDate.getDate());
	histQuotesUrl = histQuotesUrl.replace(/_MM/g, comparisonDataStartDate.getMonth());
	histQuotesUrl = histQuotesUrl.replace(/_YY/g, comparisonDataStartDate.getFullYear());

	return histQuotesUrl;
}


/* parse Historic quotes from yahoo finance */
function parseHistQuotes(symbol, data) {  // historic monthly quotes
	if (data.query.results == null || data.query.results.row[0].col0 != 'Date') {
		return null;
	}

	var histQuotes = [], divQuotes = [];
	var startDivResults = false;
	// quotes from yahoo are desc order by date.  need to reverse the order for hichart to display
	var numRows = data.query.results.row.length;
	for (j = 1, k = 0, l = 0; j < numRows; j++) {
		var row = data.query.results.row[j];
		if (row.col0 == 'Date') {
			startDivResults = true;
			continue;
		}
		if (startDivResults) {
			//dividend quotes start
			divQuotes[k++] = [row.col0, Math.round(parseFloat(row.col1) * 100) / 100]; // [Date, div]
		} else {
			histQuotes[l++] = [row.col0.slice(0, row.col0.lastIndexOf('-') + 1) + '20', Math.round(parseFloat(row.col6) * 100) / 100]; //[Date, Adj. Close]
		}
	}

	return [histQuotes, divQuotes];
}


// xxx need to merge with portData.js
function formatDisplayNumber(numStr, addPercentSign) {

	if (!numStr) {
	  return '';
	}

	var color;
    var displayNum = numStr;

    if (displayNum.slice(-1) == '%') {
        displayNum = displayNum.slice(0, -1);
        addPercentSign = true;
    }

    if (displayNum > 0) {
        displayNum = '+' + displayNum;
        color = 'green';
    } else {
        color = 'red';
    }

    return '<div style="color:' + color + '">' + displayNum + (addPercentSign ? '%' : '') + '</div>';

}

// only compare month and year, skip date
function compareDateStrWithRange(quoteDateStr, dateStrStart, dateStrEnd) {
	var quoteDate = quoteDateStr.split('-');
	if (quoteDate[0] < dateStrStart[0] || (quoteDate[0] == dateStrStart[0] && quoteDate[1] < dateStrStart[1])) {
		return -1;
	}

	if (quoteDate[0] > dateStrEnd[0] || (quoteDate[0] == dateStrEnd[0] && quoteDate[1] > dateStrEnd[1])) {
		return 1;
	}

	return 0;
}

// only compare month and year, skip date
function compareDateStr(dateStr1, dateStr2) {
	var dateStr1Arr = dateStr1.split('-'); //yyyy-mm-dd
	var dateStr2Arr = dateStr2.split('-');

    if (dateStr1Arr[0] < dateStr2Arr[0] || (dateStr1Arr[0] == dateStr2Arr[0] && dateStr1Arr[1] < dateStr2Arr[1])) {
        return -1;  // dateStr1 is earlier than dateStr2
    }

    if (dateStr1Arr[0] == dateStr2Arr[0] && dateStr1Arr[1] == dateStr2Arr[1]) {
        return 0;   // same year, same month
    }

    return 1;       // dateStr1 is later than dateStr2
}


function recordSymbols(symbolStr) {
	var url = '../portfolio/symbolTracker.php?symbolStr=' + symbolStr;
		jQuery.getJSON(url, function(data) {
		// just a ping
	})
	.fail(function(jqxhr, textStatus, error) {
		if (DEBUG) {
			alert('Cannot record symbols ' + symbolStr);
		}
	});
}

function handleError(e) {
	var msg, level, symbol;
	
	if (!(e instanceof ErrorLog)) {
		msg = e.message;
		level = ERROR;
		symbol = "";
	} else {
		msg = e.msg;
		level = e.level;
		symbol = e.symbol;
	}
	
    var d = jQuery.Deferred();

	if (level == WARNING) {
		alert('Warning for ' + symbol + ': ' + msg);
        d.resolve();
	} else {
        alert('Error for  ' + symbol + ': ' + msg);
        d.reject();
	}

    return d.promise();
}




function ErrorLog(symbol, level, msg) {
    this.symbol = symbol;
	this.level = (level != WARNING && level != ERROR) ? ERROR : level;
	this.msg = msg;
}


