/*
 * initiates the valuation application.  It acts as a main controller for other modules. 
 */
 
var $ = jQuery;					// wordpress includes its own version of jQuery.  the $ shortcut is not available by default
var LOADING_ANIMATION = '#loader';
	
$(function() {
	var urlParams = purl(document.URL).param();
	gCurrency["USD"] = new Currency("USD", 1);   // initiate default currency
	performValuations(urlParams);
});


/* consolidate valuation data from multiple sources and display the info
 * params: configuration parameters for the app
 */
function performValuations(params) {
	$(LOADING_ANIMATION).show();
	
	/* get valuation tool settings from one of these 3 choices: UI, url, or default settings */
	gParams = new ValuationParams(params);
	var sym1 = gParams.getParameter('sym1'), sym2 = gParams.getParameter('sym2');

	$.when(getStockData(sym1), getStockData(sym2), getPerformance(sym1, sym2)).done(
		function() {
			displayValuations();
		}
	).always(
		function() {
			$(LOADING_ANIMATION).hide();
		}
	);
}


/* download and process valuations, historic quotes, and estimate data of a symbol.
 * returns a promise for the multiple async operations	
 */
function getStockData(symbol) {
	var deferred;

	if (symbol == null || hasCachedData(symbol)) {
		deferred = new $.Deferred();
		deferred.resolve();
	} else {
		recordSymbols(symbol);	// log symbol to the server
		deferred = $.when(downloadValuation(symbol), downloadQtrlyData(symbol)).then(
			function() {
				downloadKeyStats(symbol); // get the latest outstanding share count and dividend

				return $.when(downloadEstimates(symbol), downloadHistQuotes(symbol)).done(
					function() {
						processDownloadedData(symbol);
					});
			}
		);
	}

	return deferred.promise();
}


/* download and process performance (weekly, monthly, yearly) of displaying stocks and the market indicator
 */
function getPerformance(sym1, sym2) {
	if (gMetrics[DEFAULT_MKT_SYM] == undefined) {
		gMetrics[DEFAULT_MKT_SYM] = [];
		downloadSymList = DEFAULT_MKT_SYM;
	}

	if (gMetrics[sym1]['PERFORMANCE'] == undefined) {
		downloadSymList += ',' + sym1;
	}

	if (sym2 != null && gMetrics[sym2]['PERFORMANCE'] == undefined) {
		downloadSymList += ',' + sym2;
	}

	var perfUrl = getPerfQuotesUrl(downloadSymList);  // multi symbols separate by comma
	return downloadPerformance(perfUrl);
}


/* async operation to download valuation data from morning star */
function downloadValuation(symbol) {
	var url = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%20%3D%20"http%3A%2F%2Ffinancials.morningstar.com%2Fajax%2FexportKR2CSV.html%3F%26t%3DSYMBOL%26region%3Dusa%26culture%3Den-US%26cur%3DUSD"&format=json&callback=';
	//url = url.replace(/SYMBOL/g, getAltSymbol(symbol));
	url = url.replace(/SYMBOL/g, symbol);

	return downloadData(symbol, url, parseValuationData, 'Valuation');

}


/* download quartely earning reports for the current fiscal year (if any) */
function downloadQtrlyData(symbol) {
	var url = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%20%3D%20\'http%3A%2F%2Fwww.marketwatch.com%2Finvesting%2FStock%2F' +
			symbol +  //getAltSymbol(symbol) +
            '%2Ffinancials%2Fincome%2Fquarter\'%20%20and%20(xpath%20%3D%20\'%2F%2Ftable%5B%40class%3D%22crDataTable%22%5D%5B1%5D%2F*%2Ftr%5B1%5D%2F*%2Fp%20%7C%20%2F%2Ftable' +
			'%5B%40class%3D%22crDataTable%22%5D%5B2%5D%2F*%2Ftr%5Bcontains(.%2C%20%22EPS%20(Diluted)%22)%5D%2Ftd%5B%40class%3D%22valueCell%22%5D\')&format=json&callback=';
			
	var promise = downloadData(symbol, url, parseQuarterlyData, 'Quarterly');
	$.when(promise).done(function(qtrlyObj) {
		gMetrics[symbol]['QTRLY_DATA'] = qtrlyObj;
	});
	return promise;

}


