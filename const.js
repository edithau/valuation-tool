var DEBUG = 1;
var MOCK_ON = 0;

// valuation types
var VAL_TYPES = ['_P_EARNINGS_PS', '_P_REVENUE_PS', '_P_BOOK_VALUE_PS', '_P_OP_CASH_FLOW_PS', '_P_FREE_CASH_FLOW_PS'];
var METRIC_TYPES = ['EARNINGS_PS', 'REVENUE_PS', 'BOOK_VALUE_PS', 'OP_CASH_FLOW_PS', 'FREE_CASH_FLOW_PS', 'GROSS_MARGIN_PCT', 'OP_MARGIN_PCT', 'OP_INCOME_PS',
					'NET_INCOME_PS', 'RETURN_ON_ASSETS_PCT', 'RETURN_ON_EQUITY_PCT', 'RETURN_ON_INVESTED_CAPITAL_PCT',
					'DEBT_TO_EQUITY_RATIO', 'SHARES', 'PAYOUT_RATIO_PCT', 'DIVIDENDS', 'DIVIDENDS_PP'];

// default parameter configs
var DEFAULT_SYM1 = 'GOOGL';
var DEFAULT_SYM2 = null; //'GE';
var DEFAULT_MKT_SYM = 'SPY';
var DEFAULT_VAL_TYPE = VAL_TYPES[0];
var DEFAULT_METRIC = METRIC_TYPES[0];
var SYMBOL_MAX_LENGTH = 8; // max char for a stock symbol;
var MOBILE_DEFAULT_DURATION = 4;
var SYMBOL_MAX_LENGTH = 8; // max char for a stock symbol;

var MAX_YEAR = 10;
var TODAY = new Date();


// valuation data indices (ie. to locate metrics)
var FISCAL_YEAR = 2;
var REVENUE = 3;
var GROSS_MARGIN_PCT = 4;
var OP_INCOME = 5;
var OP_MARGIN_PCT = 6;
var NET_INCOME = 7;
var EARNINGS_PS = 8;
var DIVIDENDS = 9;
var PAYOUT_RATIO_PCT = 10;
var SHARES = 11;
var BOOK_VALUE_PS = 12;
var OP_CASH_FLOW = 13;  // raw data is not per share, need to do the math
var FREE_CASH_FLOW = 15;
var FREE_CASH_FLOW_PS = 16;
var EARNINGS_PS_G = 59;
var RETURN_ON_ASSETS_PCT = 35;
var RETURN_ON_EQUITY_PCT = 37;
var RETURN_ON_INVESTED_CAPITAL_PCT = 38;
var DEBT_TO_EQUITY_RATIO = 99;


// estimate data indicies
var EARNINGS_PS_EST = 1; // est earnings for current q, next q, this year, next y
var EARNINGS_PS_YEAR_AGO = 21;
var REVENUE_EST = 26;
var REVENUE_YEAR_AGO = 46;
var EARNINGS_PS_Q_HIST = 61; // ACTUAL earnings of the past 4 qtr


// error levels
var ERROR = 'Error';
var WARNING = 'Warning';
