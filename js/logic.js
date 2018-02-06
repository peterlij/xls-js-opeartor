var CURRENCY = {};

function initControlListeners() {
  $('#form').validator({
      custom: {
        equals: function($el) {
          var matchValue = $el.data("equals") // foo
          if ($el.val() !== matchValue) {
            return "Hey, that's not valid! It's gotta be " + matchValue
          }
        }
      }
  });
  
  $('#portOfLoading').blur(getCurrencyUpdater('orig', 'portOfLoading', 'oCurrLabel', 'oCurrValue'));
  $('#portOfDischarge').blur(getCurrencyUpdater('dest', 'portOfDischarge', 'dCurrLabel', 'dCurrValue'));
  
  $('#portOfLoading').keyup(getCurrencyUpdater('orig', 'portOfLoading', 'oCurrLabel', 'oCurrValue'));
  $('#portOfDischarge').keyup(getCurrencyUpdater('dest', 'portOfDischarge', 'dCurrLabel', 'dCurrValue'));
}

function getCurrencyUpdater(portCategory, portId, currencyLabelId, currencyValueId) {
  return function() {
    var port = $('#' + portId).val();
    var formatedPort = tostr(port);
    laneInfo = null;
    var portAttr = (portCategory == 'orig' ? 'loadPort' : 'dischargePort');
    for (var i = 0; i < lanes.length; i++) {
      if (formatedPort == lanes[i].lane[portAttr]) {
        laneInfo = lanes[i];
        break;
      }
    }
    
    if (laneInfo == null) {
      $('#' + currencyLabelId).html('? ');
      $('#' + currencyValueId).val('');
      return;
    }
     
    var currUpper = laneInfo[portCategory].currency.toUpperCase();
    if (CURRENCY[currUpper]) {
       fx.base = currUpper;
       fx.rates = CURRENCY[currUpper];
       updateCurrency(currUpper);
         
       $('#' + currencyLabelId).html('1 ' + currUpper + ' is ');
       $('#' + currencyValueId).val(fx(1).from(fx.base).to("USD"));
    } else {
      $.get('https://api.fixer.io/latest?base=' + currUpper)
       .done(function(data) {
         fx.base = currUpper;
         fx.rates = data.rates;
         CURRENCY[fx.base] = fx.rates;
         updateCurrency(currUpper);
       });
    }
  };
  
  function updateCurrency(currUpper) {
    $('#' + currencyLabelId).html('1 ' + currUpper + ' is ');
    $('#' + currencyValueId).val(fx(1).from(fx.base).to("USD"));
  }
}

function handleSubmit() {
  $('#form').validator().on('submit', function (e) {
    if (!e.isDefaultPrevented()) {
      e.preventDefault();
      calculate();
    }
    return false;
  });
}

function calculate() {
  var loadPort = $('#portOfLoading').val();
  var dischargePort = $('#portOfDischarge').val();
  
  var formatedLoadPort = tostr(loadPort);
  var formatedDischargePort = tostr(dischargePort);
  
  var num20Gp = $('#numOf20GP').val();
  num20Gp = (num20Gp == '' ? 0 : parseInt(num20Gp));
  var num40Gp = $('#numOf40GP').val();
  num40Gp = (num40Gp == '' ? 0 : parseInt(num40Gp));
  var num40Hq = $('#numOf40HQ').val();
  num40Hq = (num40Hq == '' ? 0 : parseInt(num40Hq));
  
  var origCurrency = $('#oCurrValue').val();
  origCurrency = (origCurrency == '' ? 0 : parseFloat(origCurrency));
  var destCurrency = $('#dCurrValue').val();
  destCurrency = (destCurrency == '' ? 0 : parseFloat(destCurrency));
  
  if (origCurrency == 0) {
    document.getElementById('result').innerHTML = "Please enter currency from " + loadPort + " to Dollars";
  }
  
  if (destCurrency == 0) {
    document.getElementById('result').innerHTML = "Please enter currency from " + dischargePort + " to Dollars";
  }
  if (origCurrency == 0 && destCurrency == 0) {
    return;
  }
    
  var matchedLanes = {size: 0};
  for (var i = 0; i < lanes.length; i++) {
    var laneInfo = lanes[i];
    if (formatedLoadPort == laneInfo.lane.loadPort && formatedDischargePort == laneInfo.lane.dischargePort) {
      matchedLanes.size++;
      matchedLanes[laneInfo.lane.contType] = laneInfo;
      matchedLanes.ohc = laneInfo.orig.hc;
      matchedLanes.oecc = laneInfo.orig.ecc;
      matchedLanes.dhc = laneInfo.dest.hc;
      matchedLanes.dicc = laneInfo.dest.icc;
    }
  }
  
  if (matchedLanes.size == 0) {
    document.getElementById('result').innerHTML = ("No Rate for lane from " + loadPort + " to " + dischargePort);
    return ;
  }
  
  var cost = 0;
  var msg = '';
  var containers = [{key: '20gp', num: num20Gp}, {key: '40gp', num: num40Gp}, {key: '40hq', num: num40Hq}];
  for (var i = 0; i < containers.length; i++) {
    var container = containers[i];
    var costForContainer = calculateCost(container, matchedLanes[container.key], origCurrency, destCurrency);
    if (isNaN(parseFloat(costForContainer))) {
      msg += (costForContainer + '<br/>');
    } else {
      cost += costForContainer;
    }
  }
  
  var eccRequired = $('#eccRequired').get(0).checked;
  var iccRequried = $('#iccRequired').get(0).checked;
  var result = '';
  if (msg == '') {
    if (num20Gp > 0 || num40Gp > 0 || num40Hq > 0) {
      var origOneTimeFee = matchedLanes.ohc;
      if (eccRequired) {
        origOneTimeFee += matchedLanes.oecc;
      }
      var destOneTimeFee = matchedLanes.dhc;
      if (iccRequried) {
        destOneTimeFee += matchedLanes.dicc;
      }
      
      cost = (cost + origOneTimeFee * origCurrency);
      cost = (cost + destOneTimeFee * destCurrency);
    }
    result = (cost.toFixed(2) + ' $');
  } else {
    result = msg;
  }
  
  document.getElementById('result').innerHTML = result;
}