/* for ADR stocks with valuation data in foreign currencies */
function downloadCurrencyExchangeRate(currencyName) {
	var url = 'http://query.yahooapis.com/v1/public/yql?q=select%20col1%20from%20csv%20where%20url%3D"http%3A%2F%2Ffinance.yahoo.com%2Fd%2Fquotes.csv%3Fe%3D.csv%26f%3Dc4l1%26s%3DUSD' +
			currencyName + '%3DX"&format=json&callback=';

	var promise = downloadData(currencyName, url, parseCurrencyExchangeRate, 'Currency');
	$.when(promise).done(function(rate) {
		gCurrency[currencyName] = new Currency(currencyName, rate);
	});
	return promise;

}

/* download key statistics such as outstanding share count and dividend yield*/
function downloadKeyStats(symbol) {
    var url = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%20%3D\'http%3A%2F%2Ffinance.yahoo.com%2Fq%2Fks%3Fs%3DSYMBOL%2BKey%2BStatistics\'' +
		'%20and%20(xpath%3D\'%2F%2Ftable%5B%40class%3D%22yfnc_datamodoutline1%22%5D%5B2%5D%2Ftr%2Ftd%2Ftable%2Ftr%5B4%5D%2Ftd%5B2%5D%20%7C%20%2F%2Ftable%5B%40class' +
		'%3D%22yfnc_datamodoutline1%22%5D%5B3%5D%2Ftr%2Ftd%2Ftable%2Ftr%5B2%5D%2Ftd%5B2%5D\')&format=json&callback=';
	url = url.replace('SYMBOL', symbol);

	return downloadData(symbol, url, parseKeyStats, 'Key Statistics');
}

/* download earning and sale estimates (aka valuation projection)*/
function downloadEstimates(symbol) {
    var url = 'http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html(65)%20where%20url%3D%22http%3A%2F%2Ffinance.yahoo.com%2Fq%2Fae%3Fs%3DSYMBOL' +
		'%22%20and%20(xpath%20%3D\'%2F%2Fspan%5B%40class%3D%22time_rtq_ticker%22%5D\'%20or%20xpath%3D\'%2F%2Ftable%2Ftr%2Ftd%2Ftable%2Ftr%2Ftd%5B%40class' +
		'%3D%22yfnc_tabledata1%22%20or%20%40class%3D%22yfnc_tablehead1%22%5D\'%20or%20(%20xpath%3D\'%2F%2Ftable%2Ftr%2Ftd%2Ftable%2Ftr%2Fth%2Fp\'%20)%20)&format=json';
//	url = url.replace('SYMBOL', getAltSymbol(symbol));
	url = url.replace(/SYMBOL/g, symbol);


	return downloadData(symbol, url, parseEstimates, 'Estimates');
}

/* download adjusted monthly quotes */
function downloadHistQuotes(symbol) {
	var url = getHistQuotesUrl(MAX_YEAR + 1);
	url = url.replace(/SYMBOL/g, symbol);

	var quotesPromise = downloadData(symbol, url, parseHistQuotes, 'Quotes');
	$.when(quotesPromise).done(function(results) {
		gMetrics[symbol]['HIST_QUOTES'] = results[0];
	});

	return quotesPromise;
}

/* download stock weekly, monthly, quartely, and yearly performance data */
function downloadPerformance(url) {
	var perfPromise = downloadData('', url, parsePerfQuotes, 'Performance');
	$.when(perfPromise).done(function(results) {
		var symbol;
		for (var i = 0; i < results.length; i++) {
			symbol = results[i].symbol;
			gMetrics[symbol]['PERFORMANCE'] = results[i];
		}
	});
	return;  // Errors in downloading performance does not affect valuation display.  
}


/* generic function to download and parse data asynchronously
 * parseDataFn: function to parse the return of url
 * dataName: display the data category name if it fails to connect to the URL	
 */
function downloadData(target, url, parseDataFn, dataName) {

    return $.getJSON(url)
    .fail(function(jqxhr, textStatus, error) {
		var errorLog = new ErrorLog(target, ERROR, 'Cannot download ' + dataName + ' data.');
		handleError(errorLog);
	})
    .then(
        function(data) {
			var parseResult;
		    try {
		        parseResult = parseDataFn(target, data);
    		} catch (e) {
	    	    return handleError(e);
		    }
			return new $.Deferred().resolve(parseResult);
        }
	);
}


/* is the valuation data of a symbol cached ? */
function hasCachedData(symbol) {
	// if data is cached
	if (gMetrics[symbol] != null && gMetrics[symbol]['SHARES'] != null) {
		processDownloadedData(symbol);
		return true;
	}

	gMetrics[symbol] = [];
	// if mock data
	if (MOCK_ON) {
		getMockData(symbol);
		return true;
	}

	return false;
}


