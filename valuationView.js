var SYM1_VAL_COLOR = '#000099'; //'darkblue';
var SYM1_METRIC_COLOR = '#4775D1';  //'#7CB9E8';
var SYM1_EST_COLOR = '#B6C8EC';
var SYM2_VAL_COLOR = '#990000'; //'red';
var SYM2_METRIC_COLOR = '#FF3333'; //'#FE6F5E';
var SYM2_EST_COLOR = '#ff9999';

var SYM1DISPLAY = {val_color: SYM1_VAL_COLOR, metric_color: SYM1_METRIC_COLOR, est_color: SYM1_EST_COLOR};
var SYM2DISPLAY = {val_color: SYM2_VAL_COLOR, metric_color: SYM2_METRIC_COLOR, est_color: SYM2_EST_COLOR};


var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DISPLAY_NAMES = {DIVIDENDS_PP: 'Dividend Yield %'};

var gDisplayParam = [];		// parameters for hicharts
var gMainSym, gMinorSym;	// in comparison mode, the 2 comparing stocks can be toggled for main display and minor display



/* display valuation data using hicharts */
function displayValuations() {
	setDisplay();			// initialize display parameters
	displayCharts(true);	// display valuation chart and growth rate chart
	displayPerformanceTable();	// display weekly, monthly, quarterly, and yearly stock performance
}


/* initialize display parameters
 */
function setDisplay() {
	gMainSym = gParams.getParameter('sym1');
	gMinorSym = gParams.getParameter('sym2');
	gDisplayParam[gParams.getParameter('sym1')] = SYM1DISPLAY;
	gDisplayParam[gParams.getParameter('sym2')] = SYM2DISPLAY;
	gDisplayParam['big_chart_series_visibility'] = [true, true, true, true];

	// set config menu items
	$('#config-menu input.ac-input').each(function() {
		this.value = gParams.getParameter(this.id);
	});

	$('#config-menu select').each(function() {
		this.value = gParams.getParameter(this.id);
	});
}


/* display charts.
 * showMini: true if reset display
 *           false if only refreshing the main chart (ie. rotate metrics)
 */           
function displayCharts(showMini) {
	var config = initChartConfig();
	var series = getChartsSeries(config);

	displayBigChart(series[0], config);

	if (showMini) {
		displayMiniChart(series[1], config);
	}
}


function displayBigChart(series, config) {
	var chart = new Highcharts.Chart({
		chart: {
			renderTo: 'big_chart',
			type: 'column',
			height: config['big_chart_height']
		},
		title: {
			useHTML: true,
			text: config['big_chart_title'],
			style: {
				cursor: 'pointer'
			}

		},
        credits: {
            text: 'Simfol.io',
            href: 'http://simfol.io/valuation/',
			style: {
				fontSize: '12px',
				fontWeight: 'bold'
			}
        },
		legend: {
			itemMarginTop: 5,
			itemMarginBottom: 5
		},
		xAxis: {
	//		plotBands: config['xPlot_bands'],
			tickLength: 0,
			minRange: 3	,
			categories: config['xAxis_cat'],
			labels: {
				step: 2
			}
		},
		yAxis: [{ // Primary yAxis
			min: config['primary_y_min_show'],
			max: config['primary_y_max_show'],
			tickInterval: config['primary_tick_interval'],
			labels: {
				enabled: true,
				//format: '{value}',
				formatter: function() {
					return (this.value < config['primary_y_max_show']) ? this.value : '';
				},
				style: {
					color: gDisplayParam[gMainSym]['metric_color']
				}
			},
			title: {
				text: config['metric_name_yAxis'] ,
				align: 'low',
				style: {
					color: gDisplayParam[gMainSym]['metric_color']
				}
			}
		}, { // Secondary yAxis
			min: config['secondary_y_min_show'],
			max: config['secondary_y_max_show'],
			tickInterval: config['secondary_tick_interval'],
			title: {
				text: 'Price Per ' + config['val_type_display_name'] + ' ' + Array(5).join('\u2015\u2022') + Array(11).join(' '),
//				align : 'high',
				style: {
					color: gDisplayParam[gMainSym]['val_color']
				}
			},
			labels: {
				//format: '{value}',
				formatter: function() {
					return (this.value >= 0) ? this.value : '';
				},
				style: {
					color: gDisplayParam[gMainSym]['val_color']
				}
			},
			opposite: true
		}],

		plotOptions: {
			spline: {
				marker: {
					enabled: true
				}
			},
			series: {
                events: {
                    legendItemClick: function(event) {
						gDisplayParam['big_chart_series_visibility'][this.index] = !this.visible;
						if (this.index == 0) {
							// turn off metric y axis (metric type) if its legend is disabled (and vice versa)
							if (gDisplayParam['big_chart_series_visibility'][0]) {
								chart.series[0].yAxis.axisTitle.attr({text: config['metric_name_yAxis']});
								chart.series[0].yAxis.labelGroup.show();
							} else {
								chart.series[0].yAxis.axisTitle.attr({text: null});
								chart.series[0].yAxis.labelGroup.hide();
							}
						}
                        return true;
                    }
                }
			}
		},
		tooltip: {
			borderWidth: 2,
			formatter: function() {
				return formatTooltip(this, config);
			}
		},
		series: series
	});

	$('.highcharts-title').click(function() {
		return rotateStocks();
	});
}