function calculateCost(container, lane20Gp, origCurrency, destCurrency) {
  var cost20Gp = 0;
  if (!container.num) {
    return cost20Gp;
  }
  if (lane20Gp == null) {
    return 'No Lane for ' + container.key; 
  }
  
  var calculateMsg = '';
  var originCost = calculateOriginCost(container, lane20Gp, origCurrency);
  if (isNaN(parseFloat(originCost))) {
    calculateMsg += (originCost + '<br/>');
  } else {
    cost20Gp += originCost;
  }
  
  var destCost = calculateDestinationCost(container, lane20Gp, destCurrency);
  if (isNaN(parseFloat(destCost))) {
    calculateMsg += (destCost + '<br/>');
  } else {
    cost20Gp += destCost;
  }
  
  var oceanCost = calculateOceanCost(container, lane20Gp);
  cost20Gp += oceanCost;
  return calculateMsg == '' ? cost20Gp : calculateMsg;
}

function calculateOceanCost(container, lane20Gp) {
  return (lane20Gp.ocean.freignt + lane20Gp.ocean.vgm) * container.num;
}

function calculateOriginCost(container, lane20Gp, origCurrency) {
  var oc = $('#originCity').val();

  var otRequried = $('#otRequired').get(0).checked;
  var oc2PortKM = $('#distanctFromOCity2Loading').val();
  if (otRequried && oc2PortKM > 100 && oc != lane20Gp.lane.oc) {
    return 'No origin trucking rate for ' + container.key;
  }
  
  var costOrigin = 0;
  costOrigin += lane20Gp.orig.thc;
  if (otRequried) {
    if (oc2PortKM <= 50) {
      costOrigin += lane20Gp.orig.tZone1;
    } else if (oc2PortKM <= 100) {
      costOrigin += lane20Gp.orig.tZone2;
    } else {
      costOrigin += lane20Gp.orig.t;
    }
  }
  return  costOrigin * container.num * origCurrency;
}

function calculateDestinationCost(container, lane20Gp, destCurrency) {
  var dc = $('#destinationCity').val();
  var dtRequried = $('#dtRequired').get(0).checked;
  var dc2PortKM = $('#distanctFromDischarge2DCity').val();
  if (dtRequried && dc2PortKM > 100 && dc != lane20Gp.lane.dc) {
    return 'No destination trucking rate for ' + container.key;
  }
  
  var costDestination = 0;
  costDestination += lane20Gp.dest.thc;
  if (dtRequried) {
    if (dc2PortKM <= 50) {
      costDestination += lane20Gp.dest.tZone1;
    } else if (dc2PortKM <= 100) {
      costDestination += lane20Gp.dest.tZone2;
    } else {
      costDestination += lane20Gp.dest.t;
    }
  }
  return  costDestination * container.num * destCurrency;
} 