/* parse valuation data from morning star */
function parseValuationData(symbol, data) {
	if (data.query.results == null) {
		throw new ErrorLog(symbol, ERROR, 'No valuation data for symbol ' + symbol);
	}
	
	gRawValData[symbol] = new ValuationData(symbol, data.query.results.row);

	gMetrics[symbol]['LAST_REPORTED_FY'] = gRawValData[symbol].getLastReportedFiscalYear();
	gMetrics[symbol]['SHARES'] = gRawValData[symbol].getValuationMetric('SHARES', false);
	gMetrics[symbol]['DIVIDENDS'] = gRawValData[symbol].getValuationMetric('DIVIDENDS', true);
	gMetrics[symbol]['CURRENCY'] = gRawValData[symbol].getCurrency(); //[REVENUE].col0.split(' ')[1];
	
	if (gCurrency[gMetrics[symbol]['CURRENCY']] == undefined) {
			downloadCurrencyExchangeRate(gMetrics[symbol]['CURRENCY']);
	}
}


/* parse estimate data from Yahoo finance */
function parseEstimates(symbol, data) {
	gMetrics[symbol]['FYE'] = [];
	try {
		// unlike valuation data, estData will not be stored after parseEstimates() exits.
		var estData = new EstimateData(symbol, data.query.results);
		var curQtr = estData.getCurrentQtrDate();
		var estDateMin = new Date(TODAY.getTime());

		// if estimate date is more than 3 months past today, it is staled
		estDateMin.setMonth(estDateMin.getMonth() - 3);

		gMetrics[symbol]['CURRENT_PRICE'] = estData.getPrice();
		gMetrics[symbol]['FYE'] = {currentQ: {y: curQtr.getFullYear(), m: curQtr.getMonth() + 1}};
		gMetrics[symbol]['EARNINGS_PS_Q_HIST'] = estData.getEstimateDataRow(EARNINGS_PS_Q_HIST);
		gMetrics[symbol]['EARNINGS_PS_YEAR_AGO'] = estData.getEstimateDataRow(EARNINGS_PS_YEAR_AGO, false)[2];
		gMetrics[symbol]['REVENUE_EST'] = estData.getEstimateDataRow(REVENUE_EST, true);
		gMetrics[symbol]['REVENUE_PS_YEAR_AGO'] = estData.getEstimateDataRow(REVENUE_YEAR_AGO, true)[2] / gMetrics[symbol]["SHARES"][MAX_YEAR - 1];

		gMetrics[symbol]['EARNINGS_PS_EST'] = estData.getEstimateDataRow(EARNINGS_PS_EST);
		if (gMetrics[symbol]['EARNINGS_PS_EST'][2] == null || gMetrics[symbol]['EARNINGS_PS_EST'][3] == null) {
			throw new ErrorLog(symbol, WARNING, 'Invalid earnings estimate.');
		} else if (gMetrics[symbol]['EARNINGS_PS_EST'][0] == null) { //|| isNaN(Date.parse(dateStr)))  {
			var elog = new ErrorLog(symbol, WARNING, 'No quarterly earnings estimate available. ');
			handleError(elog);
		}

		var fyeDate = estData.getFiscalYearEndDate();
		if (isNaN(fyeDate.getFullYear())) {
			gMetrics[symbol]['FYE'].fye = {y: TODAY.getFullYear(), m: fyeDate.getMonth() + 1};	// <-- intentional mix-matching Yr and month in case of bad data
		} else if (fyeDate.getTime() < estDateMin.getTime()) {
			gMetrics[symbol]['FYE'].fye = {y: TODAY.getFullYear(), m: fyeDate.getMonth() + 1};
			eraseEstimates(symbol);
			throw new ErrorLog(symbol, WARNING, 'Estimate data has not been updated and therefore not accurate.');
		} else {
			gMetrics[symbol]['FYE'].fye = {y: fyeDate.getFullYear(), m: fyeDate.getMonth() + 1};
		}
	} catch (e) {
		gMetrics[symbol]['FYE'].fye = {y: TODAY.getFullYear(), m: TODAY.getMonth() + 1};
		eraseEstimates(symbol);
		if (e instanceof ErrorLog) {
			throw e;
		} else {
			throw new ErrorLog(symbol, WARNING, 'No earnings estimate available.');
		}
	}
}

/* parse currency exchange rate from yahoo finance */
function parseCurrencyExchangeRate(currencyName, data) {
	try {
		return data.query.results.row.col1;
	} catch (e) {
		throw new ErrorLog(currencyName, WARNING, 'Cannot get exchange rate.');
	}
}


/* parse quarterly earning results from market watch */
function parseQuarterlyData(symbol, data) {
	try {
		var retVal = new QuarterlyData(symbol, data.query.results);
		return retVal;
	} catch (e) {
		throw new ErrorLog(symbol, WARNING, 'No quarterly data available.');
	}
}