function displayMiniChart(series, config) {
	// Mini chart 1
	var miniChart = new Highcharts.Chart({
		chart: {
			type: 'column',
			renderTo: 'mini_chart1',
			spacingBottom: 1,
			height: config['mini_chart_height'],
			margin: [20, 50, null, 50]
		},
		title: {
			useHTML: true,
            text: '<small>' + config['mini_chart_title'] + '</small>',
			floating: true
		},
		credits: {
			enabled: false
		},
		xAxis: {
			categories: config['xAxis_cat'],
			showFirstLabel: false,
			lineWidth: 0,
			tickLength: 0,
			labels: {
				 align: 'center',
				 step: 2
			 }
		},
		yAxis: {
			tickInterval: config['mini_chart_tick_interval'],
			title: {
				text: null
			},
			labels: {
				step: config['mini_chart_step']
				//enabled: false
			},
			gridLineWidth: 0,
			plotLines: [{
				value: 0,
				width: 1,
				color: 'silver'
			}]
		},
		tooltip: {
			valueSuffix: '%'
			/*formatter: function() {
				return formatTooltip(this);
			}*/
		},
		legend: {
			itemWidth: 80
		},
		plotOptions: {
			series: {
				 dataLabels: {
				 }
			}
		},
		series: series
	});
}

function displayAlertSetUp() {
	$('#alert-dialog #title').text(gMainSym + ' Alert');
	if ($('#alert-dialog #metric-select option:selected').text().match(/[0-9]+/) == null) {
		$('#alert-dialog #metric-select option').each(
			function(i) {
				if (i == 0 || i == 1) {
					this.text += ' (' + (gMetrics[gMainSym]['FYE'].fye.y + 1) + ')';
				} else if (i == 2) {
					this.text += ' (' + gMetrics[gMainSym]['FYE'].fye.y + ')';
				}
			}
		);
	//	$('#alert-dialog input[name=symbol]').val(gMainSym);
	}
	displayDefaultTriggerValue();
	$('#alert-dialog').popUpDialog();
}


function displayDefaultTriggerValue() {
	var triggerValue;
	var lastElem;
	switch ($('#alert-dialog #metric-select option:selected').val()) {
		case '0' : // P/earnings
			lastElem = gMetrics[gMainSym]['_P_EARNINGS_PS'].length - 1;
			triggerValue = gMetrics[gMainSym]['_P_EARNINGS_PS'][lastElem] * .9;
			break;
		case '1' : // p/sales
			lastElem = gMetrics[gMainSym]['SHARES'].length - 1;
			//XXX check
			triggerValue = gMetrics[gMainSym]['CURRENT_PRICE'] * gMetrics[gMainSym]['f_PS_EST'] [3] * .9;
			//triggerValue = gMetrics[gMainSym]['CURRENT_PRICE'] * gMetrics[gMainSym]['SHARES'][lastElem] / gMetrics[gMainSym]['REVENUE_EST'][3] * .9;
			break;
		case '2' : // dividend yields
			lastElem = gMetrics[gMainSym]['DIVIDENDS'].length - 1;
			triggerValue = gMetrics[gMainSym]['DIVIDENDS'][lastElem] / gMetrics[gMainSym]['CURRENT_PRICE'] * 100 * 1.1;
			break;
		default:
			triggerValue = gMetrics[gMainSym]['CURRENT_PRICE'] * .9;
			break;
	}

	$('#alert-dialog input[name=triggerValue]').val((triggerValue).toFixed(2));
}


