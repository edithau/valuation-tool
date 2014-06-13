var gParams;					// holds app configuration parameters
var gRawValData = [];			// holds raw valuation data from morning star.  data pieces are parsed and processed on demand
var gMetrics = [];				// holds processed and consolidated valuation metrics from multiple sources for a stock 
var gCurrency = [];				// holds currency exchange rate




/* application config parameters.  Only one instance per app*/
var ValuationParams = (function(p) {

	var params = {};

	if (p['sym1'] == null && p['sym2'] == null) {
			params = {'sym1' : DEFAULT_SYM1, 'sym2': DEFAULT_SYM2};
	} else if (p['sym1'] == null) {
			params = {'sym1': p['sym2'].slice(0, SYMBOL_MAX_LENGTH).toUpperCase(), 'sym2' : null};
	} else {
			params['sym1'] = p['sym1'].slice(0, SYMBOL_MAX_LENGTH).toUpperCase();
			params['sym2'] = (p['sym2'] == null) ? null : p['sym2'].slice(0, SYMBOL_MAX_LENGTH).toUpperCase();
	}

	var digits = (p['val_type_index'] == null) ? 0 : p['val_type_index'].match(/^([0-9]+)$/g)[0] * 1;
	params['val_type_index'] = isNaN(digits) ? 0 : digits % VAL_TYPES.length;

	digits = (p['metric_type_index'] == null) ? params['val_type_index'] : p['metric_type_index'].match(/^([0-9]+)$/g)[0] * 1;
	params['metric_type_index'] = isNaN(digits) ? params['val_type_index'] : digits % METRIC_TYPES.length;

	var defaultDuration = (screen.width <= 768) ? MOBILE_DEFAULT_DURATION : MAX_YEAR;
	digits = (p['duration'] == null) ? defaultDuration : p['duration'].match(/^([0-9]+)$/g)[0] * 1;
	params['duration'] = (isNaN(digits) || digits > MAX_YEAR) ? defaultDuration : digits;

	return {
		getParameter:    // getter
			function(key) {
				return params[key];
			},
		rotateMetricType:  // only one metric type per chart display.  This method cycle thru the available metrics for display
			function(direction) {
				params['metric_type_index'] = (params['metric_type_index'] + direction >= 0) ?
												(params['metric_type_index'] + direction) % METRIC_TYPES.length : METRIC_TYPES.length - 1;
			},
		rotateValType:    // only one valuation metric type per chart display.  This method cycle thru the available valuation metrics for display
			function(direction) {
				params['val_type_index'] = (params['val_type_index'] + direction >= 0) ?
							(params['val_type_index'] + direction) % VAL_TYPES.length : VAL_TYPES.length - 1;
				params['metric_type_index'] = params['val_type_index'];  // display matching metric type for the valuation type
			}
	};

});


/* valuation data from morning star and market watch.  One instance per stock  */
var ValuationData = (function(s, d) {
	var symbol = s;
	var rawData = d;
	
	// get the last full fiscal year report date */
	this.getLastReportedFiscalYear = function () {
		var dateStr = rawData[FISCAL_YEAR].col10.split('-');
		return {y: parseInt(dateStr[0]), m: parseInt(dateStr[1])};
	}

	// get the currency the data is reported in (for ADR stocks)
	this.getCurrency = function () {
		return rawData[REVENUE].col0.split(' ')[1];
	}

	// locate metric data from cache (gMetric[symbol]).  If it does not exist, process, and if necessary, calcuate derived metric data from raw data
	// hasCurrencyMetric:  metric data that provides its own currency unit (ie ADR).  
	this.getValuationMetric = function(metric, hasCurrencyMetric) {
		// if data has already been processed, get the cached version
		if (gMetrics[symbol] != null && gMetrics[symbol][metric] != null) {
			return gMetrics[symbol][metric];
		}

		var retVal = [];
		var row, rowTitle;
		
		try { 
			var rowNum = (typeof metric == 'number') ? metric : eval(metric);
			row = rawData[rowNum];
			rowTitle = row['col0'];
			if (row != null) {
				for (var i = 1, j = 0; i < MAX_YEAR + 2; i++) {
					var key = 'col' + i;
					retVal[j++] = (row[key] == null) ? null : row[key].split(',').join('') * 1;
				}
			}
		} catch (e) {
			// the requested metric is not presented in the raw downloaded data.  needs further calculations (ie. _BOOK_VALUE_PS_G data is not in the download)
		}
		this._processSpecialCases(symbol, metric, retVal);
		if (hasCurrencyMetric && rowTitle != undefined) {
			var words = rowTitle.split(' ');
			if (words[words.length - 1].length == 3) { // currency unit has 3 char
				var currency = (words[words.length - 1] == 'Mil') ? words[words.length - 2] : words[words.length - 1];
				gMetrics[symbol][metric + '_CURRENCY'] = currency;
			}
		}
		gMetrics[symbol][metric] = retVal;   // record the calculation result to the main data structure
		return retVal;
	}
});