/* parse outstanding shares and dividend number from yahoo finance */
function parseKeyStats(symbol, data) {
	try {
		var oShares = data.query.results.td[1].p;
		lastChar = oShares.slice(-1);
		oShares = oShares.slice(0, -1);
		if (lastChar == 'B') {
			oShares = Math.round(oShares * 1000); // convert from Billion to Million
		}
		gMetrics[symbol]['SHARES'][MAX_YEAR] = oShares * 1;			// replace TTM of shares and div to the latest data
		gMetrics[symbol]['DIVIDENDS'][MAX_YEAR] = gCurrency[gMetrics[symbol]['DIVIDENDS_CURRENCY']].convert([data.query.results.td[2].p], false)[0];
	} catch (e) {
		throw new ErrorLog(symbol, WARNING, 'Cannot get keystats.');
	}
}


/* combine  downloaded data and calculate the derived metrics such as growth rate and price based metrics */
function processDownloadedData(symbol) {
	try {
		var metrics = gMetrics[symbol];
		var showValType = VAL_TYPES[gParams.getParameter('val_type_index')];
		var showMetric = METRIC_TYPES[gParams.getParameter('metric_type_index')];

		if (gMetrics[symbol]['HIST_QUOTES'] != null) {
				gMetrics[symbol]['YEARLY_PRICE'] = calculateYearlyPrices(symbol, gMetrics[symbol]['HIST_QUOTES']);
				gMetrics[symbol]['HIST_QUOTES'] = null;  // clean up historic quotes memory
		}

	//	if (metrics[showMetric] == null) {
		if (metrics[showMetric] == undefined) {
			getMetricValuation(symbol, showMetric);
		}

		if (metrics[showValType] == undefined) {
			getMetricValuation(symbol, showValType);
		}

		// rate of growth on selected metric, not valuation type
		gMetrics[symbol][showMetric + '_G'] = getGrowthRate(symbol, showMetric);
	} catch (e) {
		if (e instanceof ErrorLog == false) {
			e = new ErrorLog(symbol, ERROR, 'Cannot process downloaded data.  Reason: ' + e.message);
		}
		handleError(e);
	}
}


/* if raw estimates data is not consistent (ie. stale or incomplete estimate data), erase all processed estimate data */
function eraseEstimates(symbol) {
	gMetrics[symbol]['EARNINGS_PS_Q_HIST'] = [];
	gMetrics[symbol]['EARNINGS_PS_YEAR_AGO'] = [];
	gMetrics[symbol]['REVENUE_PS_EST'] = [];
	gMetrics[symbol]['REVENUE_EST'] = [];
	gMetrics[symbol]['REVENUE_PS_YEAR_AGO'] = [];
	gMetrics[symbol]['EARNINGS_PS_EST'] = [];
}


/* merge valuation data, reported quarterly data, and estimate data */
function mergeHistAndEstData(symbol, metric, histYearlyData, estRow) {
	if (estRow == null || estRow.length == 0) {
		return;
	}

	var histQtrs;
	switch (metric) {
		case 'EARNINGS_PS' :
			histQtrs = gMetrics[symbol]['QTRLY_DATA'].getEps();
			break;
		case 'REVENUE' :
			histQtrs = gMetrics[symbol]['QTRLY_DATA'].getRev();
			break;
		case 'REVENUE_PS' :
			histQtrs = gMetrics[symbol]['QTRLY_DATA'].getRps();
			break;
			
	}
	
	var mergeAttr = getMergeAttributes(symbol, histQtrs, estRow);
	
	histYearlyData.pop();  // replace TTM data with estimate for the current year
	if (gMetrics[symbol]['FYE'].fye.y - gMetrics[symbol]['LAST_REPORTED_FY'].y > 1) {
		// all 4 Qs have been reported but 10K is not out yet or
		// fye date changed this year
		handleGapYearData(symbol, mergeAttr, histYearlyData, estRow, metric, histQtrs);
	} else {
		histYearlyData.push(getCurrentFiscalYearData(symbol, metric, estRow, mergeAttr));              // Current Year est
		histYearlyData.push(estRow[3]);                // Next Year est
	}
}


/* aux method to hormonize quarterly reported data and estimate data.
 * The data come from different sources (MarketWatch and Yahoo Finance).  Reported data may trail behind
 * estimate data and therefore creates gaps in the merge data.
 * This method determines the merge attributes which will be used to identify potential data mismatch problems
 */