function formatTooltip(thisChart, config) {
	var arr = thisChart.series.name.split(' ');
	var sym = arr[0], valTypeAbbrevName = arr[1];

	var displayMeta = (sym == gMainSym) ? config['main_sym_display_meta'] : config['minor_sym_display_meta'];
	var	dateItem = displayMeta.firstYear + thisChart.point.x;
	var mainItem = '<span style="color:' + thisChart.series.color + '">' + thisChart.series.name + '</span>: <b>' + thisChart.point.y + '</b><br/>';

	var addtItems = prefix = '';

	var metric = METRIC_TYPES[gParams.getParameter('metric_type_index')];
	var valMetricWithoutPrice = VAL_TYPES[gParams.getParameter('val_type_index')].substring(3); // strip off '_P_'
	var currencyLabel = (gMetrics[sym]['CURRENCY'] != 'USD') ? ' USD' : '';
	if (thisChart.point.partialFormat == undefined && thisChart.point.estIndex == undefined) {
		var fyeDateItem = 'FYE: ' + MONTH_NAMES[gMetrics[sym]['LAST_REPORTED_FY'].m - 1] + ' ' + dateItem;
		if (!hasEstimates(sym, metric) && dateItem == gMetrics[sym]['LAST_REPORTED_FY'].y + 1) {
			switch (metric) {
				case 'DEBT_TO_EQUITY_RATIO': case 'SHARES':
					prefix = 'MRQ';
					break;
				case 'DIVIDENDS': case 'DIVIDENDS_PP':
					prefix = 'FAR';    // forward annual rate                                                                                                                                                            \
					break;
				default:
					prefix = 'TTM';
					break;
			}
			dateItem = fyeDateItem;
		}

		if (thisChart.series.type == 'spline') {  // price based series
			var rowIndex = thisChart.point.x + MAX_YEAR - gParams.getParameter('duration');
			mainItem += '<span style="color:' + thisChart.series.color + '">Range</span>: <b>'
				+ (gMetrics[sym]['YEARLY_PRICE'].min[rowIndex] / gMetrics[sym][valMetricWithoutPrice][rowIndex]).toFixed(2) + ' - '
				+ (gMetrics[sym]['YEARLY_PRICE'].max[rowIndex] / gMetrics[sym][valMetricWithoutPrice][rowIndex]).toFixed(2);
 			addtItems = '<br/>' + Array(16).join('-');
			// show stock price in currency USD if the symbol is an adr (with foreign currency valuation data)
			var priceLabel = (prefix == '') ? 'Avg Price' + currencyLabel + ': ' : 'Current Price' + currencyLabel + ': ';
			addtItems += '<br />' + priceLabel + gMetrics[sym]['YEARLY_PRICE'].avg[rowIndex];
			addtItems += '<br />Range: ' + gMetrics[sym]['YEARLY_PRICE'].min[rowIndex] + ' - ' + gMetrics[sym]['YEARLY_PRICE'].max[rowIndex];
		}
	} else {
		dateItem = 'FYE: ' + MONTH_NAMES[gMetrics[sym]['FYE'].fye.m - 1] + ' ' + dateItem;;
		if (thisChart.series.type == 'spline') {  // price based series
			var rowIndex = thisChart.point.estIndex + MAX_YEAR - gParams.getParameter('duration');
			mainItem += '<span style="color:' + thisChart.series.color + '">Range</span>: <b>'
				+ (gMetrics[sym]['YEARLY_PRICE'].min[rowIndex] / gMetrics[sym][valMetricWithoutPrice][rowIndex]).toFixed(2) + ' - '
				+ (gMetrics[sym]['YEARLY_PRICE'].max[rowIndex] / gMetrics[sym][valMetricWithoutPrice][rowIndex]).toFixed(2);
			addtItems = '<br/>' + Array(16).join('-');
			addtItems += '<br />' + 'Current Price' + currencyLabel + ': ' + gMetrics[sym]['CURRENT_PRICE'];
			addtItems += '<br />' + 'Range: ' + gMetrics[sym]['YEARLY_PRICE'].min[rowIndex] + ' - ' + gMetrics[sym]['YEARLY_PRICE'].max[rowIndex];
			addtItems += '<br />' + 'Prev Yr ' + valTypeAbbrevName + ' Price: '
												+ getAvgMultiplePrice(sym, gParams.getParameter('val_type_index'), rowIndex, 1);
			//addtItems += '<br />' + '3 Yr Avg ' + valTypeAbbrevName + ' Price: ' +  getAvgMultiplePrice(sym, gParams['val_type_index'], rowIndex, 3);
			prefix = 'Fwd ';
		} else {
			prefix = (thisChart.point.estIndex) ? 'Est ' : '';
			if ((metric == 'EARNINGS_PS' || metric == 'REVENUE_PS') && dateItem.split(' ').slice(-1) == gMetrics[sym]['FYE'].fye.y) {
				var qData = (metric == 'EARNINGS_PS') ? gMetrics[sym]['FYE'].eps_q : gMetrics[sym]['FYE'].rps_q;
				if (qData == undefined || qData.length == 0) {
					addtItems = '';
				} else {
					addtItems = '<br/>' + Array(16).join('-');
					for (var i = 0; i < 4; i++) {
						if (qData[i] != null) {
							if (prefix == 'Est ' && typeof qData[i] == 'string' || prefix == '' && typeof qData[i] == 'number') {
								addtItems += '<br/>Q' + (i + 1) + ': ' + qData[i];
							}
						}
					}
				}
			}
		}
	}
	return dateItem + '<br/>' + prefix + ' ' + mainItem + addtItems;
}