/* private function to process raw data for getValuationMetric()*/
ValuationData.prototype._processSpecialCases = function (symbol, metric, dataRow) {
	switch (metric) {
		case 'EARNINGS_PS' :
			// remove TTM data and add current & next year estimates
			gMetrics[symbol]['FYE'].eps_q = [];
			mergeHistAndEstData(symbol, metric, dataRow, gMetrics[symbol]['EARNINGS_PS_EST']);
			break;

		case 'REVENUE' :
			// only earnings and revenue have estimates.
			gMetrics[symbol]['FYE'].rev_q = [];
			mergeHistAndEstData(symbol, metric, dataRow, gMetrics[symbol]['REVENUE_EST']);
			gMetrics[symbol]['REVENUE_EST_PS'] = perShareBasedCalculation(symbol, gMetrics[symbol]['REVENUE_EST'], false);
			gMetrics[symbol]['REVENUE_PS'] = perShareBasedCalculation(symbol, dataRow, true);			
			gMetrics[symbol]['FYE'].rps_q = getQtrlyRps(symbol, gMetrics[symbol]['FYE'].rev_q);			
			break;

		case 'FREE_CASH_FLOW_PS' :
			if (dataRow[dataRow.length - 1] == null) {
				// many FCF_PS TTM raw numbers are null in the raw data
				gMetrics[symbol]['FREE_CASH_FLOW'] = this.getValuationMetric('FREE_CASH_FLOW', true);
				dataRow.pop();
				var shares = gMetrics[symbol]['SHARES'];
				dataRow.push(Math.round(gMetrics[symbol]['FREE_CASH_FLOW'][MAX_YEAR] / shares[shares.length - 1] * 100) / 100);
			}
			break;

		case 'EARNINGS_PS_G' : // provided by raw data except the estimates.
			var earningsPs = gMetrics[symbol]['EARNINGS_PS'];
			if (earningsPs.length == dataRow.length) {
				break;  // no estimate.  row data is fine
			}

			for (var i = MAX_YEAR; i < earningsPs.length; i++) {
				dataRow[i] = (earningsPs[i - 1] > 0) ? Math.round((earningsPs[i] - earningsPs[i - 1]) / earningsPs[i - 1] * 10000) / 100 : null;
			}
			break;

		default: break;
	}
}

/* estimate earnings and sales data for next 2 fiscal years.
 * An instance of EstimateData will be purged once its data merge
 * with other data (ie, valuation, historic quotes..)
 */
var EstimateData = (function(s, d) {
	var symbol = s;
	var rawData = d;

	return {
		// get a row of data from the raw estimate, currency and unit adjusted
		getEstimateDataRow: function(metric, withUnit) {
			var retVal = [];
			for (var i = metric, j = 0; i < metric + 4; i++) {
				var est = rawData.td[i].p;
				if (est == undefined) {
					est = rawData.td[i].font.content;
				}
				if (withUnit) {
					// normalize unit to Million
					lastChar = est.slice(-1);
					est = est.slice(0, -1);
					if (lastChar == 'B') {
						est = Math.round(est * 1000); // convert from Billion to Million
					}
				}
				retVal[j++] = isNaN(est * 1) ? null : est * 1; // if est is a num str, convert it to a number
			}
			if (retVal.length > 0 && gMetrics[symbol]['CURRENCY'] != 'USD') {
				gCurrency[gMetrics[symbol]['CURRENCY']].convert(retVal, false);  // convert usd based estimate to the reported currency
			}
			return retVal;
		},

		// get current trading price of the symbol
		getPrice: function() {
			return (rawData.span.span.content).replace(',', '') * 1;
		},

		// get the current fiscal quarter end date
		getCurrentQtrDate: function() {
			var len = rawData.p[0].content.length;
			var dateStr = rawData.p[0].content.substring(len - 6).replace(' ', ' 1, 20');
			return new Date(dateStr);
		},

		// get the current fiscal year end date
		getFiscalYearEndDate: function() {
			var len = rawData.p[2].content.length;
			var dateStr = rawData.p[2].content.substring(len - 6).replace(' ', ' 1, 20');
			return new Date(dateStr);
		}
	};
});