function getMergeAttributes(symbol, histQtrs, estRow) {
	var isValidQtrlyData = isValidData(histQtrs) && isValidData(estRow);
	var diff, isGapped;

	if (isValidQtrlyData) {
		var fyeMonth = gMetrics[symbol]['FYE'].fye.m;
		var curQtrEndsMonth = gMetrics[symbol]['FYE'].currentQ.m;
		isGapped = (fyeMonth != curQtrEndsMonth && (gMetrics[symbol]['QTRLY_DATA'].getDates()[3].m + 3) % 12 != curQtrEndsMonth);
//		if (isGapped) {
//			curQtrEndsMonth = gMetrics[symbol]['QTRLY_DATA'].date[3].m + 3;
//		}
		diff = (curQtrEndsMonth > fyeMonth) ? fyeMonth + (12 - curQtrEndsMonth) : fyeMonth - curQtrEndsMonth;
		isValidQtrlyData = isValidQtrlyData && !(diff == 9 && isGapped);  // Q4 reported but the yearly data is not out.
	}

	return {isValidQtrlyData: isValidQtrlyData, qtrIndex: diff, isGapped: isGapped};
}

/* check if the estimate or the reported quartely data is valid.  Data quality tends to be poor in these categories */ 
function isValidData(dataRow) {
	var retVal = (dataRow != undefined);

	if (retVal) {
		for (var i = 0; i < dataRow.length; i++) {
			if (dataRow[i] == null || isNaN(dataRow[i])) {
				retVal = false;
				break;
			}
		}
	}
	return retVal;
}


/*
 * This method attempts to handle discrepancy problems caused by out of sync data from multiple data sources or
 * changes in earning report schedule.  For example, Yahoo tends to update its data faster than other data sources
 * after a company reported its quarterly earnings.
 *
 * This function handles quarterly and yearly data gaps in the merged data
 * */
function handleGapYearData(symbol, mergeAttr, histRow, estRow, metric, histQ) {
	if (gMetrics[symbol]['FYE'].fye.m != gMetrics[symbol]['LAST_REPORTED_FY'].m) {
		for (var key in gMetrics[symbol]['YEARLY_PRICE']) {
			// add latest 
			gMetrics[symbol]['YEARLY_PRICE'][key].push(gMetrics[symbol]['CURRENT_PRICE']);
		}
		// fye date has changed starting this fiscal year
		histRow.push(null);  // not enough information to determine how multiple data sources would handle the duplicated quarter(s).
		histRow.push(estRow[2]);
		histRow.push(estRow[3]);                // Next Year est
		var err = new ErrorLog(symbol, WARNING, 'Fiscal Year End Month has changed from ' +
						   MONTH_NAMES[gMetrics[symbol]['LAST_REPORTED_FY'].m -1] + ' to ' +
						   MONTH_NAMES[gMetrics[symbol]['FYE'].fye.m - 1]);
		handleError(err);
	} else if (mergeAttr.isValidQtrlyData) {
		histRow.push(Math.round((histQ[0] + histQ[1] + histQ[2] + histQ[3]) * 100) / 100);
		histRow.push(estRow[2]);
		histRow.push(estRow[3]);                // Next Year est
	} else {
		var metricStr;
		if (metric == 'EARNINGS_PS') {
			histRow.push(gMetrics[symbol]['EARNINGS_PS_YEAR_AGO']);
			metricStr = 'Earnings';
		} else {
			histRow.push(gMetrics[symbol]['REVENUE_PS_YEAR_AGO']);
			metricStr = 'Revenue';
		}
		histRow.push(estRow[2]);
		histRow.push(estRow[3]);
		throw new ErrorLog(symbol, ERROR, (gMetrics[symbol]['FYE'].fye.y - 1) + '\'s ' + metricStr
					  + ' data is reported but not yet available.  Please check back for the latest data.');
	}
}


/* Merge data from the reported quarters and the estimated quarters to
 * get a consolidated pic of the earning status of the current fiscal year
 */
function getCurrentFiscalYearData(symbol, metric, estRow, mergeAttr) {
	if (!mergeAttr.isValidQtrlyData) {
		return estRow[2];  // if there is no valid qtrly data, return est for the current year
	}

	var retVal = mergeQtrHistAndEstData(symbol, metric, mergeAttr.qtrIndex, mergeAttr.isGapped, estRow);
	if (retVal == undefined) {
		retVal = 0;
		var qData;

		if (metric == 'EARNINGS_PS') {
			qData = gMetrics[symbol]['FYE'].eps_q;
		} else {
			// return the total rev for the qtr but calculate rps while we have all the data
			//gMetrics[symbol]['FYE'].rps_q = perShareBasedCalculation(symbol, gMetrics[symbol]['FYE'].rev_q, false); //getQtrlyRps(symbol, gMetrics[symbol]['FYE'].rev_q);
			qData = gMetrics[symbol]['FYE'].rev_q;
		}
		for (var i = 0; i < 4; i++) {
			if (qData[i] != null) {
				retVal += (typeof qData[i] == 'string') ? qData[i].substring(0, qData[i].length - 1) * 1 : qData[i];
			}
		}
	}
	return Math.round(retVal * 100) / 100;
}