function getAvgMultiplePrice(symbol, valTypeIndex, rowIndex, numYears)  {
	var total = 0;
	var thisYearMetric = gMetrics[symbol][METRIC_TYPES[valTypeIndex]][rowIndex];
	var valType = '_P_' + METRIC_TYPES[valTypeIndex];

	for (var i = 0; i < numYears; i++) {
		total += gMetrics[symbol][valType][rowIndex - i - 1];
	}

	return Math.round((total / numYears) * thisYearMetric * 100) / 100;
}


function rotateMetric(type, isInverse) {
	var direction = (isInverse) ? -1 : 1;

	if (type == 0) {  //metric type
		gParams.rotateMetricType(direction);
		gDisplayParam['big_chart_series_visibility'][0] = gDisplayParam['big_chart_series_visibility'][1] = true;
		$('#config-menu select#metric_type_index').val(gParams.getParameter('metric_type_index')).prop('selected', true);
	} else {  //valuation type
		gParams.rotateValType(direction);
		gDisplayParam['big_chart_series_visibility'][2] = gDisplayParam['big_chart_series_visibility'][3] = true;
		$('#config-menu select#val_type_index').val(gParams.getParameter('val_type_index')).prop('selected', true);
		$('#config-menu select#metric_type_index').val(gParams.getParameter('metric_type_index')).prop('selected', true);
	}

	processDownloadedData(gMainSym);
	if (compareModeOn()) {
		processDownloadedData(gMinorSym);
	}

	displayCharts(true);
	return true;
}


function rotateStocks() {
	if (compareModeOn()) {
		var temp = gMinorSym;
		gMinorSym = gMainSym;
		gMainSym = temp;
		processDownloadedData(gMainSym);
		processDownloadedData(gMinorSym);
		displayCharts(false);
	}
	return true;
}


function changeChartSettings(menuDiv) {
	var configParams = [];

	$(menuDiv + ' input.ac-input').each(function() {
		configParams[this.id] = (this.value == '') ? null : this.value;
	});


	$(menuDiv + ' select').each(function() {
		configParams[this.id] = this.value;
	});
	performValuations(configParams);
}


function displayPerformanceTable() {
	// print the perf table on the lower right corner
	var sym1 = gParams.getParameter('sym1'),
	    sym2 = gParams.getParameter('sym2');
	var htmlTable;

	var sym1Perfs = (gMetrics[sym1]['PERFORMANCE'] == undefined) ? [' ', ' ', ' ', ' '] :
		[formatDisplayNumber(gMetrics[sym1]['PERFORMANCE'].changeW), formatDisplayNumber(gMetrics[sym1]['PERFORMANCE'].changeM),
		 formatDisplayNumber(gMetrics[sym1]['PERFORMANCE'].changeQ), formatDisplayNumber(gMetrics[sym1]['PERFORMANCE'].changeY)];

	var sym2Perfs = [' ', ' ', ' ', ' '];
	if (sym2 != null) {
		sym2Perfs = (gMetrics[sym2]['PERFORMANCE'] == undefined) ? [' ', ' ', ' ', ' '] :
			[formatDisplayNumber(gMetrics[sym2]['PERFORMANCE'].changeW), formatDisplayNumber(gMetrics[sym2]['PERFORMANCE'].changeM),
			 formatDisplayNumber(gMetrics[sym2]['PERFORMANCE'].changeQ), formatDisplayNumber(gMetrics[sym2]['PERFORMANCE'].changeY)];
	} else {
		sym2 = ' ';
	}

	var	mktPerfs =
			[formatDisplayNumber(gMetrics[DEFAULT_MKT_SYM]['PERFORMANCE'].changeW), formatDisplayNumber(gMetrics[DEFAULT_MKT_SYM]['PERFORMANCE'].changeM),
			 formatDisplayNumber(gMetrics[DEFAULT_MKT_SYM]['PERFORMANCE'].changeQ), formatDisplayNumber(gMetrics[DEFAULT_MKT_SYM]['PERFORMANCE'].changeY)];

	htmlTable =
		'<table class="table table-striped table-hover" style="font-size:14px;">' +
			'<tr><th></th>' +
			'<th>' + sym1 + '</th><th>' + sym2 + '</th><th>' + DEFAULT_MKT_SYM + '</th>' +
			'<tr><td class="cellleft">Week</td><td>' + sym1Perfs[0] + '</td><td>' + sym2Perfs[0] + '</td><td>' + mktPerfs[0] + '</tr>' +
			'<tr><td class="cellleft">Month</td><td>' + sym1Perfs[1] + '</td><td>' + sym2Perfs[1] + '</td><td>' + mktPerfs[1] + '</tr>' +
			'<tr><td class="cellleft">Quarter</td><td>' + sym1Perfs[2] + '</td><td>' + sym2Perfs[2] + '</td><td>' + mktPerfs[2] + '</tr>' +
			'<tr><td class="cellleft">Year</td><td>' + sym1Perfs[3] + '</td><td>' + sym2Perfs[3] + '</td><td>' + mktPerfs[3] + '</tr>' +
		//	  '<tr><td>Next Earning Date</td><td>Oct 29</td><td>Nov 15</td></tr>' +
		'</table>';

	$('#perf_table').html(htmlTable);
	$('#perf_table th,td').css('text-align', 'right');
	$('#perf_table td.cellleft').css('text-align', 'left');
}