/* past 4 quarters data from MarketWatch */
var QuarterlyData = (function(s, data) {
	var symbol = s;
	var rawData = data;
	var currency = rawData.p[0].match(/\b[A-Z]{3}\b/g);
	var dates = parseDateRow(1);
	var rev;
	var rps; // = getRps(8);
	var eps; // = getEps(0);
	
	if (gCurrency[currency] == undefined) {
		downloadCurrencyExchangeRate(currency);
	}
				 
	// startIndex: beginning of date data
	function parseDateRow(startIndex) {
		var d;
		var retVal = [];
	
		for (var i = 1; i < 5; i++) { // get only the last 4 qtr
			d = new Date(rawData.p[i + startIndex]);
			retVal[i - 1] = {y: d.getFullYear(), m: d.getMonth() + 1};
		}
		return retVal;
	}
	
	/* get revenue and normalize the data to million, currency adjusted */
	function parseRps() {
		var shares = gMetrics[symbol]['SHARES'][MAX_YEAR];
		var retVal = [];
		
		if (rev == undefined) {
			rev = parseRev();
		}
		
		for (var i=0; i<rev.length; i++) {
			retVal[i] = Math.round(rev[i] / shares  * 100) / 100;
		}
		
		return retVal;
	}
	
	/* get revenue and normalize the data to million, currency adjusted */
	function parseRev() {
		var retVal = [];
		var content, lastCh;
		var startIndex = 8;
			
	
		for (var i = 1; i < 5; i++) { // get only the last 4 qtr
			content = rawData.p[i + startIndex];
			if (content != null) {
				lastCh = content.slice(-1);
				if (!/^\d/.test(lastCh)) {
					content = content.substring(0, content.length - 1);
					if (lastCh == 'B') {
						content *= 1000;
					} else if (lastCh == 'T') {
						content *= 1000000;
					}
				}
			}
			retVal[i-1] = content * 1;
		}
		//	adjust currency to USD
		return (currency == 'USD') ? retVal : gCurrency[currency].convert(retVal, true);
	}
	
	
	/* get earning per share for past 4 quarters, currency adjusted */
	function parseEps() {
		/* XXX  adjust temporary out of sync aapl financial data after the 1:7 split.
		 * this hack will be removed once this fiscal year annual report is out
		 * (where the reported data will be split adjusted )
		 */
		var retVal = [];		
		if (symbol == 'AAPL') {
			for (var i = 1; i < 5; i++) { // get only the last 4 qtr
				retVal[i-1] = Math.round(rawData.td[i].p/7	* 100) / 100;
			}
		}	else {
			var content;
			for (var i = 1; i < 5; i++) { // get only the last 4 qtr
				content = rawData.td[i].p;
				if (content == undefined) {
					content = rawData.td[i].span.content.match(/\(([^)]+)\)/)[1] * -1;
				}
				retVal[i - 1] = content * 1;
			}
			// adjust currency to USD
			retVal =  (currency == 'USD') ? retVal : gCurrency[currency].convert(retVal, true);
		}
		return retVal;
	}
	
	
	return {
		getDates: function() {
			return dates;
		},
		
		getEps: function() {
			if (eps == undefined) {
				eps = parseEps();
			}
			return eps;
		},
		
		getRev: function() {
			if (rev == undefined) {
				rev = parseRev();
			}
			return rev;
		}, 
		
		getRps: function() {
			if (rps == undefined) {
				rps = parseRps();
			}
			return rps;
		},
	}
});

/* currency exchange rate vs USD */
var Currency = (function(cn, r) {
	var name = cn;
	var rate = r;
	
	return {
		// toUSD: true, convert to USD.  false, convert from USD
		convert: function(dataRow, toUSD) {
			for (var i = 0; i < dataRow.length; i++) {
				if (dataRow[i] != null) {
					dataRow[i] = (toUSD) ? Math.round(dataRow[i] / rate * 100) / 100 :
						Math.round(rate * dataRow[i] * 100) / 100;
				}
			}
			return dataRow;
		},
	}
});