/* merge reported qtr data to estimate data for the current fiscal year */
function mergeQtrHistAndEstData(symbol, metric, diff, isGapped, estRow) {
	var retVal;

	switch (diff) {
		case 9 : 			// q1
			retVal = estRow[2]; // current year estimate
			break;
		case 6 :			// q2
			if (metric == 'EARNINGS_PS') {
				var q1Eps = (isGapped || isNaN(gMetrics[symbol]['QTRLY_DATA'].getEps()[3])) ?
					gMetrics[symbol]['EARNINGS_PS_Q_HIST'][3] : gMetrics[symbol]['QTRLY_DATA'].getEps()[3];
				gMetrics[symbol]['FYE'].eps_q[0] = q1Eps;
				gMetrics[symbol]['FYE'].eps_q[1] = estRow[0] + 'E'; 	// current q estimate (q2)
				gMetrics[symbol]['FYE'].eps_q[2] = estRow[1] + 'E';		// next q estimate (q3)
				gMetrics[symbol]['FYE'].eps_q[3] = (estRow[2] - estRow[1] - estRow[0] - q1Eps).toFixed(2) + 'E'; // q4 est
			} else {
				if (!isNaN(gMetrics[symbol]['QTRLY_DATA'].getRev()[3])) {
					gMetrics[symbol]['FYE'].rev_q[0] = gMetrics[symbol]['QTRLY_DATA'].getRev()[3];
				} else {
					gMetrics[symbol]['FYE'].rev_q[0] = null;
					retVal = estRow[2];		// Yahoo does not provide qtrly rev est/actual data.  If there is no qtrly data from MW, return the current year estimate
				}
				gMetrics[symbol]['FYE'].rev_q[1] = estRow[0] + 'E'; 	// current q estimate (q2)
				gMetrics[symbol]['FYE'].rev_q[2] = estRow[1] + 'E';		// next q estimate (q3)
				gMetrics[symbol]['FYE'].rev_q[3] = (retVal != undefined) ? null :
					(estRow[2] - estRow[1] - estRow[0] - gMetrics[symbol]['FYE'].rev_q[0]) + 'E'; // q4 est
			}
			break;
		case 3: 	// q3
			var fiscalYearQ, qtrlyData;
			if (metric == 'EARNINGS_PS') {
				fiscalYearQ = gMetrics[symbol]['FYE'].eps_q;
				qtrlyData = gMetrics[symbol]['QTRLY_DATA'].getEps();
			} else {
				fiscalYearQ = gMetrics[symbol]['FYE'].rev_q;
				qtrlyData = gMetrics[symbol]['QTRLY_DATA'].getRev();
			}

			if (!isGapped && !isNaN(qtrlyData[3])) {
				fiscalYearQ[0] = qtrlyData[2];
				fiscalYearQ[1] = qtrlyData[3];
			} else {
				fiscalYearQ[0] = qtrlyData[3];
				fiscalYearQ[1] = ((metric == EARNINGS_PS) ? gMetrics[symbol]['EARNINGS_PS_Q_HIST'][3] : (estRow[2] - fiscalYearQ[0] - estRow[0] - estRow[1]).toFixed(2)) + 'E';
			}
			fiscalYearQ[2] = estRow[0] + 'E';
			fiscalYearQ[3] = estRow[1] + 'E';
			break;
		case 0: 	// q4
			var fiscalYearQ, qtrlyData;
			if (metric == 'EARNINGS_PS') {
				fiscalYearQ = gMetrics[symbol]['FYE'].eps_q;
				qtrlyData = gMetrics[symbol]['QTRLY_DATA'].getEps();
			} else {
				fiscalYearQ = gMetrics[symbol]['FYE'].rev_q;
				qtrlyData = gMetrics[symbol]['QTRLY_DATA'].getRev();
			}

			if (!isGapped) {
				fiscalYearQ[0] = qtrlyData[1];
				fiscalYearQ[1] = qtrlyData[2];
				fiscalYearQ[2] = qtrlyData[3];
			} else {
				fiscalYearQ[0] = qtrlyData[2];
				fiscalYearQ[1] = qtrlyData[3];
				fiscalYearQ[2] = ((metric == EARNINGS_PS) ? gMetrics[symbol]['EARNINGS_PS_Q_HIST'][3] : (estRow[2] - qtrlyData[2] - qtrlyData[3] - estRow[0]).toFixed(2)) + 'E';
			}
			fiscalYearQ[3] = estRow[0] + 'E';
			break;
		default:
			retVal = estRow[2]; // current year estimate
			break;
	}

	return retVal;
}