function getStyledData(sym, metric, displayMeta, xAxisCatLen, actual) {
	var metricDataLen = gMetrics[sym][metric].length;
	var firstReportedYear = gMetrics[sym]['LAST_REPORTED_FY'].y - MAX_YEAR + 1;
	var dataIndex = Math.max(0, displayMeta.firstYear - firstReportedYear);
	var dataRow = gMetrics[sym][metric].slice(dataIndex);

	if (hasEstimates(sym, metric)) {
		var nextEst = dataRow.pop();
		var curEst = dataRow.pop();
		if (actual != null) {
				curEst = Math.round((curEst - actual[0].y) * 100) / 100;
		}

		var len = dataRow.length;
		dataRow.push({y: curEst, color: gDisplayParam[sym]['est_color'], fillColor: '#FFFFFF', lineColor: gDisplayParam[sym]['est_color'], estIndex: len, symbol: sym});
		dataRow.push({y: nextEst, color: gDisplayParam[sym]['est_color'], fillColor: '#FFFFFF', lineColor: gDisplayParam[sym]['est_color'], estIndex: len + 1, symbol: sym});
		if (xAxisCatLen <= MAX_YEAR + 3 && xAxisCatLen > dataRow.length && xAxisCatLen > metricDataLen) {
			dataRow.unshift(null);
		}
	}
	return dataRow;
}


function getPartialYearStyledData(symbol, metric) {
	var len = gMetrics[symbol][metric].length;
	if (metric == 'EARNINGS_PS') {
		fiscalYearQ = gMetrics[symbol]['FYE'].eps_q;
	} else if (metric == 'REVENUE_PS') {
		fiscalYearQ = gMetrics[symbol]['FYE'].rps_q;
	} else {
		return null;
	}

	if (fiscalYearQ == undefined) {
		return null;
	}

	var retVal = 0;
	for (var i = 0; i < 4; i++) {
		var qData = fiscalYearQ[i];
		if (qData != null) {
			if (typeof qData == 'number') {
				retVal += qData;
			}
		}
	}
	return [{y: Math.round(retVal * 100) / 100, color: gDisplayParam[symbol]['metric_color'], partialFormat: metric}];
}


function getBigChartTitle(valTypeName, metricName) {
	var titleStr1 = (valTypeName.indexOf(metricName) >= 0) ? metricName : 'P/' + valTypeName + ' & ' + metricName;
	var titleStr2 = compareModeOn() ? ' (VS <font color="' + gDisplayParam[gMinorSym]['val_color'] + '">' + gMinorSym + '</font>)' : '';
	return '<font color="' + gDisplayParam[gMainSym]['val_color'] + '">' + gMainSym + '</font><font color="black"> - ' + titleStr1 + titleStr2 + '</font>';
}

function getChartDataRange(dataSet1, dataSet2) {
	// find min and max values in the 2 input data sets
	if (dataSet1 == null) {
		return [0, 0];  // no data to present.  no range
	}
	var max = dataSet1[0];
	var min = dataSet1[0];
	var value;

	var j = 0;
	while (j < 2) {
		var dataSet = (j == 0) ? dataSet1 : dataSet2;
		if (dataSet != null) {
			for (var i = 0; i < dataSet.length; i++) {
				if (dataSet[i] == null) {
					continue;
				}
				value = (dataSet[i] instanceof Object) ? dataSet[i].y : dataSet[i];
				if (value > max) {
					max = value;
				} else if (value < min) {
					min = value;
				}
			}
		}
		j++;
	}

	if (min == null) {
		min = 0;
	}

	if (max == null) {
		max = 0;
	}
	return [min, max];
}


function getTickInterval(min, max, numTicks) {
	var retVal = 0;
//	var NUM_TICKS = 7;

	var slots = (max - min) / numTicks;
	if (slots > 0) {
		var factor = 1;
		while (slots > 0 && slots < 1) {
			slots *= 10;
			factor *= 10;
		}
		retVal = Math.round(slots) / factor;
	}

	retVal = Math.max(retVal, 0.1); // avoid scale being too small

	return retVal;
}

// get the display names [axis display name, title display name] for either valuation type or metric
function getDisplayName(metric) {
	var axisName = '';

	if (DISPLAY_NAMES[metric]) {
		return [DISPLAY_NAMES[metric], DISPLAY_NAMES[metric].replace(/ *\([^)]*\) */g, '')];
	}

	var strs = metric.toLowerCase().split('_');
	var i = (strs[1] == 'p') ? 2 : 0; 		//remove prefix '_p_'
	for (; i < strs.length; i++) {
		if (strs[i] == 'pct') {
			axisName += '%';
		} else if (strs[i] != 'ps') {
			// suffix PS (per share)
			axisName += strs[i].charAt(0).toUpperCase() + strs[i].substring(1) + ' ';
		}
	}
	return [axisName, axisName.replace('%', '').replace(/ *\([^)]*\) */g, '')];
}

function getAbbrevName(metric) {
	var retVal = '';
	var dataStr;
	var prefix = '', postfix = '';

	if (metric.indexOf('_P_') == 0) {
		prefix = 'P/';
		dataStr = metric.substring(3).split('_');
	} else {
		dataStr = metric.split('_');
	}

	var postfix = dataStr.slice(-1)[0];
	if (postfix == 'PP' || postfix == 'PS' || postfix == 'PCT') {
		dataStr.pop();
		postfix = (prefix != '' || postfix != 'PS') ? '' : postfix;
	} else {
		postfix = '';
	}


	for (var i = 0; i < dataStr.length; i++) {
		retVal += dataStr[i].charAt(0);
	}

	return prefix + retVal + postfix;
}


function getDisplayMeta(symbol, metric, valType) {
	if (symbol == null) {
		return null;
	}

	var estLen = (gMetrics[symbol]['FYE'] != null && gMetrics[symbol]['FYE'].fye.y - gMetrics[symbol]['LAST_REPORTED_FY'].y > 1) ? 3 : 2;
	var displayMLen = gParams.getParameter('duration') + (hasEstimates(symbol, metric) ? estLen : 1);
	var displayVLen = gParams.getParameter('duration') + (hasEstimates(symbol, valType) ? estLen : 1);

	var firstDisplayYear = gMetrics[symbol]['LAST_REPORTED_FY'].y - gParams.getParameter('duration') + 1;
	return {firstYear: firstDisplayYear, vLen: displayVLen, mLen: displayMLen };
}


// gMainSym drives the x axis but gMinorSym may have 'spill over data'.  XAxis needs to be able to accommodate data beyond gMainSym range (ie, '' after ttm)
function getXAxisCat(mainSymDisplayMeta, minorSymDisplayMeta) {
	var metric = METRIC_TYPES[gParams.getParameter('metric_type_index')];
	var mainFirstYear = mainSymDisplayMeta.firstYear - 2000; // normalize to 2 digits year                                                                                                                                               \

	var mainLastYear = mainFirstYear + Math.max(mainSymDisplayMeta.mLen, mainSymDisplayMeta.vLen) - 1;
	var retVal = [];
	var y;
	for (y = mainFirstYear; y <= mainLastYear; y++) {
		(y < 10) ? retVal.push('0' + y) : retVal.push(y + '');
	}


	if (minorSymDisplayMeta != null) {
		if (minorSymDisplayMeta.firstYear < mainSymDisplayMeta.firstYear && minorSymDisplayMeta.vLen > mainSymDisplayMeta.vLen) {
			minorSymDisplayMeta.firstYear += 1;
			minorSymDisplayMeta.mLen -= 1;
		} else if (minorSymDisplayMeta.firstYear > mainSymDisplayMeta.firstYear && minorSymDisplayMeta.vLen == mainSymDisplayMeta.vLen) {
	//		retVal.push( y + '');
		}

		/*else if (minorSymDisplayMeta.firstYear > mainSymDisplayMeta.firstYear || minorSymDisplayMeta.vLen > MAX_YEAR + 2) {
			for (var i = retVal.length; i < minorSymDisplayMeta.vLen; i++) {
				retVal.push( y + ''); // fill 'spill over' data from minor sym (valType display only) with xAxis Cat ''
			}
		}*/
	}
	return retVal;
}