/* convert quarterly revenue data (hist and est) to per share base */
function getQtrlyRps(symbol, revData) {
	var retVal = [];
	var shares = gMetrics[symbol]['SHARES'][MAX_YEAR];

	for (var i = 0; i < revData.length; i++) {
		if (revData[i] == null || typeof revData[i] == 'number') {
			retVal[i] = Math.round(revData[i] / shares * 100) / 100;
		} else { // (typeof qData[i] == 'string')
			retVal[i] = (revData[i].substring(0, revData[i].length - 1) / shares).toFixed(2) + 'E';
		}
	}
	return retVal;
}


/* find the max, min, and avg trading price for each fiscal year */
function calculateYearlyPrices(symbol, quotes) {
	var firstFiscalYear = gMetrics[symbol]['LAST_REPORTED_FY'].y - (MAX_YEAR - 1);
	var fiscalYearEndMonth = gMetrics[symbol]['LAST_REPORTED_FY'].m;

	var quoteIndex = quotes.length - 1;
	var avgArr = [], maxArr = [], minArr = [];
	var avg, max, min, count;
	var comp, yearStart, yearEnd;
	for (var y = firstFiscalYear; y <= gMetrics[symbol]['LAST_REPORTED_FY'].y + 1; y++) {
		if (fiscalYearEndMonth == 12) {
			yearStart = [y, 1];
			yearEnd = [y, fiscalYearEndMonth];
		} else {
			yearStart = [y - 1, fiscalYearEndMonth + 1];
			yearEnd = [y, fiscalYearEndMonth];
		}
		count = total = 0;

		max = 0; min = Number.MAX_VALUE;
		while (quoteIndex > -1) {
			comp = compareDateStrWithRange(quotes[quoteIndex][0], yearStart, yearEnd);
			if (comp == -1) {  // before date range
					quoteIndex--;
					continue;
			}

			if (comp == 1) {        // after date range
					break;
			}

			count++;
			total = total + quotes[quoteIndex][1];
			if (quotes[quoteIndex][1] > max) {
				max = quotes[quoteIndex][1];
			}
			if (quotes[quoteIndex][1] < min) {
				min = quotes[quoteIndex][1];
			}
			quoteIndex--;
		}
		avg = Math.round(total / count * 100) / 100;
		if (isNaN(avg)) {
			avg = null;
		}
		avgArr.push(avg); maxArr.push(max); minArr.push(min);
	}
	var cp = gMetrics[symbol]['CURRENT_PRICE'];

	// current FYE
	if (count == 12) {  // full year
		max = min = cp;
		avgArr.push(cp); maxArr.push(max); minArr.push(min);
	} else {
		avgArr.pop();
		avgArr.push(cp);
	}

	// next FYE
	avgArr.push(cp);
	maxArr.push(max);
	minArr.push(min);

	return {avg: avgArr, max: maxArr, min: minArr};
}


/* get the yearly growth rate of a specific metric. Calculate if data is not cached. */
function getGrowthRate(symbol, metric) {
	var dataRow = gRawValData[symbol].getValuationMetric(metric + '_G', false);
	if (dataRow.length == 0) {
		var metricDataRow = gRawValData[symbol].getValuationMetric(metric, true);
		if (metricDataRow == 0) {
			throw new ErrorLog(symbol, WARNING, 'No such metric ' + metric + '.');
		}

		dataRow[0] = null;
		for (var i = 1; i < metricDataRow.length; i++) {
			dataRow[i] = (metricDataRow[i - 1] == null || metricDataRow[i - 1] == 0) ? null :
				Math.round((metricDataRow[i] - metricDataRow[i - 1]) / metricDataRow[i - 1] * 10000) / 100;
			if (Math.abs(dataRow[i]) > 500) {
				// XXX tested one case where growth rate was 32k and crashed highchart.  need a better solution to process outliner numbers
				dataRow[i] = null;
			}
		}

	}
	return dataRow;
}