function initChartConfig() {
	var retVal = [];
	var valType = VAL_TYPES[gParams.getParameter('val_type_index')];
	var metric = METRIC_TYPES[gParams.getParameter('metric_type_index')];

	retVal['main_sym_display_meta'] = getDisplayMeta(gMainSym, metric, valType);
	retVal['minor_sym_display_meta'] = getDisplayMeta(gMinorSym, metric, valType);
	//retVal['xPlot_bands'] = getPlotBandsConfig(retVal['main_sym_display_meta']);

	retVal['xAxis_cat'] = getXAxisCat(retVal['main_sym_display_meta'], retVal['minor_sym_display_meta']);
	var xAxisCatLen = retVal['xAxis_cat'].length;
	retVal['main_sym_spline_data'] = (gMetrics[gMainSym]['CURRENCY'] == 'JPY') ? null : getStyledData(gMainSym, valType, retVal['main_sym_display_meta'], xAxisCatLen);
	retVal['main_sym_spline_name']	= gMainSym + ' ' + getAbbrevName(valType);
	retVal['main_sym_column_data_partial_year'] = getPartialYearStyledData(gMainSym, metric);
	var d = gParams.getParameter('duration') * 1;
	retVal['main_sym_column_data_partial_year_point_start'] = d + (gMetrics[gMainSym]['FYE'].fye.y - 2000 - retVal['xAxis_cat'][0] - d);
	retVal['main_sym_column_data'] = getStyledData(gMainSym, metric, retVal['main_sym_display_meta'], xAxisCatLen, retVal['main_sym_column_data_partial_year']);
	/* set column with all null data to all zeros to get around a highchart bug */
	var allNull = true;
	var allZero = [];
	for (var i = 0; i < retVal['main_sym_column_data'].length && allNull; i++) {
		if (retVal['main_sym_column_data'][i] != null) {
			allNull = false;
		}
		allZero.push(0);
	}
	if (allNull) {
		retVal['main_sym_column_data'] = allZero;
	}
	/* end highchart bug get around */
	retVal['main_sym_column_name']	= gMainSym + ' ' + getAbbrevName(metric);
	retVal['sym1_mini_data'] = getStyledData(gParams.getParameter('sym1'), metric + '_G', retVal['main_sym_display_meta'], xAxisCatLen);

	if (compareModeOn()) {
		retVal['minor_sym_spline_data'] = (gMetrics[gMainSym]['CURRENCY'] == 'JPY') ? null : getStyledData(gMinorSym, valType, retVal['minor_sym_display_meta'], xAxisCatLen);
		retVal['minor_sym_spline_name']	= gMinorSym + ' ' + getAbbrevName(valType);
		retVal['sym2_mini_data'] = getStyledData(gParams.getParameter('sym2'), metric + '_G', retVal['minor_sym_display_meta'], xAxisCatLen);
	} else {
		retVal['minor_sym_spline_data'] = null;
		retVal['minor_sym_spline_name']	= null;
		retVal['sym2_mini_data'] = null;
	}

	// rare case where retVal['main_sym_column_data_partial_year'] value is much greater than 'main_sym_column_data', but should consider the partial year data nevertheless
	var columnDataRange = getChartDataRange(retVal['main_sym_column_data'], retVal['main_sym_column_data_partial_year']);
	// XXX redo  yAxis scales
	retVal['primary_y_max_show'] = columnDataRange[1] + Math.round(columnDataRange[1] / 4 * 100) / 100;
	if (gParams.getParameter('metric_type_index') > 1) {   // earnings and rev have partially est fiscal year with stacked data, base needs to be zero in these cases
		retVal['primary_y_min_show'] = (columnDataRange[0] <= 0) ? columnDataRange[0] :
			Math.max(columnDataRange[0] - ((columnDataRange[1] - columnDataRange[0]) / 4), 0);
	} else {
		retVal['primary_y_min_show'] = (columnDataRange[0] < 0) ? columnDataRange[0] : 0;
	}
	if (retVal['primary_y_min_show'] == retVal['primary_y_max_show']) {
		retVal['primary_y_min_show'] = 0;
	}
	retVal['primary_tick_interval'] = getTickInterval(retVal['primary_y_min_show'], retVal['primary_y_max_show'], 6);

	var splineDataRange = getChartDataRange(retVal['main_sym_spline_data'], retVal['minor_sym_spline_data']);
	retVal['secondary_y_min_show'] = 0 - Math.round(splineDataRange[1] / 3 * 100) / 100;
	retVal['secondary_y_max_show'] = splineDataRange[1];
	retVal['secondary_tick_interval'] = getTickInterval(retVal['secondary_y_min_show'], retVal['secondary_y_max_show'], 8);


	var miniChartDataRange = getChartDataRange(retVal['sym1_mini_data'], retVal['sym2_mini_data']);
	var tickInterval = (miniChartDataRange[1] - miniChartDataRange[0]) / 7;
	retVal['mini_chart_tick_interval'] = (tickInterval > 10) ? Math.round(tickInterval) : Math.round(tickInterval * 10) / 10;

	retVal['mini_chart_step'] = Math.round((miniChartDataRange[1] - miniChartDataRange[0]) / retVal['mini_chart_tick_interval'] / 4);

	var metricName = getDisplayName(metric);
	if (metric.indexOf('_PS') > 0) {
		retVal['metric_name_yAxis'] = '\u2588\u2588 ' + metricName[0] + ' Per Share';
		retVal['mini_chart_title'] = metricName[1] + ' (PS) Growth Rate';
	} else {
		retVal['metric_name_yAxis'] = '\u2588\u2588 ' + metricName[0];
		retVal['mini_chart_title'] = metricName[1] + ' Growth Rate';
	}

	if (gMetrics[gMainSym][metric + '_CURRENCY'] != undefined && gMetrics[gMainSym][metric + '_CURRENCY'] != 'USD') {
		retVal['metric_name_yAxis'] += ' (' + gMetrics[gMainSym][metric + '_CURRENCY'] + ')';
	}
	retVal['val_type_display_name'] = getDisplayName(valType)[1];
	retVal['big_chart_title'] = getBigChartTitle(retVal['val_type_display_name'], metricName[1]);

	retVal['big_chart_height'] = (screen.height >= 768 && screen.width > 480) ? 450 : 310;
	retVal['mini_chart_height'] = (retVal['big_chart_height'] > 400) ? retVal['big_chart_height'] * .5 : 230;
//	alert('screen width=' + screen.width + '   screen height=' + screen.height );

	return retVal;
}