/* get yearly valuation of a specific metric.  Calculate if data is not cached */
function getMetricValuation(symbol, metric) {
	var dataRow = gRawValData[symbol].getValuationMetric(metric, true);

	// if metric data is not provided by the downloaded data, needs to do some calculation
	if (dataRow.length == 0) {
		if (metric.indexOf('_P_') == 0) {
		// if metric is a price based valuation type (prefix '_P_')
			var type = metric.substring(3);
			dataRow = gRawValData[symbol].getValuationMetric(type, true);
			if (dataRow.length == 0) {
				var subType = type.substring(0, type.indexOf('_PS'));
				var row = gRawValData[symbol].getValuationMetric(subType, true);
				if (row.length > 0) {
					gMetrics[symbol][subType] = row;
					dataRow = perShareBasedCalculation(symbol, row, true);
				} else {
					throw new ErrorLog(symbol, ERROR, 'No ' + subType + ' data.');
				}
			}
			gMetrics[symbol][metric] = priceBasedCalculation(symbol, dataRow);
			gMetrics[symbol][type] = dataRow;
		} else if (metric.indexOf('_PS') == metric.length - 3) {
			// per share base
			var subType = metric.substring(0, metric.length - 3);
			var row = gRawValData[symbol].getValuationMetric(subType, true);
			if (row.length > 0) {
				gMetrics[symbol][subType] = row;
				gMetrics[symbol][metric] = perShareBasedCalculation(symbol, row, true);
				gMetrics[symbol][metric + '_CURRENCY'] = gMetrics[symbol][subType + '_CURRENCY'];
			} else {
				throw new ErrorLog(symbol, ERROR, 'No ' + subType + ' data.');
			}
		} else if (metric.indexOf('_PP') == metric.length - 3) {
			// per price base
			var subType = metric.substring(0, metric.length - 3);
			var row = gRawValData[symbol].getValuationMetric(subType, true);
			if (row.length > 0) {
				gMetrics[symbol][subType] = row;
				gMetrics[symbol][metric] = priceBasedCalculation(symbol, row, true);
			} else {
				throw new ErrorLog(symbol, ERROR, 'No ' + subType + ' data.');
			}

		}
	}
}


/* get price based metric data  for comparison purpose.  For example, price per book value or price per revenue (PE)
 * isInverse: get metric data per price.  for example, dividend per price = dividend yield
 */
function priceBasedCalculation(symbol, dataRow, isInverse) {
	var priceBasedDataRow = [];
	var prices = gMetrics[symbol]['YEARLY_PRICE'].avg;
	var numerator, denominator, multiplier;

	if (isInverse) {
		denominator = prices;
		numerator = dataRow;
	 	multiplier = 100;
	} else {
		denominator = dataRow;
		numerator = prices;
		multiplier = 1;
	}

	var i;
	for (i = 0; i < dataRow.length; i++) {
		priceBasedDataRow[i] = (denominator[i] == null || denominator[i] <= 0 || numerator[i] == null) ?
			null : Math.round((numerator[i] / denominator[i] * 100 * multiplier)) / 100;
	}

	/* for price denominated calculation, the last value should be calculated by the current price */
	if (isInverse) {
		priceBasedDataRow[i - 1] = (dataRow[i - 1] == null) ? null : Math.round((dataRow[i - 1] / gMetrics[symbol]['CURRENT_PRICE'] * 100 * multiplier)) / 100;
	}

	return priceBasedDataRow;
}

/* get share based metric data  for comparison purpose.  For example, net income per share
 * isHistoric: historic share based data uses matching historic share counts to calculate.
 */
function perShareBasedCalculation(symbol, dataRow, isHistoric) {
	var perShareDataRow = [];
	var numShares;
	var shares = gMetrics[symbol]['SHARES'];
	for (var i = 0; i < dataRow.length; i++) {
		numShares = (isHistoric && i < shares.length) ? shares[i] : shares[shares.length - 1];
		if (numShares == null || numShares == 0) {
			//var year = (isHistoric) ? gMetrics[symbol]['FYE'].fye.y - (MAX_YEAR - i) : gMetrics[symbol]['FYE'].fye.y;
			numShares = (isHistoric && i < shares.length) ? shares[Math.floor(0, i - 1)] : shares[shares.length - 2];
		}
		perShareDataRow[i] = (dataRow[i] == null || numShares == null || numShares == 0) ?
			null : Math.round(dataRow[i] / numShares * 100) / 100;
	}

	return perShareDataRow;
}


/* input parameter metric has estimate data? 
 */
function hasEstimates(symbol, metric) {
	var retVal;

	try {
		retVal = (gMetrics[symbol][metric].length > MAX_YEAR + 1); // more data than MAX_YEAR + TTM
	} catch (e) {
		// no est if no earnings/rev
		retVal = false;
	}

	return retVal;
}