function getChartsSeries(config) {
	var bigSeries = [{
		name: config['main_sym_column_name'],
		yAxis: 0, stacking: 'normal',
		color: gDisplayParam[gMainSym]['metric_color'],
		data: config['main_sym_column_data'],
		visible: gDisplayParam['big_chart_series_visibility'][0]
	}, {
		name: config['main_sym_column_name'],
		yAxis: 0, stacking: 'normal',
		color: gDisplayParam[gMainSym]['metric_color'],
		pointStart: config['main_sym_column_data_partial_year_point_start'], //gParams['duration'],
		linkedTo: ':previous',
		data: config['main_sym_column_data_partial_year'],
		visible: gDisplayParam['big_chart_series_visibility'][0]
	},
	{
		type: 'spline',
		name: config['main_sym_spline_name'],
		yAxis: 1,
		color: gDisplayParam[gMainSym]['val_color'],
		data: config['main_sym_spline_data'],
		visible: gDisplayParam['big_chart_series_visibility'][2],
		marker: {
			lineWidth: 1,
			lineColor: gDisplayParam[gMainSym]['val_color']
		}
	}, {
		type: 'spline',
		name: config['minor_sym_spline_name'],
		yAxis: 1,
		color: (gMinorSym == null) ? null : gDisplayParam[gMinorSym]['val_color'],
		data: config['minor_sym_spline_data'],
		visible: gDisplayParam['big_chart_series_visibility'][3],
		marker: {
			lineWidth: 1,
			lineColor: (gMinorSym == null) ? null : gDisplayParam[gMinorSym]['val_color']
	    }
	}];

	var miniSeries = [{
		name: gParams.getParameter('sym1'),
		marker: {
			enabled: false
		},
		color: SYM1_METRIC_COLOR,
		data: config['sym1_mini_data']

	}, {
		name: gParams.getParameter('sym2'),
		marker: {
			 enabled: false
		},
		color: SYM2_METRIC_COLOR,
		data: config['sym2_mini_data']

	}];


	if (!compareModeOn()) {
		bigSeries.pop();
		miniSeries.pop();
	}

	return [bigSeries, miniSeries];
}

function toggleConfigMenu(menuDiv) {
	$(menuDiv).slideToggle();

}

function submitAlert() {
	var metric = $('#alert-dialog #metric-select').val();
	var triggerValue = $('#alert-dialog input[name="triggerValue"]').val();
	var email = $('#alert-dialog input[name="email"]').val();
	// XXX how to handle error?  just log?  timestamp entry?
	$.get('../portfolio/valuationAlert.php?metric=' + metric +
			   '&triggerValue=' + triggerValue + '&email=' + email + '&symbol=' + gMainSym);
	$('#alert-dialog').closeDialog();
}

function compareModeOn() {
	return (gMinorSym != null);
}






